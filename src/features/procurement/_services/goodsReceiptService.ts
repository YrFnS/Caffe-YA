import type { GoodsReceiptRow } from '../_types'

// NOTE: goodsReceipts table doesn't exist in schema yet.
// This service is scaffolded — functions will work once the table is added via migration.
export async function getAllGoodsReceipts(): Promise<GoodsReceiptRow[]> {
  // TODO: Replace with actual query when goodsReceipts table is added
  return []
}

export async function getGoodsReceiptById(_id: string): Promise<GoodsReceiptRow | null> {
  // TODO: Replace with actual query when goodsReceipts table is added
  return null
}