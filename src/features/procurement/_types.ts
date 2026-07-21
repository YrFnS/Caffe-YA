export interface VendorRow {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: Date
}

export interface PurchaseRow {
  id: string
  vendorId: string | null
  vendorName: string | null
  totalAmount: string
  isPaid: boolean
  paidAt: Date | null
  note: string | null
  createdBy: string | null
  creatorName: string | null
  createdAt: Date
  receivedAt?: Date | null
}

export interface PurchaseItemRow {
  id: string
  purchaseId: string
  ingredientId: string | null
  ingredientName: string | null
  productId: string | null
  productName: string | null
  quantity: string
  unitCost: string
  totalCost: string
}

export interface GoodsReceiptRow {
  id: string
  purchaseId: string | null
  purchaseVendorName: string | null
  receivedBy: string | null
  receivedByName: string | null
  receivedAt: Date
  note: string | null
}

export interface GoodsReceiptItemRow {
  id: string
  goodsReceiptId: string
  ingredientId: string | null
  ingredientName: string | null
  productId: string | null
  productName: string | null
  quantity: string
  unitCost: string
}
