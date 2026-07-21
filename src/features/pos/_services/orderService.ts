import { db } from '@/lib/db'
import { auditLogs, chartOfAccounts, ingredients, journalEntries, journalEntryLines, orders, orderItems, transactions, resources, shifts, stockMovements } from '@/lib/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getProductIngredients } from '@/features/inventory/_services/productService'
import { toCents, fromCents } from '@/lib/currency'

export async function getOrCreateDraftOrder(shiftId: string, userId: string) {
  const existing = await db.query.orders.findFirst({
    where: and(
      eq(orders.shiftId, shiftId),
      eq(orders.cashierId, userId),
      eq(orders.status, 'draft')
    )
  })

  if (existing) return existing

  const [newOrder] = await db.insert(orders).values({
    shiftId,
    cashierId: userId,
    status: 'draft',
    subtotal: '0',
    totalAmount: '0',
  }).returning()

  return newOrder
}

export async function getActiveShift(userId: string) {
  const openShift = await db.query.shifts.findFirst({
    where: and(
      eq(shifts.cashierId, userId),
      eq(shifts.status, 'open')
    )
  })
  return openShift
}

export async function addItemToOrder(orderId: string, productId: string, quantity: number, unitPrice: string) {
  const totalPrice = fromCents(toCents(unitPrice) * quantity)

  const [item] = await db.insert(orderItems).values({
    orderId,
    productId,
    quantity: quantity.toString(),
    unitPrice,
    totalPrice,
  }).returning()

  await recalculateOrderTotals(orderId)
  return item
}

export async function removeItemFromOrder(itemId: string) {
  const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) })
  if (!item) return

  await db.update(orderItems)
    .set({ voidedAt: new Date() })
    .where(eq(orderItems.id, itemId))

  await recalculateOrderTotals(item.orderId)
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) })
  if (!item) return

  if (quantity <= 0) {
    await removeItemFromOrder(itemId)
    return
  }

  const totalPrice = fromCents(toCents(item.unitPrice) * quantity)
  await db.update(orderItems)
    .set({ quantity: quantity.toString(), totalPrice })
    .where(eq(orderItems.id, itemId))

  await recalculateOrderTotals(item.orderId)
}

async function recalculateOrderTotals(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt))
  })

  const subtotal = items.reduce((sum, item) => sum + toCents(item.totalPrice), 0)
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })

  const total = subtotal + toCents(order?.timerChargeAmount ?? '0')

  await db.update(orders)
    .set({ subtotal: fromCents(subtotal), totalAmount: fromCents(total) })
    .where(eq(orders.id, orderId))
}

export async function checkoutOrder(orderId: string, paymentMethod: string, amount: string, reference?: string, userId?: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order) throw new Error('ORDER_NOT_FOUND')
    if (!['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    if (order.timerStartedAt && !order.timerEndedAt) throw new Error('TIMER_RUNNING')
    if (toCents(amount) !== toCents(order.totalAmount)) throw new Error('PAYMENT_MISMATCH')

    await tx.update(orders)
      .set({ status: 'closed', closedAt: new Date() })
      .where(eq(orders.id, orderId))

    await tx.insert(transactions).values({
      orderId,
      shiftId: order.shiftId,
      paymentMethod: paymentMethod as 'cash' | 'card' | 'mobile_wallet',
      amount,
      reference,
    })

    if (order.resourceId) {
      await tx.update(resources)
        .set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }

    // Deduct recipe ingredients
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
      }
    }

    const [clearingAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1001')).limit(1)
    const [salesAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '4001')).limit(1)
    if (!clearingAccount || !salesAccount) throw new Error('ACCOUNTING_NOT_CONFIGURED')
    const [journal] = await tx.insert(journalEntries).values({
      reference: `ORDER-${order.id.slice(0, 8)}`,
      description: 'POS checkout',
      sourceType: 'order',
      sourceId: order.id,
      createdBy: userId,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: clearingAccount.id, type: 'debit', amount },
      { journalEntryId: journal.id, accountId: salesAccount.id, type: 'credit', amount },
    ])
    await tx.insert(auditLogs).values({
      userId,
      action: 'CHECKOUT_ORDER',
      targetTable: 'orders',
      targetId: order.id,
      oldValue: { status: order.status },
      newValue: { status: 'closed', paymentMethod, amount, reference },
    })
  })
}

export async function clearOrder(orderId: string) {
  await db.update(orderItems)
    .set({ voidedAt: new Date() })
    .where(eq(orderItems.orderId, orderId))

  await db.update(orders)
    .set({ subtotal: '0', totalAmount: '0' })
    .where(eq(orders.id, orderId))
}

export async function getOrderWithItems(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        where: isNull(orderItems.voidedAt),
        with: { product: true }
      }
    }
  })
}

export async function getDraftOrderItems(orderId: string) {
  return db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt)),
    with: { product: true }
  })
}
