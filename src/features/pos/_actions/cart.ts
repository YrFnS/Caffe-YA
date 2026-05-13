"use server"

import { addItemToOrder, removeItemFromOrder, updateItemQuantity, clearOrder } from '../_services/orderService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/features/admin/_actions/adminActions'

export async function addItemAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.modify_order')

  const orderId = formData.get('orderId') as string
  const productId = formData.get('productId') as string
  const quantity = parseInt(formData.get('quantity') as string, 10)
  const unitPrice = formData.get('unitPrice') as string

  if (!orderId || !productId || isNaN(quantity) || !unitPrice) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    const item = await addItemToOrder(orderId, productId, quantity, unitPrice)
    return { success: true, item }
  } catch (error) {
    console.error('Add item failed:', error)
    return { error: 'ADD_ITEM_FAILED' }
  }
}

export async function removeItemAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.modify_order')

  const itemId = formData.get('itemId') as string

  if (!itemId) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await removeItemFromOrder(itemId)
    return { success: true }
  } catch (error) {
    console.error('Remove item failed:', error)
    return { error: 'REMOVE_ITEM_FAILED' }
  }
}

export async function updateQuantityAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.modify_order')

  const itemId = formData.get('itemId') as string
  const quantity = parseInt(formData.get('quantity') as string, 10)

  if (!itemId || isNaN(quantity)) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await updateItemQuantity(itemId, quantity)
    return { success: true }
  } catch (error) {
    console.error('Update quantity failed:', error)
    return { error: 'UPDATE_QUANTITY_FAILED' }
  }
}

export async function clearOrderAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'pos.modify_order')

  const orderId = formData.get('orderId') as string

  if (!orderId) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await clearOrder(orderId)
    return { success: true }
  } catch (error) {
    console.error('Clear order failed:', error)
    return { error: 'CLEAR_ORDER_FAILED' }
  }
}