import { db } from '@/lib/db'
import { orders, orderItems, transactions, resources, shifts } from '@/lib/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getProductIngredients } from '@/features/inventory/_services/productService'
import { logMovement } from '@/features/inventory/_services/stockMovementService'
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
  const totalPrice = toCents(Number(unitPrice) * quantity)

  const [item] = await db.insert(orderItems).values({
    orderId,
    productId,
    quantity: quantity.toString(),
    unitPrice,
    totalPrice: totalPrice.toString(),
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

  const totalPrice = toCents(Number(item.unitPrice) * quantity)
  await db.update(orderItems)
    .set({ quantity: quantity.toString(), totalPrice: totalPrice.toString() })
    .where(eq(orderItems.id, itemId))

  await recalculateOrderTotals(item.orderId)
}

async function recalculateOrderTotals(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt))
  })

  const subtotal = items.reduce((sum, item) => sum + toCents(Number(item.totalPrice)), 0)
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })

  const total = subtotal + toCents(Number(order?.timerChargeAmount || 0))

  await db.update(orders)
    .set({ subtotal: fromCents(subtotal), totalAmount: fromCents(total) })
    .where(eq(orders.id, orderId))
}

export async function checkoutOrder(orderId: string, paymentMethod: string, amount: string, reference?: string, userId?: string) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) throw new Error('ORDER_NOT_FOUND')

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
          const deduction = toCents(Number(ri.quantityUsed) * Number(item.quantity))
          await logMovement({
            type: 'sale_deduction',
            quantity: fromCents(-deduction),
            ingredientId: ri.ingredientId,
            productId: item.productId,
            orderId,
            createdBy: userId,
          })
        }
      }
    }
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