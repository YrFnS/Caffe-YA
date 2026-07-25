import { db } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { auditLogs, chartOfAccounts, goodsReceipts, journalEntries, journalEntryLines, purchases, purchaseItems, ingredients, products } from '@/lib/schema'
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
  const receipts = await db.select().from(goodsReceipts)
  const receiptMap = new Map(receipts.map(receipt => [receipt.purchaseId, receipt]))

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

  const purchaseIds = filtered.map(purchase => purchase.id)
  const allItems = purchaseIds.length
    ? await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds))
    : []
  const ingredientIds = allItems.map(item => item.ingredientId).filter(Boolean) as string[]
  const productIds = allItems.map(item => item.productId).filter(Boolean) as string[]
  const [ingredientRows, productRows] = await Promise.all([
    ingredientIds.length ? db.select().from(ingredients).where(inArray(ingredients.id, ingredientIds)) : [],
    productIds.length ? db.select().from(products).where(inArray(products.id, productIds)) : [],
  ])
  const ingredientNames = new Map(ingredientRows.map(item => [item.id, item.name]))
  const productNames = new Map(productRows.map(item => [item.id, item.name]))
  const itemsByPurchase = new Map<string, PurchaseItemRow[]>()
  for (const item of allItems) {
    const rows = itemsByPurchase.get(item.purchaseId) ?? []
    rows.push({
      ...item,
      ingredientName: item.ingredientId ? ingredientNames.get(item.ingredientId) ?? null : null,
      productName: item.productId ? productNames.get(item.productId) ?? null : null,
    })
    itemsByPurchase.set(item.purchaseId, rows)
  }

  return filtered.map(r => {
    const receipt = receiptMap.get(r.id)
    return {
      ...r,
      vendorName: r.vendor?.name ?? null,
      creatorName: null,
      receivedAt: receipt?.receivedAt ?? null,
      receiptId: receipt?.id ?? null,
      receiptNote: receipt?.note ?? null,
      items: itemsByPurchase.get(r.id) ?? [],
    }
  })
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
    ? await db.query.ingredients.findMany({ where: inArray(ingredients.id, ingredientIds) })
    : []
  const productRows = productIds.length
    ? await db.query.products.findMany({ where: inArray(products.id, productIds) })
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

export async function markPurchasePaid(id: string, userId: string): Promise<void> {
  await db.transaction(async tx => {
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, id)).for('update')
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
    if (purchase.isPaid) return
    const receipt = await tx.query.goodsReceipts.findFirst({ where: eq(goodsReceipts.purchaseId, id) })
    if (!receipt) throw new Error('RECEIVE_BEFORE_PAYMENT')
    const [payable] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '2001')).limit(1)
    const [cash] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1001')).limit(1)
    if (!payable || !cash) throw new Error('ACCOUNTING_NOT_CONFIGURED')
    const [journal] = await tx.insert(journalEntries).values({
      reference: `PAYMENT-${purchase.id.slice(0, 8)}`, description: 'Purchase payment',
      sourceType: 'purchase_payment', sourceId: purchase.id, createdBy: userId,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: payable.id, type: 'debit', amount: purchase.totalAmount },
      { journalEntryId: journal.id, accountId: cash.id, type: 'credit', amount: purchase.totalAmount },
    ])
    await tx.update(purchases).set({ isPaid: true, paidAt: new Date() }).where(eq(purchases.id, id))
    await tx.insert(auditLogs).values({
      userId, action: 'PAY_PURCHASE', targetTable: 'purchases', targetId: id,
      oldValue: { isPaid: false }, newValue: { isPaid: true },
    })
  })
}

export async function deletePurchase(id: string): Promise<void> {
  await db.transaction(async tx => {
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, id)).for('update')
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
    const receipt = await tx.query.goodsReceipts.findFirst({ where: eq(goodsReceipts.purchaseId, id) })
    const posting = await tx.query.journalEntries.findFirst({ where: eq(journalEntries.sourceId, id) })
    if (receipt || posting || purchase.isPaid) throw new Error('PURCHASE_CANNOT_BE_DELETED')
    await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
    await tx.delete(purchases).where(eq(purchases.id, id))
  })
}

export async function getUnpaidPurchases(): Promise<PurchaseRow[]> {
  const rows = await db.query.purchases.findMany({
    where: eq(purchases.isPaid, false),
    with: { vendor: { columns: { name: true } } },
  })
  return rows.map(r => ({ ...r, vendorName: r.vendor?.name ?? null, creatorName: null }))
}
