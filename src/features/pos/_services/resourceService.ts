import { db } from '@/lib/db'
import { auditLogs, orders, resourceCategories, resources } from '@/lib/schema'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { fromCents, toCents } from '@/lib/currency'
import type { ResourceOperationsView } from '../_types'
import { addTimedCharge } from './timerBilling'

const ACTIVE_ORDER_STATUSES = ['draft', 'open'] as const

async function getActiveResourceIds(): Promise<Set<string>> {
  const rows = await db.select({ resourceId: orders.resourceId })
    .from(orders)
    .where(and(
      inArray(orders.status, ACTIVE_ORDER_STATUSES),
      isNotNull(orders.resourceId),
    ))
  return new Set(rows.flatMap(row => row.resourceId ? [row.resourceId] : []))
}

export async function getResourcesWithCategories() {
  const [resourceRows, activeResourceIds] = await Promise.all([
    db.query.resources.findMany({
      where: eq(resources.isActive, true),
      with: { category: true },
      orderBy: (resource, { asc }) => [asc(resource.name)],
    }),
    getActiveResourceIds(),
  ])

  return resourceRows.map(resource => ({
    ...resource,
    status: activeResourceIds.has(resource.id)
      ? 'occupied' as const
      : resource.status === 'occupied'
        ? 'available' as const
        : resource.status,
  }))
}

export async function getResourcesWithActiveOrders(): Promise<ResourceOperationsView[]> {
  const [resourceRows, activeOrders] = await Promise.all([
    db.query.resources.findMany({
      where: eq(resources.isActive, true),
      with: { category: true },
      orderBy: (resource, { asc }) => [asc(resource.name)],
    }),
    db.query.orders.findMany({
      where: and(
        inArray(orders.status, ACTIVE_ORDER_STATUSES),
        isNotNull(orders.resourceId),
      ),
      orderBy: [desc(orders.createdAt)],
      with: { cashier: { columns: { name: true } } },
    }),
  ])

  const orderByResource = new Map<string, typeof activeOrders[number]>()
  for (const order of activeOrders) {
    if (order.resourceId && !orderByResource.has(order.resourceId)) {
      orderByResource.set(order.resourceId, order)
    }
  }

  return resourceRows.map(resource => {
    const activeOrder = orderByResource.get(resource.id)
    return {
      ...resource,
      status: activeOrder
        ? 'occupied' as const
        : resource.status === 'occupied'
          ? 'available' as const
          : resource.status,
      activeOrder: activeOrder ? {
        id: activeOrder.id,
        cashierId: activeOrder.cashierId,
        cashierName: activeOrder.cashier?.name ?? '—',
        totalAmount: activeOrder.totalAmount,
        timerStartedAt: activeOrder.timerStartedAt,
        timerEndedAt: activeOrder.timerEndedAt,
      } : null,
    }
  })
}

export async function getResourceCategories() {
  return db.query.resourceCategories.findMany({
    where: eq(resourceCategories.isActive, true),
    orderBy: (category, { asc }) => [asc(category.name)],
  })
}

export async function assignResourceToOrder(resourceId: string, orderId: string, userId: string) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !ACTIVE_ORDER_STATUSES.includes(order.status as typeof ACTIVE_ORDER_STATUSES[number])) {
      throw new Error('ORDER_NOT_OPEN')
    }
    if (order.resourceId) throw new Error('ORDER_ALREADY_HAS_RESOURCE')

    const [resource] = await tx.select().from(resources).where(eq(resources.id, resourceId)).for('update')
    if (!resource || !resource.isActive || resource.status === 'maintenance') {
      throw new Error('RESOURCE_NOT_AVAILABLE')
    }

    const activeOrder = await tx.select({ id: orders.id })
      .from(orders)
      .where(and(
        eq(orders.resourceId, resourceId),
        inArray(orders.status, ACTIVE_ORDER_STATUSES),
      ))
      .limit(1)
    if (activeOrder.length) throw new Error('RESOURCE_NOT_AVAILABLE')

    const category = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, resource.categoryId),
    })
    const timerStartedAt = category?.isTimed ? new Date() : null

    await tx.update(resources).set({ status: 'occupied' }).where(eq(resources.id, resourceId))
    await tx.update(orders).set({
      resourceId,
      timerStartedAt,
      timerEndedAt: timerStartedAt ? null : order.timerEndedAt,
    }).where(eq(orders.id, orderId))

    await tx.insert(auditLogs).values({
      userId,
      action: 'ASSIGN_RESOURCE',
      targetTable: 'resources',
      targetId: resourceId,
      oldValue: { status: resource.status },
      newValue: { status: 'occupied', orderId, timerStartedAt },
    })

    return { resource, timerStartedAt }
  })
}

