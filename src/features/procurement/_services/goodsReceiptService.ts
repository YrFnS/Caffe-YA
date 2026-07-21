import { db } from '@/lib/db'
import { auditLogs, chartOfAccounts, goodsReceiptItems, goodsReceipts, ingredients, journalEntries, journalEntryLines, products, purchases, purchaseItems, stockMovements } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import type { GoodsReceiptRow } from '../_types'

export async function getAllGoodsReceipts(): Promise<GoodsReceiptRow[]> {
  const rows = await db.query.goodsReceipts.findMany({
    with: { purchase: { with: { vendor: true } }, receiver: true },
    orderBy: (receipt, { desc }) => [desc(receipt.receivedAt)],
  })
  return rows.map(row => ({
    ...row,
    purchaseVendorName: row.purchase.vendor?.name ?? null,
    receivedByName: row.receiver?.name ?? null,
  }))
}

export async function getGoodsReceiptById(id: string): Promise<GoodsReceiptRow | null> {
  const row = await db.query.goodsReceipts.findFirst({
    where: eq(goodsReceipts.id, id),
    with: { purchase: { with: { vendor: true } }, receiver: true },
  })
  return row ? {
    ...row,
    purchaseVendorName: row.purchase.vendor?.name ?? null,
    receivedByName: row.receiver?.name ?? null,
  } : null
}

export async function receivePurchase(purchaseId: string, userId: string, note?: string) {
  return db.transaction(async tx => {
    const [purchase] = await tx.select().from(purchases).where(eq(purchases.id, purchaseId)).for('update')
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND')
    const existing = await tx.query.goodsReceipts.findFirst({ where: eq(goodsReceipts.purchaseId, purchaseId) })
    if (existing) throw new Error('PURCHASE_ALREADY_RECEIVED')

    const items = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId))
    if (!items.length) throw new Error('PURCHASE_HAS_NO_ITEMS')
    const [receipt] = await tx.insert(goodsReceipts).values({ purchaseId, receivedBy: userId, note }).returning()
    await tx.insert(goodsReceiptItems).values(items.map(item => ({
      goodsReceiptId: receipt.id,
      ingredientId: item.ingredientId,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
    })))

    for (const item of items) {
      if (item.ingredientId) {
        const [ingredient] = await tx.select().from(ingredients).where(eq(ingredients.id, item.ingredientId)).for('update')
        if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')
        await tx.update(ingredients).set({ stockQty: String(Number(ingredient.stockQty) + Number(item.quantity)) }).where(eq(ingredients.id, item.ingredientId))
      } else if (item.productId) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        await tx.update(products).set({ stockQty: String(Number(product.stockQty ?? '0') + Number(item.quantity)) }).where(eq(products.id, item.productId))
      }
      await tx.insert(stockMovements).values({
        ingredientId: item.ingredientId,
        productId: item.productId,
        type: 'purchase',
        quantity: item.quantity,
        purchaseId,
        createdBy: userId,
      })
    }

    const [inventoryAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1201')).limit(1)
    const [creditAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, purchase.isPaid ? '1001' : '2001')).limit(1)
    if (!inventoryAccount || !creditAccount) throw new Error('ACCOUNTING_NOT_CONFIGURED')
    const [journal] = await tx.insert(journalEntries).values({
      reference: `RECEIPT-${receipt.id.slice(0, 8)}`,
      description: 'Purchase goods receipt',
      sourceType: 'purchase',
      sourceId: purchaseId,
      createdBy: userId,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: inventoryAccount.id, type: 'debit', amount: purchase.totalAmount },
      { journalEntryId: journal.id, accountId: creditAccount.id, type: 'credit', amount: purchase.totalAmount },
    ])
    await tx.insert(auditLogs).values({
      userId,
      action: 'RECEIVE_PURCHASE',
      targetTable: 'purchases',
      targetId: purchaseId,
      newValue: { goodsReceiptId: receipt.id },
    })
    return receipt
  })
}
