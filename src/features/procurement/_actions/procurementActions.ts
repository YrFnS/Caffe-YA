'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor } from '../_services/vendorService'
import {
  getAllPurchases, getPurchaseById, getPurchaseItems,
  createPurchase, markPurchasePaid, deletePurchase,
} from '../_services/purchaseService'
import { getAllGoodsReceipts, getGoodsReceiptById, receivePurchase } from '../_services/goodsReceiptService'
import { revalidatePath } from 'next/cache'
import { fromCents, multiplyDecimalMoney, toCents } from '@/lib/currency'

// ─── Vendor Actions ─────────────────────────────────────────────────────────

export async function getVendorsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getAllVendors()
}

export async function getVendorAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getVendorById(id)
}

export async function createVendorAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.create_po')

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string | null
  const address = formData.get('address') as string | null
  if (!name) return { error: 'INVALID_INPUT' }

  try {
    const vendor = await createVendor({ name, phone: phone || null, address: address || null })
    revalidatePath('/procurement/vendors')
    return { success: true, vendor }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'CREATE_VENDOR_FAILED' }
  }
}

export async function updateVendorAction(vendorId: string, formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.create_po')

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string | null
  const address = formData.get('address') as string | null
  const isActive = formData.get('isActive') === 'true'

  try {
    const vendor = await updateVendor(vendorId, {
      name, phone: phone || null, address: address || null, isActive,
    })
    revalidatePath('/procurement/vendors')
    return { success: true, vendor }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'UPDATE_VENDOR_FAILED' }
  }
}

export async function deleteVendorAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.delete_po')
  try {
    await deleteVendor(id)
    revalidatePath('/procurement/vendors')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'DELETE_VENDOR_FAILED' }
  }
}

// ─── Purchase Actions ────────────────────────────────────────────────────────

export async function getPurchasesAction(filters?: {
  vendorId?: string
  isPaid?: boolean
}) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getAllPurchases(filters)
}

export async function getPurchaseAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getPurchaseById(id)
}

export async function getPurchaseItemsAction(purchaseId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getPurchaseItems(purchaseId)
}

export async function createPurchaseAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.create_po')

  const vendorId = formData.get('vendorId') as string | null
  const isPaid = formData.get('isPaid') === 'true'
  const note = formData.get('note') as string | null
  const itemsJson = formData.get('items') as string

  let items: Array<{
    ingredientId?: string | null
    productId?: string | null
    quantity: string
    unitCost: string
    totalCost: string
  }>
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { error: 'INVALID_ITEMS' }
  }

  if (!items.length) return { error: 'NO_ITEMS' }
  try {
    items = items.map(item => {
      if (Boolean(item.ingredientId) === Boolean(item.productId)) throw new Error('INVALID_ITEM_TARGET')
      if (toCents(item.quantity) <= 0 || toCents(item.unitCost) < 0) throw new Error('INVALID_ITEM_AMOUNT')
      return { ...item, totalCost: multiplyDecimalMoney(item.unitCost, item.quantity) }
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'INVALID_ITEMS' }
  }
  const totalAmount = fromCents(items.reduce((sum, item) => sum + toCents(item.totalCost), 0))

  try {
    const result = await createPurchase({
      vendorId: vendorId || null,
      totalAmount,
      isPaid,
      note: note || null,
      createdBy: session.user.id,
      items,
    })
    revalidatePath('/procurement/purchases')
    return { success: true, id: result.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'CREATE_PURCHASE_FAILED' }
  }
}

export async function markPurchasePaidAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.approve_invoice')
  try {
    await markPurchasePaid(id)
    revalidatePath('/procurement/purchases')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'MARK_PAID_FAILED' }
  }
}

export async function deletePurchaseAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.delete_po')
  try {
    await deletePurchase(id)
    revalidatePath('/procurement/purchases')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'DELETE_PURCHASE_FAILED' }
  }
}

// ─── Goods Receipt Actions ────────────────────────────────────────────────────

export async function getGoodsReceiptsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getAllGoodsReceipts()
}

export async function getGoodsReceiptAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.view')
  return getGoodsReceiptById(id)
}

export async function receivePurchaseAction(purchaseId: string, note?: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'procurement.receive_goods')
  try {
    const receipt = await receivePurchase(purchaseId, session.user.id, note)
    revalidatePath('/procurement/purchases')
    return { success: true, receipt }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'RECEIVE_PURCHASE_FAILED' }
  }
}
