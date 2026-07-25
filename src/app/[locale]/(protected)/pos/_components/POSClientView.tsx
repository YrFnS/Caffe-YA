"use client"

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import POSLayout from './POSLayout'
import ProductGrid from '@/features/pos/_components/ProductGrid'
import OrderSummary from '@/features/pos/_components/OrderSummary'
import ResourceGrid from '@/features/pos/_components/ResourceGrid'
import CheckoutModal from '@/features/pos/_components/CheckoutModal'
import VoidModal from '@/features/pos/_components/VoidModal'
import { addItemAction, updateQuantityAction } from '@/features/pos/_actions/cart'
import { processCheckout } from '@/features/pos/_actions/checkout'
import { refundOrderAction, voidItem, voidOrderAction } from '@/features/pos/_actions/void'
import { assignResourceAction, stopTimerAction, transferOrderAction } from '@/features/pos/_actions/resource'
import { useTimer } from '@/features/pos/_hooks/useTimer'
import { fromCents, multiplyMoney, toCents } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import type { Product, Category, Resource, CartItem, PaymentLine, RefundableOrder } from '@/features/pos/_types'
import { formatCurrency } from '@/lib/currency'

interface POSClientViewProps {
  products: Product[]
  categories: Category[]
  resources: (Resource & { category?: { isTimed: boolean; hourlyRate: string | null } })[]
  shiftId: string
  orderId: string
  cashierName: string
  shiftOpenedAt?: Date
  initialCartItems?: CartItem[]
  initialTimerStartedAt?: Date | null
  initialTimerEndedAt?: Date | null
  initialTimerCharge?: string
  initialResourceId?: string | null
  refundableOrders?: RefundableOrder[]
}

