"use server"

import { checkoutOrder } from '../_services/orderService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/schema'
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
    const userId = session.user.id as string
    await checkoutOrder(orderId, paymentMethod, amount, reference || undefined, userId)

    after(async () => {
      try {
        await db.insert(auditLogs).values({
          userId,
          action: 'CHECKOUT_ORDER',
          targetTable: 'orders',
          targetId: orderId,
          oldValue: { status: 'draft' },
          newValue: { status: 'closed', paymentMethod, amount, reference },
        })
      } catch (e) {
        console.error('Audit log failed:', e)
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Checkout failed:', error)
    return { error: 'CHECKOUT_FAILED' }
  }
}