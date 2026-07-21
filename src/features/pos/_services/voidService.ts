import { db } from '@/lib/db'
import { orderItems, transactions, auditLogs, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { fromCents, toCents } from '@/lib/currency'

export async function voidOrderItem(itemId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const item = await tx.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
    })

    if (!item) throw new Error('ITEM_NOT_FOUND')

    await tx.update(orderItems)
      .set({
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason,
      })
      .where(eq(orderItems.id, itemId))

    const remainingItems = await tx.select()
      .from(orderItems)
      .where(eq(orderItems.orderId, item.orderId))

    const activeItems = remainingItems.filter(i => !i.voidedAt)
    const newSubtotal = activeItems.reduce((sum, item) => sum + toCents(item.totalPrice), 0)
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, item.orderId) })

    await tx.update(orders)
      .set({
        subtotal: fromCents(newSubtotal),
        totalAmount: fromCents(newSubtotal + toCents(order?.timerChargeAmount ?? '0')),
      })
      .where(eq(orders.id, item.orderId))

    await tx.insert(auditLogs).values({
      userId,
      action: 'VOID_ITEM',
      targetTable: 'order_items',
      targetId: itemId,
      oldValue: { status: 'active' },
      newValue: { status: 'voided', reason },
    })
  })
}

export async function refundTransaction(transactionId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [txRecord] = await tx.select().from(transactions)
      .where(eq(transactions.id, transactionId)).for('update')

    if (!txRecord) throw new Error('TRANSACTION_NOT_FOUND')
    if (txRecord.isRefund) throw new Error('REFUND_NOT_REFUNDABLE')
    const existingRefund = await tx.query.transactions.findFirst({
      where: eq(transactions.reference, `REFUND:${transactionId}`),
    })
    if (existingRefund) throw new Error('ALREADY_REFUNDED')

    await tx.insert(transactions).values({
      orderId: txRecord.orderId,
      shiftId: txRecord.shiftId,
      paymentMethod: txRecord.paymentMethod,
      amount: txRecord.amount,
      isRefund: true,
      refundReason: reason,
      refundedBy: userId,
      reference: `REFUND:${transactionId}`,
    })

    await tx.insert(auditLogs).values({
      userId,
      action: 'REFUND',
      targetTable: 'transactions',
      targetId: transactionId,
      oldValue: { isRefund: false },
      newValue: { isRefund: true, reason },
    })
  })
}
