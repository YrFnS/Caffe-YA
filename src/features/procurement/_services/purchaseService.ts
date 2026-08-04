import { db } from '@/lib/db'
import { and, desc, eq, inArray } from 'drizzle-orm'
import {
  auditLogs,
  chartOfAccounts,
  goodsReceipts,
  journalEntries,
  journalEntryLines,
  purchases,
  purchaseItems,
  ingredients,
  products,
  users,
} from '@/lib/schema'
import type { PurchaseRow, PurchaseItemRow } from '../_types'

const PURCHASE_PAYMENT_CODES = ['1001', '1010', '1020'] as const

export interface PurchasePaymentAccount {
  code: string
  name: string
  nameAr: string | null
}

export async function getPurchasePaymentAccounts(): Promise<PurchasePaymentAccount[]> {
  return db.select({
    code: chartOfAccounts.code,
    name: chartOfAccounts.name,
    nameAr: chartOfAccounts.nameAr,
  })
    .from(chartOfAccounts)
    .where(and(
      inArray(chartOfAccounts.code, [...PURCHASE_PAYMENT_CODES]),
      eq(chartOfAccounts.isActive, true),
    ))
    .orderBy(chartOfAccounts.code)
}

export async function getAllPurchases(filters?: {
  vendorId?: string
  isPaid?: boolean
  fromDate?: Date
  toDate?: Date
}): Promise<PurchaseRow[]> {
  const rows = await db.query.purchases.findMany({
    with: { vendor: { columns: { name: true } } },
    orderBy: [desc(purchases.createdAt)],
  })
  const receipts = await db.select().from(goodsReceipts)
  const receiptMap = new Map(receipts.map(receipt => [receipt.purchaseId, receipt]))

  let filtered = rows
  if (filters?.vendorId) filtered = filtered.filter(row => row.vendorId === filters.vendorId)
  if (filters?.isPaid !== undefined) filtered = filtered.filter(row => row.isPaid === filters.isPaid)
  if (filters?.fromDate) filtered = filtered.filter(row => row.createdAt >= filters.fromDate!)
  if (filters?.toDate) filtered = filtered.filter(row => row.createdAt <= filters.toDate!)

  const purchaseIds = filtered.map(purchase => purchase.id)
  const allItems = purchaseIds.length
    ? await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds))
    : []
  const ingredientIds = allItems.map(item => item.ingredientId).filter(Boolean) as string[]
  const productIds = allItems.map(item => item.productId).filter(Boolean) as string[]
  const creatorIds = filtered.map(item => item.createdBy).filter(Boolean) as string[]
  const [ingredientRows, productRows, creatorRows] = await Promise.all([
    ingredientIds.length ? db.select().from(ingredients).where(inArray(ingredients.id, ingredientIds)) : [],
    productIds.length ? db.select().from(products).where(inArray(products.id, productIds)) : [],
    creatorIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, creatorIds))
      : [],
  ])
  const ingredientNames = new Map(ingredientRows.map(item => [item.id, item.name]))
  const productNames = new Map(productRows.map(item => [item.id, { name: item.name, nameAr: item.nameAr }]))
  const creatorNames = new Map(creatorRows.map(item => [item.id, item.name]))
  const itemsByPurchase = new Map<string, PurchaseItemRow[]>()
  for (const item of allItems) {
    const itemRows = itemsByPurchase.get(item.purchaseId) ?? []
    const product = item.productId ? productNames.get(item.productId) : undefined
    itemRows.push({
      ...item,
      ingredientName: item.ingredientId ? ingredientNames.get(item.ingredientId) ?? null : null,
      productName: product?.name ?? null,
      productNameAr: product?.nameAr ?? null,
    })
    itemsByPurchase.set(item.purchaseId, itemRows)
  }

  return filtered.map(row => {
    const receipt = receiptMap.get(row.id)
    return {
      ...row,
      vendorName: row.vendor?.name ?? null,
      creatorName: row.createdBy ? creatorNames.get(row.createdBy) ?? null : null,
      receivedAt: receipt?.receivedAt ?? null,
      receiptId: receipt?.id ?? null,
      receiptNote: receipt?.note ?? null,
      items: itemsByPurchase.get(row.id) ?? [],
    }
  })
}

export async function getPurchaseById(id: string): Promise<PurchaseRow | null> {
  const row = await db.query.purchases.findFirst({
    where: eq(purchases.id, id),
    with: { vendor: { columns: { name: true } } },
  })
  if (!row) return null
  const creator = row.createdBy
    ? await db.query.users.findFirst({ where: eq(users.id, row.createdBy), columns: { name: true } })
    : null
  return { ...row, vendorName: row.vendor?.name ?? null, creatorName: creator?.name ?? null }
}

