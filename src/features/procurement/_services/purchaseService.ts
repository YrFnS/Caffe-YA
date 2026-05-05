import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { purchases, purchaseItems, vendors, ingredients, products } from '@/lib/schema'
import type { PurchaseRow, PurchaseItemRow } from '../_types'

export async function getAllPurchases(filters?: {
  vendorId?: string
  isPaid?: boolean
  fromDate?: Date
  toDate?: Date
}): Promise<PurchaseRow[]> {
  const rows = await db.query.purchases.findMany({
    with: { vendor: { columns: { name: true } } },
  })

  let filtered = rows
  if (filters?.vendorId) {
    filtered = filtered.filter(r => r.vendorId === filters.vendorId)
  }
  if (filters?.isPaid !== undefined) {
    filtered = filtered.filter(r => r.isPaid === filters.isPaid)
  }
  if (filters?.fromDate) {
    filtered = filtered.filter(r => r.createdAt >= filters.fromDate!)
  }
  if (filters?.toDate) {
    filtered = filtered.filter(r => r.createdAt <= filters.toDate!)
  }

  return filtered.map(r => ({
    ...r,
    vendorName: r.vendor?.name ?? null,
    creatorName: null,
  }))
}

export async function getPurchaseById(id: string): Promise<PurchaseRow | null> {
  const row = await db.query.purchases.findFirst({
    where: eq(purchases.id, id),
    with: { vendor: { columns: { name: true } } },
  })
  if (!row) return null
  return { ...row, vendorName: row.vendor?.name ?? null, creatorName: null }
}

export async function getPurchaseItems(purchaseId: string): Promise<PurchaseItemRow[]> {
  const items = await db.query.purchaseItems.findMany({
    where: eq(purchaseItems.purchaseId, purchaseId),
  })

  // Fetch ingredient and product names separately
  const ingredientIds = items.map(i => i.ingredientId).filter(Boolean) as string[]
  const productIds = items.map(i => i.productId).filter(Boolean) as string[]

  const ingredientRows = ingredientIds.length
    ? await db.query.ingredients.findMany({ where: eq(ingredients.id, ingredientIds[0]) })
    : []
  const productRows = productIds.length
    ? await db.query.products.findMany({ where: eq(products.id, productIds[0]) })
    : []

  const ingredientMap = new Map(ingredientRows.map(i => [i.id, i.name]))
  const productMap = new Map(productRows.map(p => [p.id, p.name]))

  return items.map(item => ({
    ...item,
    ingredientName: item.ingredientId ? (ingredientMap.get(item.ingredientId) ?? null) : null,
    productName: item.productId ? (productMap.get(item.productId) ?? null) : null,
  }))
}

export async function createPurchase(data: {
  vendorId?: string | null
  totalAmount: string
  isPaid?: boolean
  note?: string | null
  receiptImageName?: string | null
  createdBy?: string
  items: Array<{
    ingredientId?: string | null
    productId?: string | null
    quantity: string
    unitCost: string
    totalCost: string
  }>
}): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [purchase] = await tx.insert(purchases).values({
      vendorId: data.vendorId ?? null,
      totalAmount: data.totalAmount,
      isPaid: data.isPaid ?? false,
      note: data.note ?? null,
      receiptImageName: data.receiptImageName ?? null,
      createdBy: data.createdBy ?? null,
    }).returning()

    for (const item of data.items) {
      await tx.insert(purchaseItems).values({
        purchaseId: purchase.id,
        ingredientId: item.ingredientId ?? null,
        productId: item.productId ?? null,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
      })
    }

    return { id: purchase.id }
  })
}

export async function markPurchasePaid(id: string): Promise<void> {
  await db.update(purchases)
    .set({ isPaid: true, paidAt: new Date() })
    .where(eq(purchases.id, id))
}

export async function deletePurchase(id: string): Promise<void> {
  await db.delete(purchases).where(eq(purchases.id, id))
}

export async function getUnpaidPurchases(): Promise<PurchaseRow[]> {
  const rows = await db.query.purchases.findMany({
    where: eq(purchases.isPaid, false),
    with: { vendor: { columns: { name: true } } },
  })
  return rows.map(r => ({ ...r, vendorName: r.vendor?.name ?? null, creatorName: null }))
}