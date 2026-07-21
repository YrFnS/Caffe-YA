import { db } from '@/lib/db'
import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { auditLogs, expenses, orders, shifts, transactions } from '@/lib/schema'
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

  return db.transaction(async tx => {
    const [shift] = await tx.insert(shifts).values({ cashierId: userId, openingFloat, status: 'open' }).returning()
    await tx.insert(auditLogs).values({ userId, action: 'OPEN_SHIFT', targetTable: 'shifts', targetId: shift.id, newValue: { openingFloat } })
    return { id: shift.id }
  })
}

// Close a shift with blind count
export async function closeShift(
  shiftId: string,
  _userId: string,
  countedCash: string,
  approvedBy?: string,
  notes?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [shift] = await tx.select().from(shifts).where(eq(shifts.id, shiftId)).for('update')
    if (!shift) throw new Error('SHIFT_NOT_FOUND')
    if (shift.status !== 'open') throw new Error('SHIFT_ALREADY_CLOSED')

    const active = await tx.select({ id: orders.id }).from(orders).where(and(
      eq(orders.shiftId, shiftId),
      inArray(orders.status, ['draft', 'open']),
      isNotNull(orders.timerStartedAt),
      isNull(orders.timerEndedAt),
    )).limit(1)
    if (active.length) throw new Error('ACTIVE_RESOURCES')

    const shiftTransactions = await tx.select().from(transactions).where(and(
      eq(transactions.shiftId, shiftId),
      eq(transactions.paymentMethod, 'cash'),
    ))
    const shiftExpenses = await tx.select().from(expenses).where(eq(expenses.shiftId, shiftId))
    const sales = shiftTransactions.reduce(
      (sum, transaction) => sum + (transaction.isRefund ? -toCents(transaction.amount) : toCents(transaction.amount)),
      0,
    )
    const expenseTotal = shiftExpenses.reduce((sum, expense) => sum + toCents(expense.amount), 0)
    const expected = toCents(shift.openingFloat) + sales - expenseTotal
    const variance = toCents(countedCash) - expected
    if (variance !== 0 && !approvedBy) throw new Error('APPROVAL_REQUIRED')

    await tx.update(shifts).set({
      status: 'closed',
      closedAt: new Date(),
      closingCountedCash: countedCash,
      closingExpectedCash: fromCents(expected),
      cashVariance: fromCents(variance),
      approvedBy: approvedBy ?? null,
      notes: notes ?? null,
    }).where(and(eq(shifts.id, shiftId), eq(shifts.status, 'open')))
    await tx.insert(auditLogs).values({
      userId: _userId,
      action: 'CLOSE_SHIFT',
      targetTable: 'shifts',
      targetId: shiftId,
      newValue: { countedCash, expected: fromCents(expected), variance: fromCents(variance), approvedBy: approvedBy ?? null },
    })
  })
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
  const total = txs.reduce((sum, tx) => sum + toCents(tx.amount), 0)
  return fromCents(total)
}

// Calculate total cash expenses for a shift
export async function getCashExpenses(shiftId: string): Promise<string> {
  const exps = await db.query.expenses.findMany({
    where: eq(expenses.shiftId, shiftId),
  })
  const total = exps.reduce((sum, e) => sum + toCents(e.amount), 0)
  return fromCents(total)
}

// Get orders with running timers for a shift
export async function getActiveResources(
  shiftId: string,
): Promise<Array<{ id: string; name: string; orderId: string }>> {
  const activeOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.shiftId, shiftId),
      inArray(orders.status, ['draft', 'open']),
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
