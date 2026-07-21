"use server"

import { checkoutOrder } from '../_services/orderService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/features/admin/_actions/adminActions'

export async function processCheckout(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.checkout')

  const orderId = formData.get('orderId') as string
  const paymentMethod = formData.get('paymentMethod') as string
  const amount = formData.get('amount') as string
  const reference = formData.get('reference') as string | null

  if (!orderId || !paymentMethod || !amount) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await checkoutOrder(orderId, paymentMethod, amount, reference || undefined, session.user.id)

    return { success: true }
  } catch (error) {
    console.error('Checkout failed:', error)
    return { error: 'CHECKOUT_FAILED' }
  }
}
