import { db } from '../../../lib/db.ts'
import {
  auditLogs,
  chartOfAccounts,
  ingredients,
  journalEntries,
  journalEntryLines,
  orders,
  orderItems,
  productIngredients,
  products,
  resources,
  shifts,
  stockMovements,
  transactions,
} from '../../../lib/schema.ts'
import { productInventoryCosts, stockMovementCosts } from '../../../lib/valuationSchema.ts'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import {
  fromCents,
  multiplyDecimalMoney,
  multiplyDecimalMoneyMany,
  toCents,
} from '../../../lib/currency.ts'
import { getPaymentAccountCode } from '../../../lib/accounting.ts'
import { calculateStandardLineCost } from './costing.ts'
import { validatePayments, type PaymentLine } from './payment.ts'

export async function getOrCreateDraftOrder(shiftId: string, userId: string) {
  return db.transaction(async tx => {
    const [shift] = await tx.select().from(shifts).where(eq(shifts.id, shiftId)).for('update')
    if (!shift || shift.cashierId !== userId || shift.status !== 'open') {
      throw new Error('SHIFT_NOT_OPEN')
    }

    const [existing] = await tx.select().from(orders).where(and(
      eq(orders.shiftId, shiftId),
      eq(orders.cashierId, userId),
      eq(orders.status, 'draft'),
    )).limit(1)
    if (existing) return existing

    const [newOrder] = await tx.insert(orders).values({
      shiftId,
      cashierId: userId,
      status: 'draft',
      subtotal: '0',
      totalAmount: '0',
    }).returning()

    return newOrder
  })
}

export async function getActiveShift(userId: string) {
  return db.query.shifts.findFirst({
    where: and(
      eq(shifts.cashierId, userId),
      eq(shifts.status, 'open'),
    ),
  })
}

export async function addItemToOrder(orderId: string, productId: string, quantity: number, userId: string) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) {
      throw new Error('ORDER_NOT_OPEN')
    }
    const [product] = await tx.select().from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1)
    if (!product) throw new Error('PRODUCT_NOT_FOUND')

    const [existing] = await tx.select().from(orderItems).where(and(
      eq(orderItems.orderId, orderId),
      eq(orderItems.productId, productId),
      isNull(orderItems.voidedAt),
    )).limit(1)
    const nextQuantity = Number(existing?.quantity ?? 0) + quantity
    const totalPrice = fromCents(toCents(product.price) * nextQuantity)
    const [item] = existing
      ? await tx.update(orderItems).set({
          quantity: String(nextQuantity),
          unitPrice: product.price,
          totalPrice,
        }).where(eq(orderItems.id, existing.id)).returning()
      : await tx.insert(orderItems).values({
          orderId,
          productId,
          quantity: String(quantity),
          unitPrice: product.price,
          totalPrice,
        }).returning()

    const items = await tx.select().from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)))
    const subtotal = items.reduce((sum, row) => sum + toCents(row.totalPrice), 0)
    await tx.update(orders).set({
      subtotal: fromCents(subtotal),
      totalAmount: fromCents(subtotal + toCents(order.timerChargeAmount ?? '0')),
    }).where(eq(orders.id, orderId))
    return item
  })
}

export async function removeItemFromOrder(itemId: string, userId: string) {
  return updateItemQuantity(itemId, 0, userId)
}

