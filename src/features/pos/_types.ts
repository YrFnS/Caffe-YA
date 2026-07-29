import { products, productCategories, orders, orderItems, resourceCategories, resources } from '@/lib/schema'
import type { PaymentLine } from './_services/payment'

export type Product = typeof products.$inferSelect
export type Category = typeof productCategories.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type Resource = typeof resources.$inferSelect
export type ResourceCategory = typeof resourceCategories.$inferSelect

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

export interface ActiveResourceOrder {
  id: string
  cashierId: string
  cashierName: string
  totalAmount: string
  timerStartedAt: Date | null
  timerEndedAt: Date | null
}

export interface ResourceOperationsView extends Resource {
  category: ResourceCategory | null
  activeOrder: ActiveResourceOrder | null
}

export type { PaymentLine }

export interface RefundableOrder {
  id: string
  totalAmount: string
  closedAt: Date | null
  payments: Array<{ id: string; paymentMethod: PaymentLine['method']; amount: string }>
}