export async function getPurchaseItems(purchaseId: string): Promise<PurchaseItemRow[]> {
  const items = await db.query.purchaseItems.findMany({
    where: eq(purchaseItems.purchaseId, purchaseId),
  })
  const ingredientIds = items.map(item => item.ingredientId).filter(Boolean) as string[]
  const productIds = items.map(item => item.productId).filter(Boolean) as string[]
  const [ingredientRows, productRows] = await Promise.all([
    ingredientIds.length ? db.query.ingredients.findMany({ where: inArray(ingredients.id, ingredientIds) }) : [],
    productIds.length ? db.query.products.findMany({ where: inArray(products.id, productIds) }) : [],
  ])
  const ingredientMap = new Map(ingredientRows.map(item => [item.id, item.name]))
  const productMap = new Map(productRows.map(item => [item.id, { name: item.name, nameAr: item.nameAr }]))

  return items.map(item => {
    const product = item.productId ? productMap.get(item.productId) : undefined
    return {
      ...item,
      ingredientName: item.ingredientId ? ingredientMap.get(item.ingredientId) ?? null : null,
      productName: product?.name ?? null,
      productNameAr: product?.nameAr ?? null,
    }
  })
}

export async function createPurchase(data: {
  vendorId?: string | null
  totalAmount: string
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
  return db.transaction(async tx => {
    const [purchase] = await tx.insert(purchases).values({
      vendorId: data.vendorId ?? null,
      totalAmount: data.totalAmount,
      isPaid: false,
      note: data.note ?? null,
      receiptImageName: data.receiptImageName ?? null,
      createdBy: data.createdBy ?? null,
    }).returning()

    await tx.insert(purchaseItems).values(data.items.map(item => ({
      purchaseId: purchase.id,
      ingredientId: item.ingredientId ?? null,
      productId: item.productId ?? null,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    })))

    await tx.insert(auditLogs).values({
      userId: data.createdBy ?? null,
      action: 'CREATE_PURCHASE',
      targetTable: 'purchases',
      targetId: purchase.id,
      newValue: { totalAmount: data.totalAmount, itemCount: data.items.length },
    })
    return { id: purchase.id }
  })
}

export async function markPurchasePaid(
  id: string,
  userId: string,
  paymentAccountCode: string,
): Promise<void> {
  if (!PURCHASE_PAYMENT_CODES.includes(paymentAccountCode as typeof PURCHASE_PAYMENT_CODES[number])) {
    throw new Error('INVALID_PAYMENT_ACCOUNT')
  }

  await db.transaction(async tx => {
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, id)).for('update')
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
    if (purchase.isPaid) throw new Error('PURCHASE_ALREADY_PAID')
    const receipt = await tx.query.goodsReceipts.findFirst({ where: eq(goodsReceipts.purchaseId, id) })
    if (!receipt) throw new Error('RECEIVE_BEFORE_PAYMENT')

    const [payable] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '2001')).limit(1)
    const [paymentAccount] = await tx.select().from(chartOfAccounts).where(and(
      eq(chartOfAccounts.code, paymentAccountCode),
      eq(chartOfAccounts.isActive, true),
    )).limit(1)
    if (!payable || !paymentAccount) throw new Error('ACCOUNTING_NOT_CONFIGURED')

    const [journal] = await tx.insert(journalEntries).values({
      reference: `PAYMENT-${purchase.id.slice(0, 8)}`,
      description: 'Purchase payment',
      sourceType: 'purchase_payment',
      sourceId: purchase.id,
      createdBy: userId,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: payable.id, type: 'debit', amount: purchase.totalAmount },
      { journalEntryId: journal.id, accountId: paymentAccount.id, type: 'credit', amount: purchase.totalAmount },
    ])
    await tx.update(purchases).set({ isPaid: true, paidAt: new Date() }).where(eq(purchases.id, id))
    await tx.insert(auditLogs).values({
      userId,
      action: 'PAY_PURCHASE',
      targetTable: 'purchases',
      targetId: id,
      oldValue: { isPaid: false },
      newValue: { isPaid: true, paymentAccountCode },
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
    orderBy: [desc(purchases.createdAt)],
  })
  return rows.map(row => ({ ...row, vendorName: row.vendor?.name ?? null, creatorName: null }))
}
