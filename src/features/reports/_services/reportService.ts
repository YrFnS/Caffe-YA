import { db } from '@/lib/db'
import { and, eq, gte, inArray, desc } from 'drizzle-orm'
import { orders, shifts, transactions } from '@/lib/schema'
import type { TodaySummary } from '../_types'
import { fromCents, toCents } from '@/lib/currency'

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get today's summary: sales total, active orders, active timers, shift status.
 */
export async function getTodaySummary(): Promise<TodaySummary> {
  const today = startOfDay(new Date())

  // ── Orders created today (all statuses)
  const todayOrders = await db.query.orders.findMany({
    where: gte(orders.createdAt, today),
  })
  const todayOrderIds = todayOrders.map((o) => o.id)

  // ── Sales total: sum of non-refunded transaction amounts for today's orders
  let salesTotal = '0'
  if (todayOrderIds.length > 0) {
    const todayTxs = await db.query.transactions.findMany({
      where: and(
        eq(transactions.isRefund, false),
        inArray(transactions.orderId, todayOrderIds)
      ),
    })
    salesTotal = fromCents(todayTxs.reduce((sum, transaction) => sum + toCents(transaction.amount), 0))
  }

  // ── Active orders: open orders (created today, not yet closed)
  // 'open' = actively being worked on; 'closed' = finalized after payment
  const activeOrders = todayOrders.filter((o) => o.status === 'open' || o.status === 'draft').length

  // ── Active timers: orders with a running timer (timerStartedAt set, timerEndedAt null)
  const activeTimers = todayOrders.filter(
    (o) => o.timerStartedAt != null && o.timerEndedAt == null
  ).length

  // ── Most recent shift (system-wide — dashboard shows overall shift status)
  const allShifts = await db.query.shifts.findMany({
    orderBy: [desc(shifts.openedAt)],
    limit: 1,
  })
  const latestShift = allShifts[0] ?? null
  const shiftStatus = latestShift?.status === 'open' ? 'open' : 'closed'
  const openShiftId = latestShift?.status === 'open' ? latestShift.id : null

  return {
    salesTotal,
    activeOrders,
    activeTimers,
    shiftStatus,
    openShiftId,
  }
}

/**
 * Format a numeric string as IQD currency using Intl.NumberFormat.
 */
export function formatIQD(amount: string): string {
  const millimes = toCents(amount)
  const sign = millimes < 0 ? '-' : ''
  const absolute = Math.abs(millimes)
  return `${sign}${Math.floor(absolute / 1000).toLocaleString('en-IQ')} IQD`
}