export async function updateItemQuantity(itemId: string, quantity: number, userId: string) {
  return db.transaction(async tx => {
    const [item] = await tx.select().from(orderItems).where(eq(orderItems.id, itemId)).for('update')
    if (!item) throw new Error('ITEM_NOT_FOUND')
    const [order] = await tx.select().from(orders).where(eq(orders.id, item.orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) {
      throw new Error('ORDER_NOT_OPEN')
    }
    if (quantity <= 0) {
      await tx.update(orderItems).set({ voidedAt: new Date() }).where(eq(orderItems.id, itemId))
    } else {
      await tx.update(orderItems).set({
        quantity: String(quantity),
        totalPrice: fromCents(toCents(item.unitPrice) * quantity),
      }).where(eq(orderItems.id, itemId))
    }
    const items = await tx.select().from(orderItems)
      .where(and(eq(orderItems.orderId, order.id), isNull(orderItems.voidedAt)))
    const subtotal = items.reduce((sum, row) => sum + toCents(row.totalPrice), 0)
    await tx.update(orders).set({
      subtotal: fromCents(subtotal),
      totalAmount: fromCents(subtotal + toCents(order.timerChargeAmount ?? '0')),
    }).where(eq(orders.id, order.id))
  })
}

export async function checkoutOrder(orderId: string, paymentLines: PaymentLine[], userId: string) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order) throw new Error('ORDER_NOT_FOUND')
    if (order.cashierId !== userId) throw new Error('ORDER_NOT_OWNED')
    if (!['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    if (order.timerStartedAt && !order.timerEndedAt) throw new Error('TIMER_RUNNING')
    const payments = validatePayments(paymentLines, order.totalAmount)

    const items = await tx.query.orderItems.findMany({
      where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)),
      with: { product: true },
    })

    let costOfGoods = 0
    for (const item of items) {
      if (item.product?.type === 'recipe') {
        const recipeRows = await tx.select().from(productIngredients)
          .where(eq(productIngredients.productId, item.productId))

        for (const recipeRow of recipeRows) {
          const [ingredient] = await tx.select().from(ingredients)
            .where(eq(ingredients.id, recipeRow.ingredientId))
            .for('update')
          if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')

          const deductionQuantity = multiplyDecimalMoney(recipeRow.quantityUsed, item.quantity)
          const deduction = toCents(deductionQuantity)
          const currentStock = toCents(ingredient.stockQty)
          const unitCost = ingredient.costPerUnit ?? '0'
          if (currentStock < deduction) throw new Error('INSUFFICIENT_STOCK')
          if (deduction > 0 && toCents(unitCost) <= 0) {
            throw new Error('INVENTORY_COST_NOT_CONFIGURED')
          }

          const movementCost = multiplyDecimalMoneyMany(
            unitCost,
            recipeRow.quantityUsed,
            item.quantity,
          )
          await tx.update(ingredients).set({
            stockQty: fromCents(currentStock - deduction),
          }).where(eq(ingredients.id, recipeRow.ingredientId))
          const [movement] = await tx.insert(stockMovements).values({
            type: 'sale_deduction',
            quantity: fromCents(-deduction),
            ingredientId: recipeRow.ingredientId,
            productId: item.productId,
            orderId,
            createdBy: userId,
          }).returning({ id: stockMovements.id })
          await tx.insert(stockMovementCosts).values({
            movementId: movement.id,
            unitCost,
            totalCost: movementCost,
          })
          costOfGoods += toCents(movementCost)
        }
      } else if (item.product?.type === 'standard' && item.product.trackStock) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, item.productId))
          .for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        const [valuation] = await tx.select().from(productInventoryCosts)
          .where(eq(productInventoryCosts.productId, item.productId))
          .for('update')

        const deduction = toCents(item.quantity)
        const currentStock = toCents(product.stockQty ?? '0')
        if (currentStock < deduction) throw new Error('INSUFFICIENT_STOCK')
        if (deduction > 0 && (!valuation || toCents(valuation.unitCost) <= 0)) {
          throw new Error('INVENTORY_COST_NOT_CONFIGURED')
        }

        const unitCost = valuation?.unitCost ?? '0'
        const movementCost = calculateStandardLineCost(unitCost, item.quantity)
        await tx.update(products).set({
          stockQty: fromCents(currentStock - deduction),
        }).where(eq(products.id, product.id))
        const [movement] = await tx.insert(stockMovements).values({
          type: 'sale_deduction',
          quantity: fromCents(-deduction),
          productId: product.id,
          orderId,
          createdBy: userId,
        }).returning({ id: stockMovements.id })
        await tx.insert(stockMovementCosts).values({
          movementId: movement.id,
          unitCost,
          totalCost: movementCost,
        })
        costOfGoods += toCents(movementCost)
      }
    }

    const paymentTotals = new Map<string, number>()
    for (const payment of payments) {
      const accountCode = getPaymentAccountCode(payment.method)
      paymentTotals.set(accountCode, (paymentTotals.get(accountCode) ?? 0) + toCents(payment.amount))
    }

    const paymentAccountCodes = [...paymentTotals.keys()]
    const paymentAccounts = await tx.select().from(chartOfAccounts)
      .where(inArray(chartOfAccounts.code, paymentAccountCodes))
    const paymentAccountsByCode = new Map(paymentAccounts.map(account => [account.code, account]))
    const [salesAccount] = await tx.select().from(chartOfAccounts)
      .where(eq(chartOfAccounts.code, '4001')).limit(1)
    const [inventoryAccount] = costOfGoods > 0
      ? await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1201')).limit(1)
      : [undefined]
    const [cogsAccount] = costOfGoods > 0
      ? await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '5001')).limit(1)
      : [undefined]
    if (
      !salesAccount
      || paymentAccountCodes.some(code => !paymentAccountsByCode.has(code))
      || (costOfGoods > 0 && (!inventoryAccount || !cogsAccount))
    ) {
      throw new Error('ACCOUNTING_NOT_CONFIGURED')
    }

    const [journal] = await tx.insert(journalEntries).values({
      reference: `ORDER-${order.id.slice(0, 8)}`,
      description: 'POS checkout',
      sourceType: 'order',
      sourceId: order.id,
      createdBy: userId,
    }).returning()

    const journalLines = [
      ...paymentAccountCodes.map(code => ({
        journalEntryId: journal.id,
        accountId: paymentAccountsByCode.get(code)!.id,
        type: 'debit' as const,
        amount: fromCents(paymentTotals.get(code)!),
      })),
      {
        journalEntryId: journal.id,
        accountId: salesAccount.id,
        type: 'credit' as const,
        amount: order.totalAmount,
      },
    ]
    if (costOfGoods > 0 && inventoryAccount && cogsAccount) {
      const cogsAmount = fromCents(costOfGoods)
      journalLines.push(
        { journalEntryId: journal.id, accountId: cogsAccount.id, type: 'debit', amount: cogsAmount },
        { journalEntryId: journal.id, accountId: inventoryAccount.id, type: 'credit', amount: cogsAmount },
      )
    }
    await tx.insert(journalEntryLines).values(journalLines)

    await tx.update(orders).set({ status: 'closed', closedAt: new Date() })
      .where(eq(orders.id, orderId))
    await tx.insert(transactions).values(payments.map(payment => ({
      orderId,
      shiftId: order.shiftId,
      paymentMethod: payment.method,
      amount: payment.amount,
      reference: payment.reference,
    })))
    if (order.resourceId) {
      await tx.update(resources).set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }

    await tx.insert(auditLogs).values({
      userId,
      action: 'CHECKOUT_ORDER',
      targetTable: 'orders',
      targetId: order.id,
      oldValue: { status: order.status },
      newValue: {
        status: 'closed',
        payments,
        costOfGoods: fromCents(costOfGoods),
        paymentAccounts: Object.fromEntries(
          paymentAccountCodes.map(code => [code, fromCents(paymentTotals.get(code)!)]),
        ),
      },
    })
  })
}

export async function clearOrder(orderId: string, userId: string) {
  await db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) {
      throw new Error('ORDER_NOT_OPEN')
    }
    await tx.update(orderItems).set({ voidedAt: new Date() }).where(eq(orderItems.orderId, orderId))
    await tx.update(orders).set({
      subtotal: '0',
      totalAmount: order.timerChargeAmount ?? '0',
    }).where(eq(orders.id, orderId))
  })
}

export async function getOrderWithItems(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        where: isNull(orderItems.voidedAt),
        with: { product: true },
      },
    },
  })
}

export async function getDraftOrderItems(orderId: string) {
  return db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)),
    with: { product: true },
  })
}
