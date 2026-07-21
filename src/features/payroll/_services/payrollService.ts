import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { auditLogs, chartOfAccounts, journalEntries, journalEntryLines, payrollEntries } from '@/lib/schema'

export interface PayrollEntryRecord {
  id: string
  employeeId: string
  periodStart: Date
  periodEnd: Date
  baseSalary: string
  bonuses: string | null
  deductions: string | null
  netAmount: string
  isPaid: boolean
  paidAt: Date | null
  note: string | null
  createdBy: string | null
  createdAt: Date
}

export async function getAllPayrollEntries(): Promise<PayrollEntryRecord[]> {
  return db.query.payrollEntries.findMany({
    orderBy: [desc(payrollEntries.periodEnd)],
  })
}

export async function getPayrollEntryById(id: string): Promise<PayrollEntryRecord | null> {
  const result = await db.query.payrollEntries.findFirst({
    where: eq(payrollEntries.id, id),
  })
  return result ?? null
}

export async function createPayrollEntry(data: {
  employeeId: string
  periodStart: Date
  periodEnd: Date
  baseSalary: string
  bonuses?: string
  deductions?: string
  netAmount: string
  note?: string
  createdBy?: string
}): Promise<PayrollEntryRecord> {
  const [entry] = await db.insert(payrollEntries).values({
    employeeId: data.employeeId,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    baseSalary: data.baseSalary,
    bonuses: data.bonuses ?? '0',
    deductions: data.deductions ?? '0',
    netAmount: data.netAmount,
    note: data.note ?? null,
    createdBy: data.createdBy ?? null,
  }).returning()
  if (!entry) throw new Error('CREATE_FAILED')
  return entry
}

export async function updatePayrollEntry(
  id: string,
  data: {
    employeeId?: string
    periodStart?: Date
    periodEnd?: Date
    baseSalary?: string
    bonuses?: string | null
    deductions?: string | null
    netAmount?: string
    note?: string | null
  },
): Promise<PayrollEntryRecord> {
  const [entry] = await db.update(payrollEntries).set(data).where(eq(payrollEntries.id, id)).returning()
  if (!entry) throw new Error('NOT_FOUND')
  return entry
}

export async function markPayrollPaid(id: string, userId: string): Promise<PayrollEntryRecord> {
  return db.transaction(async tx => {
    const [payroll] = await tx.select().from(payrollEntries).where(eq(payrollEntries.id, id)).for('update')
    if (!payroll) throw new Error('NOT_FOUND')
    if (payroll.isPaid) throw new Error('ALREADY_PAID')
    const [expenseAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '6201')).limit(1)
    const [cashAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1001')).limit(1)
    if (!expenseAccount || !cashAccount) throw new Error('ACCOUNTING_NOT_CONFIGURED')
    const [entry] = await tx.update(payrollEntries).set({ isPaid: true, paidAt: new Date() }).where(eq(payrollEntries.id, id)).returning()
    const [journal] = await tx.insert(journalEntries).values({
      reference: `PAYROLL-${entry.id.slice(0, 8)}`,
      description: 'Payroll payment',
      sourceType: 'payroll',
      sourceId: entry.id,
      createdBy: userId,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: expenseAccount.id, type: 'debit', amount: entry.netAmount },
      { journalEntryId: journal.id, accountId: cashAccount.id, type: 'credit', amount: entry.netAmount },
    ])
    await tx.insert(auditLogs).values({ userId, action: 'PAY_PAYROLL', targetTable: 'payroll_entries', targetId: entry.id, newValue: { amount: entry.netAmount } })
    return entry
  })
}

export async function deletePayrollEntry(id: string): Promise<void> {
  const entry = await db.query.payrollEntries.findFirst({ where: eq(payrollEntries.id, id) })
  if (entry?.isPaid) throw new Error('PAID_PAYROLL_CANNOT_BE_DELETED')
  await db.delete(payrollEntries).where(eq(payrollEntries.id, id))
}
