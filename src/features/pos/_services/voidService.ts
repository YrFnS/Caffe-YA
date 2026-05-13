import { db } from '@/lib/db'
import { orderItems, transactions, auditLogs, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'

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
    const newSubtotal = activeItems.reduce((sum, i) => sum + Number(i.totalPrice), 0)

    await tx.update(orders)
      .set({ subtotal: String(newSubtotal) })
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
    const txRecord = await tx.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    })

    if (!txRecord) throw new Error('TRANSACTION_NOT_FOUND')

    await tx.insert(transactions).values({
      orderId: txRecord.orderId,
      shiftId: txRecord.shiftId,
      paymentMethod: txRecord.paymentMethod,
      amount: txRecord.amount,
      isRefund: true,
      refundReason: reason,
      refundedBy: userId,
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