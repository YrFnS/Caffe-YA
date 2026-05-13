import { db } from '@/lib/db'
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { expenses, orders, shifts, transactions } from '@/lib/schema'
import type { ShiftSummary } from '../_types'
import { toCents, fromCents } from '@/lib/currency'

// Get active shift for a user
export async function getActiveShiftForUser(userId: string): Promise<ShiftSummary | null> {
  const result = await db.query.shifts.findFirst({
    where: and(eq(shifts.cashierId, userId), eq(shifts.status, 'open')),
    with: { cashier: { columns: { name: true } } },
  })
  if (!result) return null
  return {
    ...result,
    cashierName: result.cashier?.name ?? 'Unknown',
  } as ShiftSummary
}

// Get shift by ID with cashier name
export async function getShiftById(shiftId: string): Promise<ShiftSummary | null> {
  const result = await db.query.shifts.findFirst({
    where: eq(shifts.id, shiftId),
    with: { cashier: { columns: { name: true } } },
  })
  if (!result) return null
  return {
    ...result,
    cashierName: result.cashier?.name ?? 'Unknown',
  } as ShiftSummary
}

// Get shift history (last N shifts)
export async function getShiftHistory(limit = 30): Promise<ShiftSummary[]> {
  const results = await db.query.shifts.findMany({
    where: eq(shifts.status, 'closed'),
    orderBy: [desc(shifts.closedAt)],
    limit,
    with: { cashier: { columns: { name: true } } },
  })
  return results.map((r) => ({
    ...r,
    cashierName: r.cashier?.name ?? 'Unknown',
  })) as ShiftSummary[]
}

// Open a new shift
export async function openShift(userId: string, openingFloat: string): Promise<{ id: string }> {
  // Check no existing open shift for this user
  const existing = await getActiveShiftForUser(userId)
  if (existing) throw new Error('SHIFT_ALREADY_OPEN')

  const [shift] = await db.insert(shifts).values({
    cashierId: userId,
    openingFloat,
    status: 'open',
  }).returning()

  return { id: shift.id }
}

// Close a shift with blind count
export async function closeShift(
  shiftId: string,
  _userId: string,
  countedCash: string,
  approvedBy?: string,
  notes?: string,
): Promise<void> {
  // 1. Check for active resources with running timers
  const active = await getActiveResources(shiftId)
  if (active.length > 0) throw new Error('ACTIVE_RESOURCES')

  // 2. Calculate expected cash
  const cashSales = await getCashSales(shiftId)
  const cashExpenses = await getCashExpenses(shiftId)
  const shift = await getShiftById(shiftId)
  if (!shift) throw new Error('SHIFT_NOT_FOUND')

  const expected = toCents(Number(shift.openingFloat) + Number(cashSales) - Number(cashExpenses))
  const variance = toCents(Number(countedCash) - Number(expected))

  await db.update(shifts)
    .set({
      status: 'closed',
      closedAt: new Date(),
      closingCountedCash: countedCash,
      closingExpectedCash: fromCents(expected),
      cashVariance: fromCents(variance),
      approvedBy: approvedBy ?? null,
      notes: notes ?? null,
    })
    .where(eq(shifts.id, shiftId))
}

// Calculate total cash sales for a shift
export async function getCashSales(shiftId: string): Promise<string> {
  const txs = await db.query.transactions.findMany({
    where: and(
      eq(transactions.shiftId, shiftId),
      eq(transactions.paymentMethod, 'cash'),
      eq(transactions.isRefund, false),
    ),
  })
  const total = txs.reduce((sum, tx) => sum + toCents(Number(tx.amount)), 0)
  return fromCents(total)
}

// Calculate total cash expenses for a shift
export async function getCashExpenses(shiftId: string): Promise<string> {
  const exps = await db.query.expenses.findMany({
    where: eq(expenses.shiftId, shiftId),
  })
  const total = exps.reduce((sum, e) => sum + toCents(Number(e.amount)), 0)
  return fromCents(total)
}

// Get orders with running timers for a shift
export async function getActiveResources(
  shiftId: string,
): Promise<Array<{ id: string; name: string; orderId: string }>> {
  const activeOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.shiftId, shiftId),
      eq(orders.status, 'open'),
      isNotNull(orders.timerStartedAt),
      isNull(orders.timerEndedAt),
    ),
    with: { resource: { columns: { id: true, name: true } } },
  })
  return activeOrders
    .filter((o): o is typeof o & { resource: NonNullable<typeof o.resource> } => o.resource != null)
    .map((o) => ({
      id: o.resource.id,
      name: o.resource.name,
      orderId: o.id,
    }))
}
