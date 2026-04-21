'use server'

import { openShift, closeShift } from '../_services/shiftService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function openShiftAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const openingFloat = formData.get('openingFloat') as string
  if (!openingFloat || isNaN(Number(openingFloat))) {
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

  const shiftId = formData.get('shiftId') as string
  const countedCash = formData.get('countedCash') as string
  const approvedBy = formData.get('approvedBy') as string | null
  const notes = formData.get('notes') as string | undefined

  if (!shiftId || !countedCash || isNaN(Number(countedCash))) {
    return { error: 'INVALID_INPUT' }
  }

  try {
    await closeShift(shiftId, session.user.id as string, countedCash, approvedBy ?? undefined, notes)
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
    return { error: 'CLOSE_SHIFT_FAILED' }
  }
}
