import { db } from '@/lib/db'
import { resources, resourceCategories, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { addMoney, fromCents, prorateMoney, toCents } from '@/lib/currency'

export async function getResourcesWithCategories() {
  return db.query.resources.findMany({
    where: eq(resources.isActive, true),
    with: {
      category: true,
    },
    orderBy: (resources, { asc }) => [asc(resources.name)],
  })
}

export async function getResourceCategories() {
  return db.query.resourceCategories.findMany({
    where: eq(resourceCategories.isActive, true),
  })
}

export async function assignResourceToOrder(resourceId: string, orderId: string) {
  return db.transaction(async (tx) => {
    const [resource] = await tx.select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .for('update')

    if (!resource || resource.status !== 'available') {
      throw new Error('RESOURCE_NOT_AVAILABLE')
    }

    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    if (order.resourceId) throw new Error('ORDER_ALREADY_HAS_RESOURCE')

    await tx.update(resources)
      .set({ status: 'occupied' })
      .where(eq(resources.id, resourceId))

    const category = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, resource.categoryId),
    })

    if (category?.isTimed) {
      await tx.update(orders)
        .set({ resourceId, timerStartedAt: new Date() })
        .where(eq(orders.id, orderId))
    } else {
      await tx.update(orders)
        .set({ resourceId })
        .where(eq(orders.id, orderId))
    }

    return { resource, timerStartedAt: category?.isTimed ? new Date() : null }
  })
}

export async function startTimer(orderId: string) {
  await db.update(orders)
    .set({ timerStartedAt: new Date() })
    .where(eq(orders.id, orderId))
}

export async function stopTimer(orderId: string) {
  return db.transaction(async tx => {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
  if (!order || !order.timerStartedAt || order.timerEndedAt) return null

  const startTime = new Date(order.timerStartedAt)
  const endTime = new Date()
  const elapsedMs = endTime.getTime() - startTime.getTime()
  const elapsedMinutes = Math.floor(elapsedMs / 60000)

  const resource = await tx.query.resources.findFirst({
    where: eq(resources.id, order.resourceId!),
    with: { category: true },
  })

  if (!resource) return null

  const { hourlyRate, minimumMinutes = 0, graceMinutes = 0 } = resource.category ?? {}
  const minMin = minimumMinutes ?? 0
  const graceMin = graceMinutes ?? 0

  const chargeableMinutes = Math.max(elapsedMinutes - graceMin, minMin)
  const charge = prorateMoney(hourlyRate ?? '0', chargeableMinutes, 60)

  await tx.update(orders)
    .set({
      timerEndedAt: endTime,
      timerChargeAmount: charge,
      totalAmount: fromCents(toCents(order.subtotal) + toCents(charge)),
    })
    .where(eq(orders.id, orderId))

  return {
    elapsedMinutes,
    chargeableMinutes,
    charge,
  }
  })
}

export async function transferOrder(orderId: string, newResourceId: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || !['draft', 'open'].includes(order.status)) throw new Error('ORDER_NOT_OPEN')
    if (order.resourceId === newResourceId) throw new Error('RESOURCE_ALREADY_ASSIGNED')

    const [newResource] = await tx.select().from(resources).where(eq(resources.id, newResourceId)).for('update')
    if (!newResource || newResource.status !== 'available') throw new Error('NEW_RESOURCE_NOT_AVAILABLE')

    if (order.resourceId) {
      await tx.update(resources)
        .set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }

    let timerCharge = order.timerChargeAmount ?? '0'
    if (order.timerStartedAt && !order.timerEndedAt) {
      const startTime = new Date(order.timerStartedAt)
      const endTime = new Date()
      const elapsedMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000)
      const oldResource = await tx.query.resources.findFirst({
        where: eq(resources.id, order.resourceId!),
        with: { category: true },
      })
      if (oldResource?.category?.isTimed) {
        const { hourlyRate, minimumMinutes = 0, graceMinutes = 0 } = oldResource.category ?? {}
        const minMin = minimumMinutes ?? 0
        const graceMin = graceMinutes ?? 0
        const chargeableMinutes = Math.max(elapsedMinutes - graceMin, minMin)
        timerCharge = addMoney(timerCharge, prorateMoney(hourlyRate ?? '0', chargeableMinutes, 60))
      }
    }

    await tx.update(resources)
      .set({ status: 'occupied' })
      .where(eq(resources.id, newResourceId))

    const newCategory = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, newResource.categoryId),
    })

    const nextTimerStartedAt = newCategory?.isTimed ? new Date() : null
    await tx.update(orders)
      .set({
        resourceId: newResourceId,
        timerStartedAt: nextTimerStartedAt,
        timerEndedAt: newCategory?.isTimed ? null : order.timerEndedAt,
        timerChargeAmount: timerCharge,
        totalAmount: fromCents(toCents(order.subtotal) + toCents(timerCharge)),
      })
      .where(eq(orders.id, orderId))

    return { timerCharge, timerStartedAt: nextTimerStartedAt }
  })
}

export async function getOrderWithResource(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      resource: {
        with: { category: true },
      },
    },
  })
}
