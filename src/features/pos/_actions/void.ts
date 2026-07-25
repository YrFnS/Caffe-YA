"use server"

import { voidOrder, voidOrderItem, refundOrder } from '../_services/voidService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import { getActiveShift } from '../_services/orderService'

const voidErrors = new Set([
  'ITEM_NOT_FOUND', 'ORDER_NOT_OPEN', 'ORDER_NOT_REFUNDABLE', 'ORDER_ALREADY_REFUNDED',
  'PAYMENT_NOT_FOUND', 'INGREDIENT_NOT_FOUND', 'PRODUCT_NOT_FOUND', 'ACCOUNTING_NOT_CONFIGURED',
])
const safeError = (error: unknown, fallback: string) =>
  error instanceof Error && voidErrors.has(error.message) ? error.message : fallback

export async function voidItem(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.void_item')

  const itemId = formData.get('itemId') as string
  const reason = formData.get('reason') as string

  if (!itemId || !reason?.trim()) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await voidOrderItem(itemId, session.user.id, reason.trim())
    return { success: true }
  } catch (error) {
    console.error('Void failed:', error)
    return { error: safeError(error, 'VOID_FAILED') }
  }
}

export async function voidOrderAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.void_order')

  const orderId = formData.get('orderId') as string
  const reason = formData.get('reason') as string

  if (!orderId || !reason?.trim()) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await voidOrder(orderId, session.user.id, reason.trim())
    return { success: true }
  } catch (error) {
    return { error: safeError(error, 'VOID_FAILED') }
  }
}

export async function refundOrderAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.refund')

  const orderId = formData.get('orderId') as string
  const reason = formData.get('reason') as string
  if (!orderId || !reason?.trim()) return { error: 'MISSING_FIELDS' }

  try {
    const shift = await getActiveShift(session.user.id)
    if (!shift) return { error: 'ACTIVE_SHIFT_REQUIRED' }
    await refundOrder(orderId, session.user.id, reason.trim(), shift.id)
    return { success: true }
  } catch (error) {
    return { error: safeError(error, 'REFUND_FAILED') }
  }
}
