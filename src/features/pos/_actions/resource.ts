'use server'

import { requirePermission } from '@/features/admin/_actions/adminActions'
import { getSession } from '@/lib/auth'
import { assignResourceToOrder, stopTimer, transferOrder } from '../_services/resourceService'

async function authorize() {
  const session = await getSession()
  if (!session?.user) throw new Error('UNAUTHORIZED')
  await requirePermission(session.user.id, 'pos.checkout')
  return session.user.id
}

export async function assignResourceAction(orderId: string, resourceId: string) {
  const userId = await authorize()
  return assignResourceToOrder(resourceId, orderId, userId)
}

export async function stopTimerAction(orderId: string) {
  const userId = await authorize()
  return stopTimer(orderId, userId)
}

export async function transferOrderAction(orderId: string, resourceId: string) {
  const userId = await authorize()
  return transferOrder(orderId, resourceId, userId)
}
