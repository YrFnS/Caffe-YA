import { db } from '@/lib/db'
import {
  auditLogs,
  chartOfAccounts,
  ingredients,
  journalEntries,
  journalEntryLines,
  orders,
  orderItems,
  products,
  resources,
  stockMovements,
  transactions,
} from '@/lib/schema'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { fromCents, toCents } from '@/lib/currency'
import { getPaymentAccountCode } from '@/lib/accounting'
import type { RefundableOrder } from '../_types'
import { isRefundableOrder } from './payment'

export async function voidOrderItem(itemId: string, userId: string, reason: string) {
  return db.transaction(async tx => {
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

    const activeItems = remainingItems.filter(row => !row.voidedAt)
    const newSubtotal = activeItems.reduce((sum, row) => sum + toCents(row.totalPrice), 0)
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
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    await tx.update(orderItems).set({ voidedAt: new Date(), voidedBy: userId, voidReason: reason })
      .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)))
    await tx.update(orders).set({ status: 'cancelled', closedAt: new Date(), timerEndedAt: order.timerEndedAt ?? new Date() })
      .where(eq(orders.id, orderId))
    if (order.resourceId) await tx.update(resources).set({ status: 'available' }).where(eq(resources.id, order.resourceId))
    await tx.insert(auditLogs).values({
      userId,
      action: 'VOID_ORDER',
      targetTable: 'orders',
      targetId: orderId,
      oldValue: { status: order.status },
      newValue: { status: 'cancelled', reason },
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
      const restoredQuantity = -toCents(movement.quantity)
      if (restoredQuantity <= 0) continue

      if (movement.ingredientId) {
        const [ingredient] = await tx.select().from(ingredients)
          .where(eq(ingredients.id, movement.ingredientId)).for('update')
        if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')
        await tx.update(ingredients).set({
          stockQty: fromCents(toCents(ingredient.stockQty) + restoredQuantity),
        }).where(eq(ingredients.id, ingredient.id))
      } else if (movement.productId) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, movement.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        await tx.update(products).set({
          stockQty: fromCents(toCents(product.stockQty ?? '0') + restoredQuantity),
        }).where(eq(products.id, product.id))
      } else {
        continue
      }

      await tx.insert(stockMovements).values({
        ingredientId: movement.ingredientId,
        productId: movement.productId,
        orderId,
        type: 'adjustment',
        quantity: fromCents(restoredQuantity),
        note: `Refund: ${reason}`,
        createdBy: userId,
      })
    }

    const originalCostLines = await tx.select({ amount: journalEntryLines.amount })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(journalEntries.sourceType, 'order'),
        eq(journalEntries.sourceId, orderId),
        eq(chartOfAccounts.code, '5001'),
        eq(journalEntryLines.type, 'debit'),
      ))
    const costOfGoods = originalCostLines.reduce((sum, line) => sum + toCents(line.amount), 0)

    const paymentTotals = new Map<string, number>()
    for (const payment of payments) {
      const accountCode = getPaymentAccountCode(payment.paymentMethod)
      paymentTotals.set(accountCode, (paymentTotals.get(accountCode) ?? 0) + toCents(payment.amount))
    }

    const requiredAccountCodes = [
      ...paymentTotals.keys(),
      '4001',
      ...(costOfGoods > 0 ? ['1201', '5001'] : []),
    ]
    const accounts = await tx.select().from(chartOfAccounts)
      .where(inArray(chartOfAccounts.code, requiredAccountCodes))
    const accountsByCode = new Map(accounts.map(account => [account.code, account]))
    if (requiredAccountCodes.some(code => !accountsByCode.has(code))) {
      throw new Error('ACCOUNTING_NOT_CONFIGURED')
    }

    const [journal] = await tx.insert(journalEntries).values({
      reference: `REFUND-${order.id.slice(0, 8)}`,
      description: `POS refund: ${reason}`,
      sourceType: 'refund',
      sourceId: order.id,
      createdBy: userId,
    }).returning()

    const journalLines: Array<typeof journalEntryLines.$inferInsert> = [
      {
        journalEntryId: journal.id,
        accountId: accountsByCode.get('4001')!.id,
        type: 'debit',
        amount: order.totalAmount,
      },
      ...[...paymentTotals.keys()].map(code => ({
        journalEntryId: journal.id,
        accountId: accountsByCode.get(code)!.id,
        type: 'credit' as const,
        amount: fromCents(paymentTotals.get(code)!),
      })),
    ]
    if (costOfGoods > 0) {
      journalLines.push(
        {
          journalEntryId: journal.id,
          accountId: accountsByCode.get('1201')!.id,
          type: 'debit',
          amount: fromCents(costOfGoods),
        },
        {
          journalEntryId: journal.id,
          accountId: accountsByCode.get('5001')!.id,
          type: 'credit',
          amount: fromCents(costOfGoods),
        },
      )
    }
    await tx.insert(journalEntryLines).values(journalLines)

    await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId))

    await tx.insert(auditLogs).values({
      userId,
      action: 'REFUND_ORDER',
      targetTable: 'orders',
      targetId: orderId,
      oldValue: { status: 'closed' },
      newValue: {
        status: 'cancelled',
        reason,
        costOfGoodsReversed: fromCents(costOfGoods),
        paymentAccounts: Object.fromEntries(
          [...paymentTotals.keys()].map(code => [code, fromCents(paymentTotals.get(code)!)]),
        ),
      },
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
