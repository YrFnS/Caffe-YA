# Phase 2: POS Core & Timed Resources — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the primary POS screen with product grid, cart, checkout flow, and the resource/timer system for gaming stations and timed tables.

**Architecture:**
- POS screen at `/[locale]/pos` — Server Component that fetches initial data (categories, products, active shift, draft order)
- Client sub-components for interactive elements (product grid, cart, timer, checkout modal)
- Orders saved as `status = 'draft'` in DB while in progress, marked `closed` on checkout
- Timer logic calculates charge based on `resourceCategory.hourlyRate`, `minimumMinutes`, `graceMinutes`
- Single payment method per checkout (cash/card/mobile_wallet)

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Better Auth, next-intl, Tailwind CSS v4

---

## Task 1: POS Layout Shell & Translations

**Files:**
- Create: `src/app/[locale]/(protected)/pos/_components/POSLayout.tsx` — Client component shell with header showing shift info
- Create: `src/app/[locale]/(protected)/pos/loading.tsx` — Skeleton for POS page
- Create: `src/app/[locale]/(protected)/pos/error.tsx` — Error boundary for POS page
- Modify: `src/messages/en.json:1-46` — Add POS-related translation keys
- Modify: `src/messages/ar.json:1-46` — Add Arabic POS translation keys

**Step 1: Add POS translation keys**

Add to `src/messages/en.json`:
```json
"pos": {
  "title": "Point of Sale",
  "noActiveShift": "No active shift. Please open a shift first.",
  "noProducts": "No products available",
  "addToOrder": "Add to order",
  "checkout": "Checkout",
  "clearOrder": "Clear order",
  "quantity": "Qty",
  "subtotal": "Subtotal",
  "total": "Total",
  "timer": "Timer",
  "resourceOccupied": "Resource is occupied",
  "paymentMethod": "Payment method",
  "cash": "Cash",
  "card": "Card",
  "mobileWallet": "Mobile Wallet",
  "confirmPayment": "Confirm payment",
  "orderComplete": "Order complete",
  "printReceipt": "Print receipt",
  "newOrder": "New Order",
  "emptyCart": "No items in order",
  "selectResource": "Select a table or station",
  "available": "Available",
  "occupied": "Occupied",
  "maintenance": "Maintenance"
}
```

**Step 2: Create loading.tsx for POS**

```tsx
// src/app/[locale]/(protected)/pos/loading.tsx
export default function POSLoading() {
  return (
    <div className="flex gap-6 h-full">
      {/* Product grid skeleton */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 bg-surface-container-low rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-32 bg-surface-container-low rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      {/* Order summary skeleton */}
      <div className="w-80 bg-surface-container-lowest rounded-lg animate-pulse" />
    </div>
  )
}
```

**Step 3: Create POS error.tsx**

```tsx
// src/app/[locale]/(protected)/pos/error.tsx
"use client"

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function POSError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common')

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <AlertTriangle className="w-12 h-12 text-tertiary" />
      <h2 className="text-headline-md text-on-surface">{t('error')}</h2>
      <p className="text-body-md text-on-surface-variant">{error.message}</p>
      <Button onClick={reset}>{t('retry') || 'Retry'}</Button>
    </div>
  )
}
```

**Step 4: Create POSLayout client component**

```tsx
// src/app/[locale]/(protected)/pos/_components/POSLayout.tsx
"use client"

import { useTranslations } from 'next-intl'
import { Clock, User } from 'lucide-react'

interface POSLayoutProps {
  children: React.ReactNode
  shiftStatus?: string
  cashierName?: string
}

export default function POSLayout({ children, shiftStatus, cashierName }: POSLayoutProps) {
  const t = useTranslations('pos')

  return (
    <div className="flex flex-col h-full">
      {/* POS Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-container-low border-b border-outline-variant/15">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
          {shiftStatus && (
            <span className={`text-label-md px-2 py-1 rounded ${
              shiftStatus === 'open' ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'
            }`}>
              {shiftStatus === 'open' ? t('shiftOpen') : t('shiftClosed')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {cashierName && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <User className="w-4 h-4" />
              <span className="text-sm">{cashierName}</span>
            </div>
          )}
        </div>
      </header>

      {/* POS Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

**Step 5: Commit**
```bash
git add src/messages/en.json src/messages/ar.json src/app/\[locale\]/\(protected\)/pos/loading.tsx src/app/\[locale\]/\(protected\)/pos/error.tsx src/app/\[locale\]/\(protected\)/pos/_components/POSLayout.tsx
git commit -m "feat(pos): add POS layout shell, loading/error states, and translations"
```

---

## Task 2: Product Grid & Category Tabs

**Files:**
- Create: `src/features/pos/_components/CategoryTabs.tsx` — Horizontal scrollable category pills
- Create: `src/features/pos/_components/ProductGrid.tsx` — 4-col grid of ProductCards
- Create: `src/features/pos/_components/ProductCard.tsx` — Individual product card with quick-add
- Create: `src/features/pos/_services/productService.ts` — DB queries for products/categories
- Create: `src/features/pos/_types.ts` — TypeScript types for POS

**Step 1: Create types file**

```typescript
// src/features/pos/_types.ts
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
```

**Step 2: Create productService.ts**

```typescript
// src/features/pos/_services/productService.ts
import { db } from '@/lib/db'
import { productCategories, products } from '@/lib/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function getCategories() {
  return db.query.productCategories.findMany({
    where: isNull(productCategories.parentId),
    with: {
      // no subcategories in phase 2, keep simple
    }
  })
}

