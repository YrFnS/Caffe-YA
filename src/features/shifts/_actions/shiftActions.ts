'use server'

import { openShift, closeShift } from '../_services/shiftService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { hasPermission, requirePermission } from '@/features/admin/_actions/adminActions'
import { getSetting } from '@/features/admin/_services/settingsService'
import { toCents } from '@/lib/currency'

function normalizeApprovalThreshold(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '0'
  const threshold = String(value)
  try {
    return toCents(threshold) >= 0 ? threshold : '0'
  } catch {
    return '0'
  }
}

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
  } catch (error) {
    if (error instanceof Error && error.message === 'SHIFT_ALREADY_OPEN') {
      return { error: 'SHIFT_ALREADY_OPEN' }
    }
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return { error: 'USER_NOT_FOUND' }
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
    const [canApprove, canCloseOthers, thresholdSetting] = await Promise.all([
      hasPermission(session.user.id, 'shifts.approve'),
      hasPermission(session.user.id, 'shifts.close_others'),
      getSetting('shift_variance_approval_threshold'),
    ])

    await closeShift(shiftId, session.user.id, countedCash, {
      approvedBy: canApprove ? session.user.id : undefined,
      notes,
      canCloseOthers,
      approvalThreshold: normalizeApprovalThreshold(thresholdSetting),
    })

    revalidatePath('/shifts')
    revalidatePath('/pos')
    return { success: true }
  } catch (error) {
    const knownErrors = new Set([
      'ACTIVE_RESOURCES',
      'SHIFT_NOT_FOUND',
      'SHIFT_ALREADY_CLOSED',
      'SHIFT_NOT_OWNED',
      'APPROVAL_REQUIRED',
    ])
    if (error instanceof Error && knownErrors.has(error.message)) {
      return { error: error.message }
    }
    return { error: 'CLOSE_SHIFT_FAILED' }
  }
}
