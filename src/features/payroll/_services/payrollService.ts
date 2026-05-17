import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { payrollEntries } from '@/lib/schema'

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

export async function markPayrollPaid(id: string): Promise<PayrollEntryRecord> {
  const [entry] = await db.update(payrollEntries).set({
    isPaid: true,
    paidAt: new Date(),
  }).where(eq(payrollEntries.id, id)).returning()
  if (!entry) throw new Error('NOT_FOUND')
  return entry
}

export async function deletePayrollEntry(id: string): Promise<void> {
  await db.delete(payrollEntries).where(eq(payrollEntries.id, id))
}