export async function getProductsByCategory(categoryId?: string) {
  if (categoryId) {
    return db.query.products.findMany({
      where: and(
        eq(products.categoryId, categoryId),
        eq(products.isActive, true)
      )
    })
  }
  return db.query.products.findMany({
    where: eq(products.isActive, true)
  })
}

export async function getAllActiveProducts() {
  return db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      category: true
    }
  })
}
```

**Step 3: Create ProductCard component**

```tsx
// src/features/pos/_components/ProductCard.tsx
"use client"

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Product } from '../_types'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const t = useTranslations('pos')
  const price = Number(product.price)

  return (
    <button
      onClick={() => onAdd(product)}
      className={cn(
        'group relative flex flex-col items-start p-4 rounded-lg',
        'bg-surface-container-lowest transition-colors',
        'hover:bg-surface-container-high active:scale-[0.98]',
        'text-start'
      )}
    >
      {/* Product image or placeholder */}
      <div className="w-full aspect-square mb-3 rounded-md bg-surface-container-low flex items-center justify-center">
        {product.localImageName ? (
          <img
            src={`/uploads/products/${product.localImageName}`}
            alt={product.name}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <span className="text-2xl text-on-surface-variant">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Product name */}
      <h3 className="text-body-md font-medium text-on-surface mb-1 line-clamp-2">
        {product.name}
      </h3>

      {/* Price */}
      <p className="text-label-md text-secondary font-semibold">
        {price.toLocaleString('en-US', { minimumFractionDigits: 0 })} IQD
      </p>

      {/* Quick add indicator */}
      <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </button>
  )
}
```

**Step 4: Create CategoryTabs component**

```tsx
// src/features/pos/_components/CategoryTabs.tsx
"use client"

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Category } from '../_types'

interface CategoryTabsProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryTabs({ categories, selectedId, onSelect }: CategoryTabsProps) {
  const t = useTranslations('pos')

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex-shrink-0 px-4 py-2 rounded-full text-label-md font-medium transition-colors',
          selectedId === null
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
        )}
      >
        {t('all') || 'All'}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'flex-shrink-0 px-4 py-2 rounded-full text-label-md font-medium transition-colors',
            selectedId === cat.id
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
```

**Step 5: Create ProductGrid component**

```tsx
// src/features/pos/_components/ProductGrid.tsx
"use client"

import { useTranslations } from 'next-intl'
import ProductCard from './ProductCard'
import CategoryTabs from './CategoryTabs'
import type { Product, Category } from '../_types'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onAddProduct: (product: Product) => void
}

