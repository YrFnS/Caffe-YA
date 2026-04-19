import { db } from '@/lib/db'
import { orders, orderItems, transactions, resources } from '@/lib/schema'
import { eq, and, isNull } from 'drizzle-orm'

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
  const totalPrice = (Number(unitPrice) * quantity).toFixed(3)

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

  const totalPrice = (Number(item.unitPrice) * quantity).toFixed(3)
  await db.update(orderItems)
    .set({ quantity: quantity.toString(), totalPrice })
    .where(eq(orderItems.id, itemId))

  await recalculateOrderTotals(item.orderId)
}

async function recalculateOrderTotals(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt))
  })

  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })

  const total = subtotal + Number(order?.timerChargeAmount || 0)

  await db.update(orders)
    .set({ subtotal: subtotal.toFixed(3), totalAmount: total.toFixed(3) })
    .where(eq(orders.id, orderId))
}

export async function checkoutOrder(orderId: string, paymentMethod: string, amount: string, reference?: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order) throw new Error('ORDER_NOT_FOUND')

  await db.update(orders)
    .set({ status: 'closed', closedAt: new Date() })
    .where(eq(orders.id, orderId))

  await db.insert(transactions).values({
    orderId,
    shiftId: order.shiftId,
    paymentMethod: paymentMethod as 'cash' | 'card' | 'mobile_wallet',
    amount,
    reference,
  })

  if (order.resourceId) {
    await db.update(resources)
      .set({ status: 'available' })
      .where(eq(resources.id, order.resourceId))
  }
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