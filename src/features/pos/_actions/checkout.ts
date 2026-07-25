"use server"

import { checkoutOrder } from '../_services/orderService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import type { PaymentLine } from '../_services/payment'

const checkoutErrors = new Set([
  'PAYMENT_REQUIRED', 'INVALID_PAYMENT', 'REFERENCE_REQUIRED', 'PAYMENT_MISMATCH',
  'ORDER_NOT_FOUND', 'ORDER_NOT_OWNED', 'ORDER_NOT_OPEN', 'TIMER_RUNNING',
  'INSUFFICIENT_STOCK', 'ACCOUNTING_NOT_CONFIGURED',
])

export async function processCheckout(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.checkout')

  const orderId = formData.get('orderId') as string
  const paymentsJson = formData.get('payments') as string
  if (!orderId || !paymentsJson) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    const payments = JSON.parse(paymentsJson) as PaymentLine[]
    await checkoutOrder(orderId, payments, session.user.id)

    return { success: true }
  } catch (error) {
    console.error('Checkout failed:', error)
    return { error: error instanceof Error && checkoutErrors.has(error.message) ? error.message : 'CHECKOUT_FAILED' }
  }
}