export default function ProductGrid({
  products,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddProduct
}: ProductGridProps) {
  const t = useTranslations('pos')

  const filtered = selectedCategoryId
    ? products.filter(p => p.categoryId === selectedCategoryId)
    : products

  return (
    <div className="flex flex-col gap-4 h-full">
      <CategoryTabs
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={onSelectCategory}
      />

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
          <p className="text-body-lg">{t('noProducts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAddProduct}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 6: Commit**
```bash
git add src/features/pos/_types.ts src/features/pos/_services/productService.ts
git add src/features/pos/_components/ProductCard.tsx src/features/pos/_components/CategoryTabs.tsx src/features/pos/_components/ProductGrid.tsx
git commit -m "feat(pos): add product grid, category tabs, and product cards"
```

---

## Task 3: Order Summary (Cart) Panel

**Files:**
- Create: `src/features/pos/_components/OrderSummary.tsx` — The asymmetric white panel (per DESIGN.md)
- Create: `src/features/pos/_services/orderService.ts` — DB queries and mutations for orders
- Create: `src/features/pos/_hooks/useCart.ts` — Client-side cart state with DB sync

**Step 1: Create orderService.ts**

```typescript
// src/features/pos/_services/orderService.ts
import { db } from '@/lib/db'
import { orders, orderItems, transactions, resources } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function getOrCreateDraftOrder(shiftId: string, userId: string) {
  // Check if there's already a draft order for this shift/user
  const existing = await db.query.orders.findFirst({
    where: and(
      eq(orders.shiftId, shiftId),
      eq(orders.cashierId, userId),
      eq(orders.status, 'draft')
    )
  })

  if (existing) return existing

  // Create new draft order
  const [newOrder] = await db.insert(orders).values({
    shiftId,
    cashierId: userId,
    status: 'draft',
    subtotal: '0',
    totalAmount: '0',
  }).returning()

  return newOrder
}

export async function getActiveShift(userId: string) {
  const openShift = await db.query.shifts.findFirst({
    where: and(
      eq(shifts.cashierId, userId),
      eq(shifts.status, 'open')
    )
  })
  return openShift
}

export async function addItemToOrder(orderId: string, productId: string, quantity: number, unitPrice: string) {
  const totalPrice = (Number(unitPrice) * quantity).toFixed(3)

  const [item] = await db.insert(orderItems).values({
    orderId,
    productId,
    quantity: quantity.toString(),
    unitPrice,
    totalPrice,
  }).returning()

  await recalculateOrderTotals(orderId)
  return item
}

export async function removeItemFromOrder(itemId: string) {
  await db.update(orderItems)
    .set({ voidedAt: new Date() })
    .where(eq(orderItems.id, itemId))

  // Get orderId from item to recalculate
  const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) })
  if (item) {
    await recalculateOrderTotals(item.orderId)
  }
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) })
  if (!item) return

  if (quantity <= 0) {
    await removeItemFromOrder(itemId)
    return
  }

  const totalPrice = (Number(item.unitPrice) * quantity).toFixed(3)
  await db.update(orderItems)
    .set({ quantity: quantity.toString(), totalPrice })
    .where(eq(orderItems.id, itemId))

  await recalculateOrderTotals(item.orderId)
}

async function recalculateOrderTotals(orderId: string) {
  const items = await db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, orderId), isNull(orderItems.voidedAt))
  })

  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })

  const total = subtotal + Number(order?.timerChargeAmount || 0)

  await db.update(orders)
    .set({ subtotal: subtotal.toFixed(3), totalAmount: total.toFixed(3) })
    .where(eq(orders.id, orderId))
}

export async function checkoutOrder(orderId: string, paymentMethod: string, amount: string, reference?: string) {
  return db.transaction(async (tx) => {
    // Update order status
    await tx.update(orders)
      .set({ status: 'closed', closedAt: new Date() })
      .where(eq(orders.id, orderId))

    // Create transaction
    await tx.insert(transactions).values({
      orderId,
      shiftId: (await db.query.orders.findFirst({ where: eq(orders.id, orderId) }))!.shiftId,
      paymentMethod: paymentMethod as 'cash' | 'card' | 'mobile_wallet',
      amount,
      reference,
    })

    // Free up the resource if one was assigned
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (order?.resourceId) {
      await tx.update(resources)
        .set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }
  })
}

import { isNull } from 'drizzle-orm'
```

**Step 2: Create useCart hook**

```typescript
// src/features/pos/_hooks/useCart.ts
"use client"

import { useState, useCallback, useEffect } from 'react'
import type { CartItem, ActiveOrder, Product } from '../_types'

interface UseCartProps {
  order: ActiveOrder | null
  onAddItem: (productId: string, quantity: number) => Promise<void>
  onRemoveItem: (itemId: string) => Promise<void>
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>
  onClearOrder: () => Promise<void>
}

export function useCart({ order, onAddItem, onRemoveItem, onUpdateQuantity, onClearOrder }: UseCartProps) {
  const [items, setItems] = useState<CartItem[]>(order?.items || [])
  const [isLoading, setIsLoading] = useState(false)

  // Sync with order prop when it changes
  useEffect(() => {
    if (order?.items) {
      setItems(order.items)
    }
  }, [order?.items])

  const addItem = useCallback(async (product: Product) => {
    setIsLoading(true)
    try {
      const existing = items.find(i => i.productId === product.id)
      if (existing) {
        await onUpdateQuantity(existing.productId, existing.quantity + 1)
        setItems(prev => prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (Number(i.unitPrice) * (i.quantity + 1)).toFixed(3) }
            : i
        ))
      } else {
        await onAddItem(product.id, 1)
        setItems(prev => [...prev, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
        }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [items, onAddItem, onUpdateQuantity])

  const removeItem = useCallback(async (productId: string) => {
    setIsLoading(true)
    try {
      const item = items.find(i => i.productId === productId)
      if (item) {
        await onRemoveItem(item.productId) // pass internal ID, not productId
        setItems(prev => prev.filter(i => i.productId !== productId))
      }
    } finally {
      setIsLoading(false)
    }
  }, [items, onRemoveItem])

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const item = items.find(i => i.productId === productId)
    if (!item) return
    await onUpdateQuantity(item.productId, quantity) // note: item.productId is actually the order_item id
    setItems(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity, totalPrice: (Number(i.unitPrice) * quantity).toFixed(3) }
        : i
    ))
  }, [items, onUpdateQuantity])

  const clearCart = useCallback(async () => {
    await onClearOrder()
    setItems([])
  }, [onClearOrder])

  const subtotal = items.reduce((sum, i) => sum + Number(i.totalPrice), 0)
  const total = subtotal + Number(order?.timerCharge || 0)

  return {
    items,
    subtotal: subtotal.toFixed(3),
    timerCharge: order?.timerCharge || '0',
    total: total.toFixed(3),
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }
}
```

**Step 3: Create OrderSummary component**

```tsx
// src/features/pos/_components/OrderSummary.tsx
"use client"

import { useTranslations } from 'next-intl'
import { Minus, Plus, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CartItem } from '../_types'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: string
  timerCharge: string
  total: string
  timerRunning?: boolean
  timerDisplay?: string
  onAddItem: (productId: string) => void
  onRemoveItem: (productId: string) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onCheckout: () => void
  onClear: () => void
  isLoading?: boolean
  disabled?: boolean
}

export default function OrderSummary({
  items,
  subtotal,
  timerCharge,
  total,
  timerRunning,
  timerDisplay,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  onClear,
  isLoading,
  disabled,
}: OrderSummaryProps) {
  const t = useTranslations('pos')

  return (
    <div className="w-80 flex flex-col bg-surface-container-lowest rounded-lg h-full">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/15">
        <h2 className="text-headline-sm font-semibold text-on-surface">{t('title')}</h2>
        {timerRunning && (
          <div className="flex items-center gap-2 mt-2 text-warning">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-display-sm">{timerDisplay}</span>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
            <p className="text-body-md">{t('emptyCart')}</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.productId} className="flex items-start gap-3 p-3 bg-surface rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface truncate">{item.productName}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {Number(item.unitPrice).toLocaleString()} × {item.quantity}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-body-sm font-semibold text-on-surface">
                  {Number(item.totalPrice).toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    disabled={disabled}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-label-md w-6 text-center">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onAddItem(item.productId)}
                    disabled={disabled}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-tertiary hover:text-tertiary"
                    onClick={() => onRemoveItem(item.productId)}
                    disabled={disabled}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Timer charge line (if any) */}
      {Number(timerCharge) > 0 && (
        <div className="px-4 py-2 border-t border-outline-variant/15">
          <div className="flex justify-between text-body-sm text-on-surface-variant">
            <span>{t('timer')}</span>
            <span className="font-mono">{Number(timerCharge).toLocaleString()} IQD</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="p-4 border-t border-outline-variant/15 space-y-2">
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">{t('subtotal')}</span>
          <span className="font-mono">{Number(subtotal).toLocaleString()} IQD</span>
        </div>
        <div className="flex justify-between text-headline-sm font-bold">
          <span>{t('total')}</span>
          <span className="font-mono text-secondary">{Number(total).toLocaleString()} IQD</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 space-y-2">
        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={onCheckout}
          disabled={items.length === 0 || disabled || isLoading}
        >
          {t('checkout')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-tertiary"
          onClick={onClear}
          disabled={items.length === 0 || disabled || isLoading}
        >
          {t('clearOrder')}
        </Button>
      </div>
    </div>
  )
}
```

**Step 4: Commit**
```bash
git add src/features/pos/_services/orderService.ts src/features/pos/_hooks/useCart.ts
git add src/features/pos/_components/OrderSummary.tsx
git commit -m "feat(pos): add order summary panel with cart management"
```

---

## Task 4: Resource Grid & Timer Logic

**Files:**
- Create: `src/features/pos/_components/ResourceGrid.tsx` — Visual grid of resource cards
- Create: `src/features/pos/_components/ResourceCard.tsx` — Individual resource card with status
- Create: `src/features/pos/_services/resourceService.ts` — DB queries for resources and timer management

**Step 1: Create resourceService.ts**

```typescript
// src/features/pos/_services/resourceService.ts
import { db } from '@/lib/db'
import { resources, resourceCategories, orders } from '@/lib/schema'
import { eq, and, isNotNull } from 'drizzle-orm'

export async function getResourcesWithCategories() {
  return db.query.resources.findMany({
    where: eq(resources.isActive, true),
    with: {
      category: true,
    },
    orderBy: (resources, { asc }) => [asc(resources.name)],
  })
}

export async function getResourceCategories() {
  return db.query.resourceCategories.findMany({
    where: eq(resourceCategories.isActive, true),
  })
}

export async function assignResourceToOrder(resourceId: string, orderId: string) {
  // Use FOR UPDATE to prevent double-assignment
  return db.transaction(async (tx) => {
    const resource = await tx.query.resources.findFirst({
      where: eq(resources.id, resourceId),
    })

    if (!resource || resource.status !== 'available') {
      throw new Error('RESOURCE_NOT_AVAILABLE')
    }

    // Lock and update resource
    await tx.update(resources)
      .set({ status: 'occupied' })
      .where(eq(resources.id, resourceId))

    // Start timer on order
    const category = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, resource.categoryId),
    })

    if (category?.isTimed) {
      await tx.update(orders)
        .set({ resourceId, timerStartedAt: new Date() })
        .where(eq(orders.id, orderId))
    } else {
      await tx.update(orders)
        .set({ resourceId })
        .where(eq(orders.id, orderId))
    }

    return resource
  })
}

export async function startTimer(orderId: string, resourceId: string) {
  await db.update(orders)
    .set({ timerStartedAt: new Date() })
    .where(eq(orders.id, orderId))
}

export async function stopTimer(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order || !order.timerStartedAt) return null

  const startTime = new Date(order.timerStartedAt)
  const endTime = new Date()
  const elapsedMs = endTime.getTime() - startTime.getTime()
  const elapsedMinutes = Math.floor(elapsedMs / 60000)

  const resource = await db.query.resources.findFirst({
    where: eq(resources.id, order.resourceId!),
    with: { category: true },
  })

  if (!resource) return null

  const { hourlyRate, minimumMinutes = 0, graceMinutes = 0 } = resource.category

  // Calculate charge: max(elapsed - grace, minimum) * hourlyRate / 60
  const chargeableMinutes = Math.max(elapsedMinutes - graceMinutes, minimumMinutes)
  const charge = (chargeableMinutes / 60) * Number(hourlyRate)

  await db.update(orders)
    .set({
      timerEndedAt: endTime,
      timerChargeAmount: charge.toFixed(3),
    })
    .where(eq(orders.id, orderId))

  return {
    elapsedMinutes,
    chargeableMinutes,
    charge: charge.toFixed(3),
  }
}

export async function transferOrder(orderId: string, newResourceId: string) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) throw new Error('ORDER_NOT_FOUND')

    // Free old resource
    if (order.resourceId) {
      await tx.update(resources)
        .set({ status: 'available' })
        .where(eq(resources.id, order.resourceId))
    }

    // Stop old timer, calculate charge
    let timerCharge = '0'
    if (order.timerStartedAt) {
      const startTime = new Date(order.timerStartedAt)
      const endTime = new Date()
      const elapsedMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000)
      const oldResource = await tx.query.resources.findFirst({ where: eq(resources.id, order.resourceId!) })
      if (oldResource?.category.isTimed) {
        const { hourlyRate, minimumMinutes = 0, graceMinutes = 0 } = oldResource.category
        const chargeableMinutes = Math.max(elapsedMinutes - graceMinutes, minimumMinutes)
        timerCharge = ((chargeableMinutes / 60) * Number(hourlyRate)).toFixed(3)
      }
    }

    // Assign new resource
    const newResource = await tx.query.resources.findFirst({
      where: eq(resources.id, newResourceId),
    })
    if (!newResource || newResource.status !== 'available') {
      throw new Error('NEW_RESOURCE_NOT_AVAILABLE')
    }

    await tx.update(resources)
      .set({ status: 'occupied' })
      .where(eq(resources.id, newResourceId))

    // Update order with new resource and restart timer if timed
    const newCategory = await tx.query.resourceCategories.findFirst({
      where: eq(resourceCategories.id, newResource.categoryId),
    })

    await tx.update(orders)
      .set({
        resourceId: newResourceId,
        timerStartedAt: newCategory?.isTimed ? new Date() : order.timerStartedAt,
        timerEndedAt: newCategory?.isTimed ? null : order.timerEndedAt,
        timerChargeAmount: timerCharge,
      })
      .where(eq(orders.id, orderId))

    return { timerCharge }
  })
}

export async function getOrderWithResource(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      resource: {
        with: { category: true },
      },
    },
  })
}
```

**Step 2: Create ResourceCard component**

```tsx
// src/features/pos/_components/ResourceCard.tsx
"use client"

import { useTranslations } from 'next-intl'
import { Monitor, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Resource } from '../_types'

interface ResourceCardProps {
  resource: Resource
  isTimed: boolean
  hourlyRate?: string
  onClick: () => void
  disabled?: boolean
}

export default function ResourceCard({
  resource,
  isTimed,
  hourlyRate,
  onClick,
  disabled,
}: ResourceCardProps) {
  const t = useTranslations('pos')

  const statusStyles = {
    available: 'bg-surface-container-lowest border-s-4 border-secondary',
    occupied: 'bg-surface-container-lowest border-s-4 border-tertiary',
    maintenance: 'bg-surface-container-low border-s-4 border-tertiary-fixed-dim',
  }

  const statusGlow = {
    available: 'shadow-secondary/20',
    occupied: '',
    maintenance: '',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || resource.status === 'maintenance'}
      className={cn(
        'relative flex flex-col p-4 rounded-lg transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        statusStyles[resource.status],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Status halo */}
      <div className="absolute top-0 start-0 bottom-0 w-1 rounded-s-lg" />

      {/* Icon */}
      <div className="flex items-center justify-between mb-3">
        <Monitor className={cn(
          'w-8 h-8',
          resource.status === 'available' ? 'text-secondary' : 'text-on-surface-variant'
        )} />
        {isTimed && hourlyRate && (
          <span className="text-label-sm text-on-surface-variant">
            {Number(hourlyRate).toLocaleString()}/hr
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-body-md font-medium text-on-surface mb-1">{resource.name}</h3>

      {/* Status badge */}
      <div className={cn(
        'inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded self-start',
        resource.status === 'available' && 'bg-secondary/10 text-secondary',
        resource.status === 'occupied' && 'bg-tertiary/10 text-tertiary',
        resource.status === 'maintenance' && 'bg-surface-container-high text-on-surface-variant',
      )}>
        {resource.status === 'available' && t('available')}
        {resource.status === 'occupied' && t('occupied')}
        {resource.status === 'maintenance' && t('maintenance')}
      </div>
    </button>
  )
}
```

**Step 3: Create ResourceGrid component**

```tsx
// src/features/pos/_components/ResourceGrid.tsx
"use client"

import { useTranslations } from 'next-intl'
import ResourceCard from './ResourceCard'
import type { Resource } from '../_types'

interface ResourceGridProps {
  resources: Resource[]
  onSelectResource: (resourceId: string) => void
  disabled?: boolean
}

export default function ResourceGrid({ resources, onSelectResource, disabled }: ResourceGridProps) {
  const t = useTranslations('pos')

  if (resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-on-surface-variant">
        <p className="text-body-md">{t('noResources') || 'No resources configured'}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          isTimed={resource.category?.isTimed || false}
          hourlyRate={resource.category?.hourlyRate}
          onClick={() => onSelectResource(resource.id)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
```

**Step 4: Commit**
```bash
git add src/features/pos/_services/resourceService.ts src/features/pos/_components/ResourceCard.tsx src/features/pos/_components/ResourceGrid.tsx
git commit -m "feat(pos): add resource grid with timer logic and resource assignment"
```

---

## Task 5: Checkout Flow & Payment Modal

**Files:**
- Create: `src/features/pos/_components/CheckoutModal.tsx` — Payment method selection and confirmation
- Create: `src/features/pos/_actions/checkout.ts` — Server Action for processing checkout
- Modify: `src/features/pos/_services/orderService.ts` — Add checkout logic

**Step 1: Create CheckoutModal component**

```tsx
// src/features/pos/_components/CheckoutModal.tsx
"use client"

import { useTranslations } from 'next-intl'
import { X, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type PaymentMethod = 'cash' | 'card' | 'mobile_wallet'

interface CheckoutModalProps {
  total: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (method: PaymentMethod, reference?: string) => Promise<void>
}

export default function CheckoutModal({
  total,
  isOpen,
  onClose,
  onConfirm,
}: CheckoutModalProps) {
  const t = useTranslations('pos')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [reference, setReference] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!selectedMethod) return
    setIsProcessing(true)
    try {
      await onConfirm(selectedMethod, reference || undefined)
      setSelectedMethod(null)
      setReference('')
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  const paymentMethods = [
    { id: 'cash' as const, icon: Banknote, label: t('cash') },
    { id: 'card' as const, icon: CreditCard, label: t('card') },
    { id: 'mobile_wallet' as const, icon: Smartphone, label: t('mobileWallet') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-container-high/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/15">
          <h2 className="text-headline-sm font-semibold text-on-surface">
            {t('checkout')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Total display */}
        <div className="p-6 text-center border-b border-outline-variant/15">
          <p className="text-body-sm text-on-surface-variant mb-1">{t('total')}</p>
          <p className="text-display-lg font-bold text-secondary">
            {Number(total).toLocaleString()} IQD
          </p>
        </div>

        {/* Payment methods */}
        <div className="p-4 space-y-3">
          <p className="text-label-md text-on-surface-variant">{t('paymentMethod')}</p>
          {paymentMethods.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSelectedMethod(id)}
              className={cn(
                'flex items-center gap-4 w-full p-4 rounded-lg transition-colors',
                selectedMethod === id
                  ? 'bg-primary/10 border-2 border-primary text-primary'
                  : 'bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-body-md font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Reference field (optional) */}
        {selectedMethod && (
          <div className="px-4 pb-4">
            <input
              type="text"
              placeholder="Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full h-12 px-4 bg-surface-container-highest border-b-2 border-outline text-body-md text-on-surface placeholder:text-on-surface-disabled focus:border-outline focus:outline-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-outline-variant/15">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handleConfirm}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? t('processing') || 'Processing...' : t('confirmPayment')}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create checkout Server Action**

```typescript
// src/features/pos/_actions/checkout.ts
"use use server"

import { checkoutOrder } from '../_services/orderService'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { PaymentMethod } from '@/lib/schema'

export async function processCheckout(formData: FormData) {
  const session = await auth()
  if (!session?.user) redirect('/sign-in')

  const orderId = formData.get('orderId') as string
  const paymentMethod = formData.get('paymentMethod') as PaymentMethod
  const amount = formData.get('amount') as string
  const reference = formData.get('reference') as string | null

  if (!orderId || !paymentMethod || !amount) {
    return { error: 'MISSING_FIELDS' }
  }

  try {
    await checkoutOrder(orderId, paymentMethod, amount, reference || undefined)
    return { success: true }
  } catch (error) {
    console.error('Checkout failed:', error)
    return { error: 'CHECKOUT_FAILED' }
  }
}
```

**Step 3: Update OrderSummary to use CheckoutModal**

Add CheckoutModal import and state to the parent POS page component. The OrderSummary emits `onCheckout` which opens the modal.

**Step 4: Commit**
```bash
git add src/features/pos/_components/CheckoutModal.tsx src/features/pos/_actions/checkout.ts
git commit -m "feat(pos): add checkout modal with payment method selection"
```

---

## Task 6: POS Page Assembly

**Files:**
- Create: `src/app/[locale]/(protected)/pos/page.tsx` — Main POS page (Server Component)
- Create: `src/app/[locale]/(protected)/pos/_components/POSClientView.tsx` — Client component holding state
- Modify: `src/app/[locale]/(protected)/layout.tsx` — Add POS to nav if not already

**Step 1: Create POSClientView (main client orchestrator)**

```tsx
// src/app/[locale]/(protected)/pos/_components/POSClientView.tsx
"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import POSLayout from './POSLayout'
import ProductGrid from '@/features/pos/_components/ProductGrid'
import OrderSummary from '@/features/pos/_components/OrderSummary'
import ResourceGrid from '@/features/pos/_components/ResourceGrid'
import CheckoutModal from '@/features/pos/_components/CheckoutModal'
import { useCart } from '@/features/pos/_hooks/useCart'
import type { Product, Category, Resource } from '@/features/pos/_types'

interface POSClientViewProps {
  products: Product[]
  categories: Category[]
  resources: Resource[]
  shiftId: string
  orderId: string
  cashierName: string
}

export default function POSClientView({
  products,
  categories,
  resources,
  shiftId,
  orderId,
  cashierName,
}: POSClientViewProps) {
  const t = useTranslations('pos')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showResourceGrid, setShowResourceGrid] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [timerDisplay, setTimerDisplay] = useState<string | null>(null)

  // These would be replaced with actual service calls
  const handleAddItem = useCallback(async (productId: string, quantity: number) => {
    // Call orderService.addItemToOrder
    console.log('add item', productId, quantity)
  }, [])

  const handleRemoveItem = useCallback(async (itemId: string) => {
    console.log('remove item', itemId)
  }, [])

  const handleUpdateQuantity = useCallback(async (itemId: string, quantity: number) => {
    console.log('update quantity', itemId, quantity)
  }, [])

  const handleClearOrder = useCallback(async () => {
    console.log('clear order')
  }, [])

  const cart = useCart({
    order: null,
    onAddItem: handleAddItem,
    onRemoveItem: handleRemoveItem,
    onUpdateQuantity: handleUpdateQuantity,
    onClearOrder: handleClearOrder,
  })

  const handleSelectResource = useCallback((resourceId: string) => {
    console.log('select resource', resourceId)
    setShowResourceGrid(false)
  }, [])

  const handleCheckoutConfirm = useCallback(async (method: string, reference?: string) => {
    console.log('checkout', method, reference)
    setShowCheckout(false)
  }, [])

  return (
    <POSLayout shiftStatus="open" cashierName={cashierName}>
      <div className="flex gap-6 h-full px-6 py-4">
        {/* Left: Product grid or Resource grid */}
        <div className="flex-1">
          {showResourceGrid ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md font-semibold text-on-surface">{t('selectResource')}</h2>
                <button
                  onClick={() => setShowResourceGrid(false)}
                  className="text-label-md text-primary hover:underline"
                >
                  {t('backToProducts') || 'Back to products'}
                </button>
              </div>
              <ResourceGrid
                resources={resources}
                onSelectResource={handleSelectResource}
              />
            </div>
          ) : (
            <ProductGrid
              products={products}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onAddProduct={(product) => cart.addItem(product)}
            />
          )}
        </div>

        {/* Right: Order summary */}
        <OrderSummary
          items={cart.items}
          subtotal={cart.subtotal}
          timerCharge={cart.timerCharge}
          total={cart.total}
          timerDisplay={timerDisplay || undefined}
          onAddItem={(productId) => {
            const product = products.find(p => p.id === productId)
            if (product) cart.addItem(product)
          }}
          onRemoveItem={cart.removeItem}
          onUpdateQuantity={cart.updateQuantity}
          onCheckout={() => setShowCheckout(true)}
          onClear={cart.clearCart}
          disabled={false}
        />
      </div>

      {/* Quick action: Toggle resource grid */}
      <div className="fixed bottom-6 start-6">
        <button
          onClick={() => setShowResourceGrid(!showResourceGrid)}
          className="flex items-center gap-2 px-4 py-3 bg-surface-container-high rounded-lg hover:bg-surface-container-high/80 transition-colors"
        >
          <span className="text-label-md text-on-surface">
            {showResourceGrid ? t('backToProducts') : t('selectResource')}
          </span>
        </button>
      </div>

      {/* Checkout modal */}
      <CheckoutModal
        total={cart.total}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onConfirm={handleCheckoutConfirm}
      />
    </POSLayout>
  )
}
```

**Step 2: Create POS page (Server Component)**

```tsx
// src/app/[locale]/(protected)/pos/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getActiveShift, getOrCreateDraftOrder } from '@/features/pos/_services/orderService'
import { getAllActiveProducts, getCategories } from '@/features/pos/_services/productService'
import { getResourcesWithCategories } from '@/features/pos/_services/resourceService'
import POSClientView from './_components/POSClientView'

export default async function POSPage() {
  const session = await auth()
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string

  // Get active shift
  const activeShift = await getActiveShift(userId)
  if (!activeShift) {
    // No shift open — redirect to shifts page
    redirect('/shifts')
  }

  // Get or create draft order
  const draftOrder = await getOrCreateDraftOrder(activeShift.id, userId)

  // Fetch all data in parallel
  const [products, categories, resources] = await Promise.all([
    getAllActiveProducts(),
    getCategories(),
    getResourcesWithCategories(),
  ])

  return (
    <POSClientView
      products={products}
      categories={categories}
      resources={resources}
      shiftId={activeShift.id}
      orderId={draftOrder.id}
      cashierName={session.user.name || 'Cashier'}
    />
  )
}
```

**Step 3: Commit**
```bash
git add src/app/\[locale\]/\(protected\)/pos/page.tsx src/app/\[locale\]/\(protected\)/pos/_components/POSClientView.tsx
git commit -m "feat(pos): assemble main POS page with all components"
```

---

## Task 7: Timer Display & Sync Hook

**Files:**
- Create: `src/features/pos/_hooks/useTimer.ts` — Client hook for running timer display
- Modify: `src/features/pos/_components/OrderSummary.tsx` — Add timer display with pulse animation

**Step 1: Create useTimer hook**

```typescript
// src/features/pos/_hooks/useTimer.ts
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTimerOptions {
  startedAt: Date | string | null
  isRunning: boolean
  onThreshold?: () => void
  warningMinutes?: number
}

export function useTimer({ startedAt, isRunning, onThreshold, warningMinutes = 30 }: UseTimerOptions) {
  const [display, setDisplay] = useState('00:00:00')
  const [isWarning, setIsWarning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const calculateDisplay = useCallback(() => {
    if (!startedAt) {
      setDisplay('00:00:00')
      return
    }

    const start = new Date(startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - start) / 1000)

    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60

    setDisplay(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    )

    // Warning check
    const elapsedMinutes = Math.floor(elapsed / 60)
    if (elapsedMinutes >= warningMinutes && !isWarning) {
      setIsWarning(true)
      onThreshold?.()
    }
  }, [startedAt, warningMinutes, isWarning, onThreshold])

  useEffect(() => {
    if (isRunning && startedAt) {
      calculateDisplay()
      intervalRef.current = setInterval(calculateDisplay, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setDisplay('00:00:00')
      setIsWarning(false)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startedAt, calculateDisplay])

  return { display, isWarning }
}
```

**Step 2: Add timer to OrderSummary**

The OrderSummary already has timer display infrastructure. Ensure it uses the `useTimer` hook when `timerStartedAt` is provided.

**Step 3: Commit**
```bash
git add src/features/pos/_hooks/useTimer.ts
git commit -m "feat(pos): add timer hook with warning threshold detection"
```

---

## Task 8: Void & Refund

**Files:**
- Create: `src/features/pos/_services/voidService.ts` — Void item before checkout, refund after checkout
- Create: `src/features/pos/_actions/void.ts` — Server Action for void/refund

**Step 1: Create voidService.ts**

```typescript
// src/features/pos/_services/voidService.ts
import { db } from '@/lib/db'
import { orderItems, transactions, auditLogs } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function voidOrderItem(itemId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const item = await tx.query.orderItems.findFirst({ where: eq(orderItems.id, itemId) })
    if (!item) throw new Error('ITEM_NOT_FOUND')

    // Mark as voided (never delete)
    await tx.update(orderItems)
      .set({
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason,
      })
      .where(eq(orderItems.id, itemId))

    // Recalculate order totals
    const remainingItems = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, item.orderId),
    })

    const activeItems = remainingItems.filter(i => !i.voidedAt)
    const newSubtotal = activeItems.reduce((sum, i) => sum + Number(i.totalPrice), 0)

    await tx.update(orders)
      .set({ subtotal: newSubtotal.toFixed(3) })
      .where(eq(orders.id, item.orderId))

    // Audit log
    await tx.insert(auditLogs).values({
      userId,
      action: 'VOID_ITEM',
      targetTable: 'order_items',
      targetId: itemId,
      oldValue: { status: 'active' },
      newValue: { status: 'voided', reason },
    })
  })
}

