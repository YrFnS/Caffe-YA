'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import {
  getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor,
} from '../_services/vendorService'
import {
  getAllPurchases, getPurchaseById, getPurchaseItems,
  createPurchase, markPurchasePaid, deletePurchase, getUnpaidPurchases,
} from '../_services/purchaseService'
import {
  getAllGoodsReceipts, getGoodsReceiptById,
} from '../_services/goodsReceiptService'
import { revalidatePath } from 'next/cache'

// ─── Vendor Actions ─────────────────────────────────────────────────────────

export async function getVendorsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllVendors()
}

export async function getVendorAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getVendorById(id)
}

export async function createVendorAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

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
  return getAllPurchases(filters)
}

export async function getPurchaseAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getPurchaseById(id)
}

export async function getPurchaseItemsAction(purchaseId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getPurchaseItems(purchaseId)
}

export async function createPurchaseAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

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

  const totalAmount = items.reduce((sum, i) => sum + Number(i.totalCost), 0).toFixed(3)

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
  return getAllGoodsReceipts()
}

// ─── Goods Receipt Actions ────────────────────────────────────────────────────

// createGoodsReceiptAction and getGoodsReceiptItemsAction are commented out
// because goodsReceipts/goodsReceiptItems tables do not exist in the schema.
// When the tables are added, uncomment and implement these actions.