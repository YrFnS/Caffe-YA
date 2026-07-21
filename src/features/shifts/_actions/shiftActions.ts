'use server'

import { openShift, closeShift } from '../_services/shiftService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { hasPermission, requirePermission } from '@/features/admin/_actions/adminActions'
import { toCents } from '@/lib/currency'

export async function openShiftAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'shifts.open')

  const openingFloat = formData.get('openingFloat') as string
  try {
    if (!openingFloat || toCents(openingFloat) < 0) throw new Error('INVALID_FLOAT')
  } catch {
    return { error: 'INVALID_FLOAT' }
  }

  try {
    const shift = await openShift(session.user.id as string, openingFloat)
    revalidatePath('/shifts')
    revalidatePath('/pos')
    return { success: true, shiftId: shift.id }
  } catch (e) {
    if (e instanceof Error && e.message === 'SHIFT_ALREADY_OPEN') {
      return { error: 'SHIFT_ALREADY_OPEN' }
    }
    return { error: 'OPEN_SHIFT_FAILED' }
  }
}

export async function closeShiftAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'shifts.close')

  const shiftId = formData.get('shiftId') as string
  const countedCash = formData.get('countedCash') as string
  const notes = formData.get('notes') as string | undefined

  try {
    if (!shiftId || !countedCash || toCents(countedCash) < 0) throw new Error('INVALID_INPUT')
  } catch {
    return { error: 'INVALID_INPUT' }
  }

  try {
    const canApprove = await hasPermission(session.user.id, 'shifts.approve')
    await closeShift(shiftId, session.user.id, countedCash, canApprove ? session.user.id : undefined, notes)
    revalidatePath('/shifts')
    revalidatePath('/pos')
    return { success: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'ACTIVE_RESOURCES') {
      return { error: 'ACTIVE_RESOURCES' }
    }
    if (e instanceof Error && e.message === 'SHIFT_NOT_FOUND') {
      return { error: 'SHIFT_NOT_FOUND' }
    }
    if (e instanceof Error && e.message === 'APPROVAL_REQUIRED') {
      return { error: 'APPROVAL_REQUIRED' }
    }
    return { error: 'CLOSE_SHIFT_FAILED' }
  }
}
