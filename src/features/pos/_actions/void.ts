"use server"

import { voidOrderItem, refundTransaction } from '../_services/voidService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function voidItem(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const itemId = formData.get('itemId') as string
  const reason = formData.get('reason') as string

  if (!itemId || !reason) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await voidOrderItem(itemId, session.user.id as string, reason)
    return { success: true }
  } catch (error) {
    console.error('Void failed:', error)
    return { error: 'VOID_FAILED' }
  }
}

export async function refundTx(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const transactionId = formData.get('transactionId') as string
  const reason = formData.get('reason') as string

  if (!transactionId || !reason) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await refundTransaction(transactionId, session.user.id as string, reason)
    return { success: true }
  } catch (error) {
    console.error('Refund failed:', error)
    return { error: 'REFUND_FAILED' }
  }
}