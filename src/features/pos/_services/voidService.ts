import { db } from '../../../lib/db.ts'
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
} from '../../../lib/schema.ts'
import { productInventoryCosts, stockMovementCosts } from '../../../lib/valuationSchema.ts'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { fromCents, toCents, weightedAverageUnitCost } from '../../../lib/currency.ts'
import { getPaymentAccountCode } from '../../../lib/accounting.ts'
import type { RefundableOrder } from '../_types.ts'
import { isRefundableOrder } from './payment.ts'

export async function voidOrderItem(itemId: string, userId: string, reason: string) {
  return db.transaction(async tx => {
    const [item] = await tx.select().from(orderItems).where(eq(orderItems.id, itemId)).for('update')
    if (!item || item.voidedAt) throw new Error('ITEM_NOT_FOUND')

    const [order] = await tx.select().from(orders).where(eq(orders.id, item.orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) {
      throw new Error('ORDER_NOT_OPEN')
    }

    await tx.update(orderItems).set({
      voidedAt: new Date(),
      voidedBy: userId,
      voidReason: reason,
    }).where(eq(orderItems.id, itemId))

    const remainingItems = await tx.select().from(orderItems)
      .where(eq(orderItems.orderId, item.orderId))
    const activeItems = remainingItems.filter(row => !row.voidedAt)
    const newSubtotal = activeItems.reduce((sum, row) => sum + toCents(row.totalPrice), 0)
    await tx.update(orders).set({
      subtotal: fromCents(newSubtotal),
      totalAmount: fromCents(newSubtotal + toCents(order.timerChargeAmount ?? '0')),
    }).where(eq(orders.id, item.orderId))

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
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) {
      throw new Error('ORDER_NOT_OPEN')
    }

    await tx.update(orderItems).set({
      voidedAt: new Date(),
      voidedBy: userId,
      voidReason: reason,
    }).where(and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)))
    await tx.update(orders).set({
      status: 'cancelled',
      closedAt: new Date(),
      timerEndedAt: order.timerEndedAt ?? new Date(),
    }).where(eq(orders.id, orderId))
    if (order.resourceId) {
      await tx.update(resources).set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }
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

    const orderTransactions = await tx.select().from(transactions)
      .where(eq(transactions.orderId, orderId))
    if (orderTransactions.some(transaction => transaction.isRefund)) {
      throw new Error('ORDER_ALREADY_REFUNDED')
    }
    const payments = orderTransactions.filter(transaction => !transaction.isRefund)
    if (!payments.length) throw new Error('PAYMENT_NOT_FOUND')

    const deductions = await tx.select({
      movementId: stockMovements.id,
      ingredientId: stockMovements.ingredientId,
      productId: stockMovements.productId,
      quantity: stockMovements.quantity,
      unitCost: stockMovementCosts.unitCost,
      totalCost: stockMovementCosts.totalCost,
    }).from(stockMovements)
      .leftJoin(stockMovementCosts, eq(stockMovementCosts.movementId, stockMovements.id))
      .where(and(
        eq(stockMovements.orderId, orderId),
        eq(stockMovements.type, 'sale_deduction'),
      ))

    if (deductions.some(movement => movement.unitCost === null || movement.totalCost === null)) {
      throw new Error('COST_HISTORY_MISSING')
    }
    const movementCost = deductions.reduce(
      (sum, movement) => sum + toCents(movement.totalCost!),
      0,
    )

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
    const journalCost = originalCostLines.reduce((sum, line) => sum + toCents(line.amount), 0)
    if (journalCost !== movementCost) throw new Error('COST_HISTORY_MISMATCH')

    for (const movement of deductions) {
      const restoredQuantity = -toCents(movement.quantity)
      if (restoredQuantity <= 0) continue
      const restoredQuantityValue = fromCents(restoredQuantity)
      const restoredUnitCost = movement.unitCost!

      if (movement.ingredientId) {
        const [ingredient] = await tx.select().from(ingredients)
          .where(eq(ingredients.id, movement.ingredientId))
          .for('update')
        if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')

        await tx.update(ingredients).set({
          stockQty: fromCents(toCents(ingredient.stockQty) + restoredQuantity),
          costPerUnit: weightedAverageUnitCost(
            ingredient.stockQty,
            ingredient.costPerUnit ?? '0',
            restoredQuantityValue,
            restoredUnitCost,
          ),
        }).where(eq(ingredients.id, ingredient.id))
      } else if (movement.productId) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, movement.productId))
          .for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        const [currentValuation] = await tx.select().from(productInventoryCosts)
          .where(eq(productInventoryCosts.productId, movement.productId))
          .for('update')
        const currentStock = product.stockQty ?? '0'
        if (toCents(currentStock) > 0 && !currentValuation) {
          throw new Error('COST_HISTORY_MISSING')
        }
        const nextUnitCost = weightedAverageUnitCost(
          currentStock,
          currentValuation?.unitCost ?? '0',
          restoredQuantityValue,
          restoredUnitCost,
        )
        await tx.update(products).set({
          stockQty: fromCents(toCents(currentStock) + restoredQuantity),
        }).where(eq(products.id, product.id))
        await tx.insert(productInventoryCosts).values({
          productId: product.id,
          unitCost: nextUnitCost,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: productInventoryCosts.productId,
          set: { unitCost: nextUnitCost, updatedAt: new Date() },
        })
      } else {
        continue
      }

      const [restoration] = await tx.insert(stockMovements).values({
        ingredientId: movement.ingredientId,
        productId: movement.productId,
        orderId,
        type: 'adjustment',
        quantity: restoredQuantityValue,
        note: `Refund: ${reason}`,
        createdBy: userId,
      }).returning({ id: stockMovements.id })
      await tx.insert(stockMovementCosts).values({
        movementId: restoration.id,
        unitCost: restoredUnitCost,
        totalCost: movement.totalCost!,
      })
    }

    const paymentTotals = new Map<string, number>()
    for (const payment of payments) {
      const accountCode = getPaymentAccountCode(payment.paymentMethod)
      paymentTotals.set(accountCode, (paymentTotals.get(accountCode) ?? 0) + toCents(payment.amount))
    }
    const paymentAccountCodes = [...paymentTotals.keys()]
    const paymentAccounts = await tx.select().from(chartOfAccounts)
      .where(inArray(chartOfAccounts.code, paymentAccountCodes))
    const paymentAccountsByCode = new Map(paymentAccounts.map(account => [account.code, account]))
    const [salesAccount] = await tx.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.code, '4001')).limit(1)
    const [inventoryAccount] = movementCost > 0
      ? await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1201')).limit(1)
      : [undefined]
    const [cogsAccount] = movementCost > 0
      ? await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '5001')).limit(1)
      : [undefined]
    if (
      !salesAccount
      || paymentAccountCodes.some(code => !paymentAccountsByCode.has(code))
      || (movementCost > 0 && (!inventoryAccount || !cogsAccount))
    ) {
      throw new Error('ACCOUNTING_NOT_CONFIGURED')
    }

    const [journal] = await tx.insert(journalEntries).values({
      reference: `REFUND-${order.id.slice(0, 8)}`,
      description: `POS refund: ${reason}`,
      sourceType: 'refund',
      sourceId: order.id,
      createdBy: userId,
    }).returning()

    const journalLines = [
      {
        journalEntryId: journal.id,
        accountId: salesAccount.id,
        type: 'debit' as const,
        amount: order.totalAmount,
      },
      ...paymentAccountCodes.map(code => ({
        journalEntryId: journal.id,
        accountId: paymentAccountsByCode.get(code)!.id,
        type: 'credit' as const,
        amount: fromCents(paymentTotals.get(code)!),
      })),
    ]
    if (movementCost > 0 && inventoryAccount && cogsAccount) {
      const cogsAmount = fromCents(movementCost)
      journalLines.push(
        { journalEntryId: journal.id, accountId: inventoryAccount.id, type: 'debit', amount: cogsAmount },
        { journalEntryId: journal.id, accountId: cogsAccount.id, type: 'credit', amount: cogsAmount },
      )
    }
    await tx.insert(journalEntryLines).values(journalLines)

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
        costOfGoods: fromCents(movementCost),
        paymentAccounts: Object.fromEntries(
          paymentAccountCodes.map(code => [code, fromCents(paymentTotals.get(code)!)]),
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
    payments: order.transactions.some(payment => payment.isRefund)
      ? []
      : order.transactions.map(payment => ({
          id: payment.id,
          paymentMethod: payment.paymentMethod as RefundableOrder['payments'][number]['paymentMethod'],
          amount: payment.amount,
        })),
  })).filter(order => order.payments.length > 0)
}
