import { products, productCategories, orders, orderItems, resources } from '@/lib/schema'

export type Product = typeof products.$inferSelect
export type Category = typeof productCategories.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type Resource = typeof resources.$inferSelect

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: string
  totalPrice: string
  note?: string
  orderItemId?: string
}

export interface ActiveOrder {
  id: string
  items: CartItem[]
  subtotal: string
  timerCharge: string
  total: string
  resourceId?: string
  resourceName?: string
  timerStartedAt?: Date
  status: 'draft' | 'open' | 'closed'
}