export async function startTimer(orderId: string) {
  await db.update(orders).set({ timerStartedAt: new Date(), timerEndedAt: null }).where(eq(orders.id, orderId))
}

export async function stopTimer(orderId: string, userId: string) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !order.timerStartedAt || order.timerEndedAt) return null

    const startTime = new Date(order.timerStartedAt)
    const endTime = new Date()
    const elapsedMs = endTime.getTime() - startTime.getTime()
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))

    const resource = await tx.query.resources.findFirst({
      where: eq(resources.id, order.resourceId!),
      with: { category: true },
    })
    if (!resource) return null

    const { hourlyRate, minimumMinutes = 0, graceMinutes = 0 } = resource.category ?? {}
    const { chargeableMinutes, charge } = addTimedCharge(
      order.timerChargeAmount ?? '0',
      hourlyRate ?? '0',
      elapsedMinutes,
      minimumMinutes ?? 0,
      graceMinutes ?? 0,
    )

    await tx.update(orders).set({
      timerEndedAt: endTime,
      timerChargeAmount: charge,
      totalAmount: fromCents(toCents(order.subtotal) + toCents(charge)),
    }).where(eq(orders.id, orderId))

    await tx.insert(auditLogs).values({
      userId,
      action: 'STOP_RESOURCE_TIMER',
      targetTable: 'orders',
      targetId: orderId,
      oldValue: { timerStartedAt: order.timerStartedAt, timerChargeAmount: order.timerChargeAmount },
      newValue: { timerEndedAt: endTime, elapsedMinutes, chargeableMinutes, charge },
    })

    return { elapsedMinutes, chargeableMinutes, charge }
  })
}

export async function transferOrder(orderId: string, newResourceId: string, userId: string) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
    if (!order || order.cashierId !== userId || !ACTIVE_ORDER_STATUSES.includes(order.status as typeof ACTIVE_ORDER_STATUSES[number])) {
      throw new Error('ORDER_NOT_OPEN')
    }
    if (order.resourceId === newResourceId) throw new Error('RESOURCE_ALREADY_ASSIGNED')

    const [newResource] = await tx.select().from(resources).where(eq(resources.id, newResourceId)).for('update')
    if (!newResource || !newResource.isActive || newResource.status === 'maintenance') {
      throw new Error('NEW_RESOURCE_NOT_AVAILABLE')
    }

    const destinationOrder = await tx.select({ id: orders.id })
      .from(orders)
      .where(and(
        eq(orders.resourceId, newResourceId),
        inArray(orders.status, ACTIVE_ORDER_STATUSES),
      ))
      .limit(1)
    if (destinationOrder.length) throw new Error('NEW_RESOURCE_NOT_AVAILABLE')

    const oldResourceId = order.resourceId
    if (oldResourceId) {
      await tx.update(resources).set({ status: 'available' }).where(eq(resources.id, oldResourceId))
    }

    let timerCharge = order.timerChargeAmount ?? '0'
    if (order.timerStartedAt && !order.timerEndedAt && oldResourceId) {
      const startTime = new Date(order.timerStartedAt)
      const endTime = new Date()
      const elapsedMinutes = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 60000))
      const oldResource = await tx.query.resources.findFirst({
        where: eq(resources.id, oldResourceId),
        with: { category: true },
      })
      if (oldResource?.category?.isTimed) {
        timerCharge = addTimedCharge(
          timerCharge,
          oldResource.category.hourlyRate ?? '0',
          elapsedMinutes,
          oldResource.category.minimumMinutes ?? 0,
          oldResource.category.graceMinutes ?? 0,
        ).charge
      }
    }

    await tx.update(resources).set({ status: 'occupied' }).where(eq(resources.id, newResourceId))

    const newCategory = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, newResource.categoryId),
    })
    const nextTimerStartedAt = newCategory?.isTimed ? new Date() : null

    await tx.update(orders).set({
      resourceId: newResourceId,
      timerStartedAt: nextTimerStartedAt,
      timerEndedAt: nextTimerStartedAt ? null : order.timerEndedAt,
      timerChargeAmount: timerCharge,
      totalAmount: fromCents(toCents(order.subtotal) + toCents(timerCharge)),
    }).where(eq(orders.id, orderId))

    await tx.insert(auditLogs).values({
      userId,
      action: 'TRANSFER_RESOURCE',
      targetTable: 'orders',
      targetId: orderId,
      oldValue: { resourceId: oldResourceId, timerStartedAt: order.timerStartedAt },
      newValue: { resourceId: newResourceId, timerStartedAt: nextTimerStartedAt, timerChargeAmount: timerCharge },
    })

    return { timerCharge, timerStartedAt: nextTimerStartedAt }
  })
}

export async function getOrderWithResource(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { resource: { with: { category: true } } },
  })
}
