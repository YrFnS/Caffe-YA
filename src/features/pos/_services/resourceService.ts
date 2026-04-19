import { db } from '@/lib/db'
import { resources, resourceCategories, orders } from '@/lib/schema'
import { eq } from 'drizzle-orm'

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

    return resource
  })
}

export async function startTimer(orderId: string) {
  await db.update(orders)
    .set({ timerStartedAt: new Date() })
    .where(eq(orders.id, orderId))
}

export async function stopTimer(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order || !order.timerStartedAt) return null

  const startTime = new Date(order.timerStartedAt)
  const endTime = new Date()
  const elapsedMs = endTime.getTime() - startTime.getTime()
  const elapsedMinutes = Math.floor(elapsedMs / 60000)

  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, order.resourceId!),
    with: { category: true },
  })

  if (!resource) return null

  const { hourlyRate, minimumMinutes = 0, graceMinutes = 0 } = resource.category ?? {}
  const minMin = minimumMinutes ?? 0
  const graceMin = graceMinutes ?? 0

  const chargeableMinutes = Math.max(elapsedMinutes - graceMin, minMin)
  const charge = (chargeableMinutes / 60) * Number(hourlyRate)

  await db.update(orders)
    .set({
      timerEndedAt: endTime,
      timerChargeAmount: charge.toFixed(3),
    })
    .where(eq(orders.id, orderId))

  return {
    elapsedMinutes,
    chargeableMinutes,
    charge: charge.toFixed(3),
  }
}

export async function transferOrder(orderId: string, newResourceId: string) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    if (order.resourceId) {
      await tx.update(resources)
        .set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }

    let timerCharge = '0'
    if (order.timerStartedAt) {
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
        timerCharge = ((chargeableMinutes / 60) * Number(hourlyRate)).toFixed(3)
      }
    }

    const newResource = await tx.query.resources.findFirst({
      where: eq(resources.id, newResourceId),
    })
    if (!newResource || newResource.status !== 'available') {
      throw new Error('NEW_RESOURCE_NOT_AVAILABLE')
    }

    await tx.update(resources)
      .set({ status: 'occupied' })
      .where(eq(resources.id, newResourceId))

    const newCategory = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, newResource.categoryId),
    })

    await tx.update(orders)
      .set({
        resourceId: newResourceId,
        timerStartedAt: newCategory?.isTimed ? new Date() : order.timerStartedAt,
        timerEndedAt: newCategory?.isTimed ? null : order.timerEndedAt,
        timerChargeAmount: timerCharge,
      })
      .where(eq(orders.id, orderId))

    return { timerCharge }
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