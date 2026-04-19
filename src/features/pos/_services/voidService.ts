import { db } from '@/lib/db'
import { orderItems, transactions, auditLogs, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function voidOrderItem(itemId: string, userId: string, reason: string) {
  const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) })
  if (!item) throw new Error('ITEM_NOT_FOUND')

  await db.update(orderItems)
    .set({
      voidedAt: new Date(),
      voidedBy: userId,
      voidReason: reason,
    })
    .where(eq(orderItems.id, itemId))

  const remainingItems = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, item.orderId),
  })

  const activeItems = remainingItems.filter(i => !i.voidedAt)
  const newSubtotal = activeItems.reduce((sum, i) => sum + Number(i.totalPrice), 0)

  await db.update(orders)
    .set({ subtotal: newSubtotal.toFixed(3) })
    .where(eq(orders.id, item.orderId))

  await db.insert(auditLogs).values({
    userId,
    action: 'VOID_ITEM',
    targetTable: 'order_items',
    targetId: itemId,
    oldValue: { status: 'active' },
    newValue: { status: 'voided', reason },
  })
}

export async function refundTransaction(transactionId: string, userId: string, reason: string) {
  const txRecord = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  })
  if (!txRecord) throw new Error('TRANSACTION_NOT_FOUND')

  await db.insert(transactions).values({
    orderId: txRecord.orderId,
    shiftId: txRecord.shiftId,
    paymentMethod: txRecord.paymentMethod,
    amount: txRecord.amount,
    isRefund: true,
    refundReason: reason,
    refundedBy: userId,
  })

  await db.insert(auditLogs).values({
    userId,
    action: 'REFUND',
    targetTable: 'transactions',
    targetId: transactionId,
    oldValue: { isRefund: false },
    newValue: { isRefund: true, reason },
  })
}