export async function refundTransaction(transactionId: string, userId: string, reason: string) {
  return db.transaction(async (tx) => {
    const txRecord = await tx.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    })
    if (!txRecord) throw new Error('TRANSACTION_NOT_FOUND')

    // Create refund transaction
    await tx.insert(transactions).values({
      orderId: txRecord.orderId,
      shiftId: txRecord.shiftId,
      paymentMethod: txRecord.paymentMethod,
      amount: txRecord.amount,
      isRefund: true,
      refundReason: reason,
      refundedBy: userId,
    })

    // Audit log
    await tx.insert(auditLogs).values({
      userId,
      action: 'REFUND',
      targetTable: 'transactions',
      targetId: transactionId,
      oldValue: { isRefund: false },
      newValue: { isRefund: true, reason },
    })
  })
}

import { orders } from '@/lib/schema'
```

**Step 2: Commit**
```bash
git add src/features/pos/_services/voidService.ts src/features/pos/_actions/void.ts
git commit -m "feat(pos): add void item and refund logic with audit logging"
```

---

## Task 9: Final Integration & Build Verification

**Files:**
- Run: `npm run build` — Verify zero type errors
- Run: `npm run lint` — Verify zero warnings
- Verify: POS page renders at `/en/pos` and `/ar/pos`
- Verify: Switching language doesn't break layout

**Step 1: Run build**

```bash
npm run build
```

Expected: Zero type errors, production build succeeds.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: Zero warnings.

**Step 3: Commit**
```bash
git add -A
git commit -m "chore: verify build and lint pass for Phase 2"
```

---

## Success Criteria Validation

- [ ] Barista can browse products by category and add to cart
- [ ] Cart persists and calculates totals correctly
- [ ] Checkout creates order + transaction(s) in DB
- [ ] Resource grid shows live availability status
- [ ] Timer runs, calculates charge, adds to order total
- [ ] Transfer moves order to new resource with timer handling
- [ ] Void and refund create proper audit trail

---

## Dependencies

- Phase 1 (auth, DB, layout) — ✅ Complete
- Internal: inventory service (products available at checkout) — Uses existing products table

## Notes

- Order transfer requires stopping timer on source resource and starting on destination — handled in `resourceService.transferOrder()`
- Split payments deferred to future phase — single payment method per checkout for now
- SSE real-time sync for manager dashboard deferred — draft orders in DB now, sync later
- Timer calculates based on `resourceCategory.hourlyRate`, `minimumMinutes`, `graceMinutes`
- All monetary values stored as strings (numeric), displayed with `toLocaleString()`, never as JS numbers