import { db } from '@/lib/db'
import { auditLogs, chartOfAccounts, ingredients, journalEntries, journalEntryLines, orders, orderItems, products, transactions, resources, shifts, stockMovements } from '@/lib/schema'
import { eq, and, inArray, isNull } from 'drizzle-orm'
import { getProductIngredients } from '@/features/inventory/_services/productService'
import { toCents, fromCents } from '@/lib/currency'
import { getPaymentAccountCode } from '@/lib/accounting'
import { validatePayments, type PaymentLine } from './payment'

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
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    const [product] = await tx.select().from(products).where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1)
    if (!product) throw new Error('PRODUCT_NOT_FOUND')

    const [existing] = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), eq(orderItems.productId, productId), isNull(orderItems.voidedAt))).limit(1)
    const nextQuantity = Number(existing?.quantity ?? 0) + quantity
    const totalPrice = fromCents(toCents(product.price) * nextQuantity)
    const [item] = existing
      ? await tx.update(orderItems).set({ quantity: String(nextQuantity), unitPrice: product.price, totalPrice }).where(eq(orderItems.id, existing.id)).returning()
      : await tx.insert(orderItems).values({ orderId, productId, quantity: String(quantity), unitPrice: product.price, totalPrice }).returning()

    const items = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)))
    const subtotal = items.reduce((sum, row) => sum + toCents(row.totalPrice), 0)
    await tx.update(orders).set({ subtotal: fromCents(subtotal), totalAmount: fromCents(subtotal + toCents(order.timerChargeAmount ?? '0')) }).where(eq(orders.id, orderId))
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
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    if (quantity <= 0) await tx.update(orderItems).set({ voidedAt: new Date() }).where(eq(orderItems.id, itemId))
    else await tx.update(orderItems).set({ quantity: String(quantity), totalPrice: fromCents(toCents(item.unitPrice) * quantity) }).where(eq(orderItems.id, itemId))
    const items = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, order.id), isNull(orderItems.voidedAt)))
    const subtotal = items.reduce((sum, row) => sum + toCents(row.totalPrice), 0)
    await tx.update(orders).set({ subtotal: fromCents(subtotal), totalAmount: fromCents(subtotal + toCents(order.timerChargeAmount ?? '0')) }).where(eq(orders.id, order.id))
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

    await tx.update(orders)
      .set({ status: 'closed', closedAt: new Date() })
      .where(eq(orders.id, orderId))

    await tx.insert(transactions).values(payments.map(payment => ({
      orderId,
      shiftId: order.shiftId,
      paymentMethod: payment.method,
      amount: payment.amount,
      reference: payment.reference,
    })))

    if (order.resourceId) {
      await tx.update(resources)
        .set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }

    // Deduct recipe ingredients and tracked standard-product stock atomically.
    const items = await tx.query.orderItems.findMany({
      where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)),
      with: { product: true },
    })

    for (const item of items) {
      if (item.product && item.product.type === 'recipe') {
        const recipeIngredients = await getProductIngredients(item.productId)
        for (const ri of recipeIngredients) {
          const deduction = Number(ri.quantityUsed) * Number(item.quantity)
          const [ingredient] = await tx.select().from(ingredients)
            .where(eq(ingredients.id, ri.ingredientId)).for('update')
          if (!ingredient || Number(ingredient.stockQty) < deduction) throw new Error('INSUFFICIENT_STOCK')
          await tx.update(ingredients)
            .set({ stockQty: String(Number(ingredient.stockQty) - deduction) })
            .where(eq(ingredients.id, ri.ingredientId))
          await tx.insert(stockMovements).values({
            type: 'sale_deduction',
            quantity: String(-deduction),
            ingredientId: ri.ingredientId,
            productId: item.productId,
            orderId,
            createdBy: userId,
          })
        }
      } else if (item.product?.type === 'standard' && item.product.trackStock) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).for('update')
        const deduction = Number(item.quantity)
        if (!product || Number(product.stockQty ?? '0') < deduction) throw new Error('INSUFFICIENT_STOCK')
        await tx.update(products).set({ stockQty: String(Number(product.stockQty ?? '0') - deduction) }).where(eq(products.id, product.id))
        await tx.insert(stockMovements).values({
          type: 'sale_deduction', quantity: String(-deduction), productId: product.id,
          orderId, createdBy: userId,
        })
      }
    }

    const paymentTotals = new Map<string, number>()
    for (const payment of payments) {
      const accountCode = getPaymentAccountCode(payment.method)
      paymentTotals.set(accountCode, (paymentTotals.get(accountCode) ?? 0) + toCents(payment.amount))
    }

    const paymentAccountCodes = [...paymentTotals.keys()]
    const paymentAccounts = await tx.select().from(chartOfAccounts).where(inArray(chartOfAccounts.code, paymentAccountCodes))
    const paymentAccountsByCode = new Map(paymentAccounts.map(account => [account.code, account]))
    const [salesAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '4001')).limit(1)
    if (!salesAccount || paymentAccountCodes.some(code => !paymentAccountsByCode.has(code))) {
      throw new Error('ACCOUNTING_NOT_CONFIGURED')
    }

    const [journal] = await tx.insert(journalEntries).values({
      reference: `ORDER-${order.id.slice(0, 8)}`,
      description: 'POS checkout',
      sourceType: 'order',
      sourceId: order.id,
      createdBy: userId,
    }).returning()

    await tx.insert(journalEntryLines).values([
      ...paymentAccountCodes.map(code => ({
        journalEntryId: journal.id,
        accountId: paymentAccountsByCode.get(code)!.id,
        type: 'debit' as const,
        amount: fromCents(paymentTotals.get(code)!),
      })),
      { journalEntryId: journal.id, accountId: salesAccount.id, type: 'credit' as const, amount: order.totalAmount },
    ])

    await tx.insert(auditLogs).values({
      userId,
      action: 'CHECKOUT_ORDER',
      targetTable: 'orders',
      targetId: order.id,
      oldValue: { status: order.status },
      newValue: {
        status: 'closed',
        payments,
        paymentAccounts: Object.fromEntries(paymentAccountCodes.map(code => [code, fromCents(paymentTotals.get(code)!)])),
      },
    })
  })
}

export async function clearOrder(orderId: string, userId: string) {
  await db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    await tx.update(orderItems).set({ voidedAt: new Date() }).where(eq(orderItems.orderId, orderId))
    await tx.update(orders).set({ subtotal: '0', totalAmount: order.timerChargeAmount ?? '0' }).where(eq(orders.id, orderId))
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
