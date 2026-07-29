'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import { getSession } from '@/lib/auth'
import { getActiveShift, getOrCreateDraftOrder } from './orderService'
import { assignResourceToOrder, stopTimer, transferOrder } from '../_services/resourceService'

const RESOURCE_ERRORS = new Set([
  'RESOURCE_NOT_AVAILABLE',
  'NEW_RESOURCE_NOT_AVAILABLE',
  'ORDER_NOT_OPEN',
  'ORDER_ALREADY_HAS_RESOURCE',
  'RESOURCE_ALREADY_ASSIGNED',
  'SHIFT_NOT_OPEN',
])

async function authorize() {
  const session = await getSession()
  if (!session?.user) throw new Error('UNAUTHORIZED')
  await requirePermission(session.user.id, 'pos.checkout')
  return session.user.id
}

function refreshResourceViews() {
  revalidatePath('/pos')
  revalidatePath('/resources')
  revalidatePath('/dashboard')
}

export async function assignResourceAction(orderId: string, resourceId: string) {
  const userId = await authorize()
  const result = await assignResourceToOrder(resourceId, orderId, userId)
  refreshResourceViews()
  return result
}

export async function assignAvailableResourceAction(resourceId: string) {
  try {
    const userId = await authorize()
    const shift = await getActiveShift(userId)
    if (!shift) return { error: 'ACTIVE_SHIFT_REQUIRED' }

    const order = await getOrCreateDraftOrder(shift.id, userId)
    const result = await assignResourceToOrder(resourceId, order.id, userId)
    refreshResourceViews()
    return {
      success: true as const,
      orderId: order.id,
      timerStartedAt: result.timerStartedAt,
    }
  } catch (error) {
    console.error('Assign resource failed:', error)
    return {
      error: error instanceof Error && RESOURCE_ERRORS.has(error.message)
        ? error.message
        : 'ASSIGN_RESOURCE_FAILED',
    }
  }
}

export async function stopTimerAction(orderId: string) {
  const userId = await authorize()
  const result = await stopTimer(orderId, userId)
  refreshResourceViews()
  return result
}

export async function transferOrderAction(orderId: string, resourceId: string) {
  const userId = await authorize()
  const result = await transferOrder(orderId, resourceId, userId)
  refreshResourceViews()
  return result
}
