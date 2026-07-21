'use server'

import {
  getAllPayrollEntries,
  getPayrollEntryById,
  createPayrollEntry,
  updatePayrollEntry,
  markPayrollPaid,
  deletePayrollEntry,
} from '../_services/payrollService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import { fromCents, toCents } from '@/lib/currency'

export async function getPayrollEntriesAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'payroll.view')
  return getAllPayrollEntries()
}

export async function getPayrollEntryAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'payroll.view')
  return getPayrollEntryById(id)
}

export async function createPayrollEntryAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'payroll.manage')

  const employeeId = formData.get('employeeId') as string
  const periodStart = formData.get('periodStart') as string
  const periodEnd = formData.get('periodEnd') as string
  const baseSalary = formData.get('baseSalary') as string
  const bonuses = formData.get('bonuses') as string
  const deductions = formData.get('deductions') as string
  const note = formData.get('note') as string | null

  if (!employeeId || !periodStart || !periodEnd || !baseSalary) {
    return { error: 'INVALID_INPUT' }
  }

  const netAmount = fromCents(toCents(baseSalary) + toCents(bonuses || '0') - toCents(deductions || '0'))

  try {
    await createPayrollEntry({
      employeeId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      baseSalary,
      bonuses: bonuses || '0',
      deductions: deductions || '0',
      netAmount,
      note: note || undefined,
      createdBy: session.user.id,
    })
    revalidatePath('/payroll')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'CREATE_PAYROLL_FAILED' }
  }
}

export async function updatePayrollEntryAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'payroll.manage')

  const entryId = formData.get('id') as string
  if (!entryId) return { error: 'INVALID_INPUT' }

  const employeeId = formData.get('employeeId') as string | null
  const periodStart = formData.get('periodStart') as string | null
  const periodEnd = formData.get('periodEnd') as string | null
  const baseSalary = formData.get('baseSalary') as string | null
  const bonuses = formData.get('bonuses') as string | null
  const deductions = formData.get('deductions') as string | null
  const note = formData.get('note') as string | null

  const data: Parameters<typeof updatePayrollEntry>[1] = {}
  if (employeeId) data.employeeId = employeeId
  if (periodStart) data.periodStart = new Date(periodStart)
  if (periodEnd) data.periodEnd = new Date(periodEnd)
  if (baseSalary) data.baseSalary = baseSalary
  if (bonuses !== null) data.bonuses = bonuses || null
  if (deductions !== null) data.deductions = deductions || null
  if (note !== null) data.note = note || null

  if (baseSalary) {
    const netAmount = fromCents(toCents(baseSalary) + toCents(bonuses || '0') - toCents(deductions || '0'))
    data.netAmount = netAmount
  }

  try {
    await updatePayrollEntry(entryId, data)
    revalidatePath('/payroll')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'UPDATE_PAYROLL_FAILED' }
  }
}

export async function markPayrollPaidAction(entryId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'payroll.manage')

  if (!entryId) return { error: 'INVALID_INPUT' }

  try {
    await markPayrollPaid(entryId, session.user.id)
    revalidatePath('/payroll')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'MARK_PAID_FAILED' }
  }
}

export async function deletePayrollEntryAction(entryId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'payroll.manage')

  if (!entryId) return { error: 'INVALID_INPUT' }

  try {
    await deletePayrollEntry(entryId)
    revalidatePath('/payroll')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'DELETE_PAYROLL_FAILED' }
  }
}
