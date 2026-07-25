import { db } from '@/lib/db'
import { orderItems, transactions, auditLogs, orders, resources, ingredients, products, stockMovements, chartOfAccounts, journalEntries, journalEntryLines } from '@/lib/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { fromCents, toCents } from '@/lib/currency'
import type { RefundableOrder } from '../_types'
import { isRefundableOrder } from './payment'

export async function voidOrderItem(itemId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(orderItems).where(eq(orderItems.id, itemId)).for('update')

    if (!item || item.voidedAt) throw new Error('ITEM_NOT_FOUND')
    const [order] = await tx.select().from(orders).where(eq(orders.id, item.orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')

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
    await tx.update(orders)
      .set({
        subtotal: fromCents(newSubtotal),
        totalAmount: fromCents(newSubtotal + toCents(order.timerChargeAmount ?? '0')),
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

export async function voidOrder(orderId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    await tx.update(orderItems).set({ voidedAt: new Date(), voidedBy: userId, voidReason: reason })
      .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)))
    await tx.update(orders).set({ status: 'cancelled', closedAt: new Date(), timerEndedAt: order.timerEndedAt ?? new Date() })
      .where(eq(orders.id, orderId))
    if (order.resourceId) await tx.update(resources).set({ status: 'available' }).where(eq(resources.id, order.resourceId))
    await tx.insert(auditLogs).values({
      userId, action: 'VOID_ORDER', targetTable: 'orders', targetId: orderId,
      oldValue: { status: order.status }, newValue: { status: 'cancelled', reason },
    })
  })
}

export async function refundOrder(orderId: string, userId: string, reason: string, refundShiftId: string) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || !isRefundableOrder(order.status, true)) throw new Error('ORDER_NOT_REFUNDABLE')
    const orderTransactions = await tx.select().from(transactions).where(eq(transactions.orderId, orderId))
    if (orderTransactions.some(transaction => transaction.isRefund)) throw new Error('ORDER_ALREADY_REFUNDED')
    const payments = orderTransactions.filter(transaction => !transaction.isRefund)
    if (!payments.length) throw new Error('PAYMENT_NOT_FOUND')

    await tx.insert(transactions).values(payments.map(payment => ({
      orderId,
      shiftId: refundShiftId,
      paymentMethod: payment.paymentMethod,
      amount: payment.amount,
      isRefund: true,
      refundReason: reason,
      refundedBy: userId,
      reference: `REFUND:${payment.id}`,
    })))

    const deductions = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.type, 'sale_deduction')))
    for (const movement of deductions) {
      const quantity = -Number(movement.quantity)
      if (movement.ingredientId) {
        const [ingredient] = await tx.select().from(ingredients).where(eq(ingredients.id, movement.ingredientId)).for('update')
        if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')
        await tx.update(ingredients).set({ stockQty: String(Number(ingredient.stockQty) + quantity) }).where(eq(ingredients.id, ingredient.id))
      } else if (movement.productId) {
        const [product] = await tx.select().from(products).where(eq(products.id, movement.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        await tx.update(products).set({ stockQty: String(Number(product.stockQty ?? '0') + quantity) }).where(eq(products.id, product.id))
      } else {
        continue
      }
      await tx.insert(stockMovements).values({
        ingredientId: movement.ingredientId, productId: movement.productId, orderId,
        type: 'adjustment', quantity: String(quantity), note: `Refund: ${reason}`, createdBy: userId,
      })
    }

    const [cash] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1001')).limit(1)
    const [sales] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '4001')).limit(1)
    if (!cash || !sales) throw new Error('ACCOUNTING_NOT_CONFIGURED')
    const [journal] = await tx.insert(journalEntries).values({
      reference: `REFUND-${order.id.slice(0, 8)}`, description: `POS refund: ${reason}`,
      sourceType: 'refund', sourceId: order.id, createdBy: userId,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: sales.id, type: 'debit', amount: order.totalAmount },
      { journalEntryId: journal.id, accountId: cash.id, type: 'credit', amount: order.totalAmount },
    ])
    await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId))

    await tx.insert(auditLogs).values({
      userId,
      action: 'REFUND_ORDER',
      targetTable: 'orders',
      targetId: orderId,
      oldValue: { status: 'closed' },
      newValue: { status: 'cancelled', reason },
    })
  })
}

export async function getRefundableOrders(limit = 10): Promise<RefundableOrder[]> {
  const rows = await db.query.orders.findMany({
    where: eq(orders.status, 'closed'),
    orderBy: [desc(orders.closedAt)],
    limit,
    with: { transactions: true },
  })
  return rows.map(order => ({
    id: order.id,
    totalAmount: order.totalAmount,
    closedAt: order.closedAt,
    payments: order.transactions.some(payment => payment.isRefund) ? [] : order.transactions.map(payment => ({
      id: payment.id,
      paymentMethod: payment.paymentMethod as RefundableOrder['payments'][number]['paymentMethod'],
      amount: payment.amount,
    })),
  })).filter(order => order.payments.length > 0)
}