export default function POSClientView({
  products,
  categories,
  resources,
  shiftId: _shiftId, // eslint-disable-line @typescript-eslint/no-unused-vars
  orderId,
  cashierName,
  shiftOpenedAt,
  initialCartItems = [],
  initialTimerStartedAt = null,
  initialTimerEndedAt = null,
  initialTimerCharge = '0',
  initialResourceId = null,
  refundableOrders = [],
}: POSClientViewProps) {
  const t = useTranslations('pos')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showResourceGrid, setShowResourceGrid] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems)
  const [isLoading, setIsLoading] = useState(false)
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(initialTimerStartedAt)
  const [timerRunning, setTimerRunning] = useState(Boolean(initialTimerStartedAt && !initialTimerEndedAt))
  const [timerCharge, setTimerCharge] = useState(initialTimerCharge)
  const [currentResourceId, setCurrentResourceId] = useState(initialResourceId)
  const [resourceOverrides, setResourceOverrides] = useState<Record<string, Resource['status']>>({})
  const resourceOptions = resources.map(resource => ({ ...resource, status: resourceOverrides[resource.id] ?? resource.status }))
  const [voidTarget, setVoidTarget] = useState<{ type: 'item' | 'order' | 'refund'; id: string; name: string } | null>(null)
  const { display: timerDisplay } = useTimer({ startedAt: timerStartedAt, isRunning: timerRunning })

  const handleAddProduct = useCallback(async (product: Product) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('orderId', orderId)
      formData.set('productId', product.id)
      formData.set('quantity', '1')
      formData.set('unitPrice', product.price)

      const result = await addItemAction(formData)
      if (result.error) {
        console.error('Failed to add item:', result.error)
        return
      }

      // Add to local cart with the orderItemId from the response
      const existing = cartItems.find(i => i.productId === product.id)
      if (existing) {
        setCartItems(prev => prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: multiplyMoney(i.unitPrice, i.quantity + 1) }
            : i
        ))
      } else {
        setCartItems(prev => [...prev, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
          orderItemId: result.item?.id,
        }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [cartItems, orderId])

  const handleVoidItem = useCallback(async (productId: string, reason: string) => {
    const item = cartItems.find(i => i.productId === productId)
    if (!item?.orderItemId) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      formData.set('reason', reason)
      const result = await voidItem(formData)
      if (result.error) throw new Error(result.error)
      setCartItems(prev => prev.filter(i => i.productId !== productId))
    } finally {
      setIsLoading(false)
    }
  }, [cartItems])

  const handleIncrementItem = useCallback(async (productId: string) => {
    const item = cartItems.find(i => i.productId === productId)
    if (!item?.orderItemId) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      formData.set('quantity', String(item.quantity + 1))
      await updateQuantityAction(formData)
      setCartItems(prev => prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: i.quantity + 1, totalPrice: multiplyMoney(i.unitPrice, i.quantity + 1) }
          : i
      ))
    } finally {
      setIsLoading(false)
    }
  }, [cartItems])

  const handleUpdateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const item = cartItems.find(i => i.productId === productId)
      if (item) setVoidTarget({ type: 'item', id: productId, name: item.productName })
      return
    }

    const item = cartItems.find(i => i.productId === productId)
    if (!item?.orderItemId) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      formData.set('quantity', String(quantity))
      await updateQuantityAction(formData)
      setCartItems(prev => prev.map(i =>
        i.productId === productId
          ? { ...i, quantity, totalPrice: multiplyMoney(i.unitPrice, quantity) }
          : i
      ))
    } finally {
      setIsLoading(false)
    }
  }, [cartItems])

  const handleClearOrder = useCallback(() => {
    setVoidTarget({ type: 'order', id: orderId, name: t('currentOrder') })
  }, [orderId, t])

  const handleSelectResource = useCallback(async (nextResourceId: string) => {
    setIsLoading(true)
    try {
      if (currentResourceId) {
        const result = await transferOrderAction(orderId, nextResourceId)
        setTimerCharge(result.timerCharge)
        setTimerStartedAt(result.timerStartedAt)
        setTimerRunning(Boolean(result.timerStartedAt))
      } else {
        const result = await assignResourceAction(orderId, nextResourceId)
        if (result.timerStartedAt) {
          setTimerStartedAt(result.timerStartedAt)
          setTimerRunning(true)
        }
      }
      setResourceOverrides(previous => ({
        ...previous,
        ...(currentResourceId ? { [currentResourceId]: 'available' as const } : {}),
        [nextResourceId]: 'occupied' as const,
      }))
      setCurrentResourceId(nextResourceId)
      setShowResourceGrid(false)
    } finally {
      setIsLoading(false)
    }
  }, [currentResourceId, orderId])

  const handleStopTimer = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await stopTimerAction(orderId)
      if (result) setTimerCharge(result.charge)
      setTimerRunning(false)
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  const subtotal = fromCents(cartItems.reduce((sum, item) => sum + toCents(item.totalPrice), 0))
  const total = fromCents(toCents(subtotal) + toCents(timerCharge))

  const handleCheckout = useCallback(async (payments: PaymentLine[]) => {
    const formData = new FormData()
    formData.set('orderId', orderId)
    formData.set('payments', JSON.stringify(payments))

    const result = await processCheckout(formData)
    if (result.error) {
      console.error('Checkout failed:', result.error)
      return
    }

    window.location.reload()
  }, [orderId])

  const handleVoidConfirm = useCallback(async (reason: string) => {
    if (!voidTarget) return
    setIsLoading(true)
    try {
      if (voidTarget.type === 'item') {
        await handleVoidItem(voidTarget.id, reason)
        setVoidTarget(null)
        return
      }
      const formData = new FormData()
      formData.set('orderId', voidTarget.id)
      formData.set('reason', reason)
      const result = voidTarget.type === 'refund'
        ? await refundOrderAction(formData)
        : await voidOrderAction(formData)
      if (result.error) throw new Error(result.error)
      window.location.reload()
    } finally {
      setIsLoading(false)
    }
  }, [handleVoidItem, voidTarget])

  return (
    <POSLayout shiftStatus="open" cashierName={cashierName} shiftOpenedAt={shiftOpenedAt}>
      <div className="flex gap-6 h-full px-6 py-4">
        {/* Left: Product grid or Resource grid */}
        <div className="flex-1">
          {showResourceGrid ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md font-semibold text-on-surface">{t('selectResource')}</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowResourceGrid(false)}
                >
                  {t('backToProducts')}
                </Button>
              </div>
              <ResourceGrid
                resources={resourceOptions}
                onSelectResource={handleSelectResource}
              />
            </div>
          ) : (
            <ProductGrid
              products={products}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onAddProduct={handleAddProduct}
            />
          )}
        </div>

        {/* Right: Order summary */}
        <OrderSummary
          items={cartItems}
          subtotal={subtotal}
          timerCharge={timerCharge}
          total={total}
          timerRunning={timerRunning}
          timerDisplay={timerDisplay}
          orderCreatedAt={timerStartedAt ?? undefined}
          onAddItem={handleIncrementItem}
          onVoidItem={productId => {
            const item = cartItems.find(row => row.productId === productId)
            if (item) setVoidTarget({ type: 'item', id: productId, name: item.productName })
          }}
          onUpdateQuantity={handleUpdateQuantity}
          onCheckout={() => setShowCheckout(true)}
          onClear={handleClearOrder}
          onStopTimer={handleStopTimer}
          disabled={isLoading}
        />
      </div>

      {/* Quick action: Toggle resource grid */}
      <div className="fixed bottom-6 start-6">
        <Button
          variant="secondary"
          onClick={() => setShowResourceGrid(!showResourceGrid)}
        >
          {showResourceGrid ? t('backToProducts') : t('selectResource')}
        </Button>
      </div>

      {refundableOrders.length > 0 && (
        <div className="fixed bottom-6 end-[22rem]">
          <details className="rounded-lg bg-surface-container-lowest p-3 shadow-lg">
            <summary className="cursor-pointer text-primary">{t('completedOrders')}</summary>
            <div className="mt-2 max-h-64 w-72 space-y-2 overflow-y-auto">
              {refundableOrders.map(order => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setVoidTarget({ type: 'refund', id: order.id, name: `${order.id.slice(0, 8)} · ${formatCurrency(order.totalAmount)} IQD` })}
                  className="block w-full rounded bg-surface-container-high p-2 text-start text-sm hover:bg-surface-container-highest"
                >
                  {order.id.slice(0, 8)} · {formatCurrency(order.totalAmount)} IQD
                </button>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          total={total}
          isOpen
          onClose={() => setShowCheckout(false)}
          onConfirm={handleCheckout}
        />
      )}
      <VoidModal
        isOpen={Boolean(voidTarget)}
        itemName={voidTarget?.name ?? ''}
        operation={voidTarget?.type}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoidConfirm}
      />
    </POSLayout>
  )
}
