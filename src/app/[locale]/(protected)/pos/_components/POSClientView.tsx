"use client"

import { useCallback, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ReceiptText, ShoppingCart, X } from 'lucide-react'
import { useRouter } from '@/lib/navigation'
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
import { formatCurrency, fromCents, multiplyMoney, toCents } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import type { Product, Category, Resource, CartItem, PaymentLine, RefundableOrder } from '@/features/pos/_types'

interface POSClientViewProps {
  products: Product[]
  categories: Category[]
  resources: (Resource & { category?: { isTimed: boolean; hourlyRate: string | null } })[]
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

type VoidTarget = {
  type: 'item' | 'order' | 'refund'
  id: string
  name: string
}

export default function POSClientView({
  products,
  categories,
  resources,
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
  const locale = useLocale()
  const router = useRouter()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showResourceGrid, setShowResourceGrid] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showMobileOrder, setShowMobileOrder] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(initialTimerStartedAt)
  const [timerRunning, setTimerRunning] = useState(Boolean(initialTimerStartedAt && !initialTimerEndedAt))
  const [timerCharge, setTimerCharge] = useState(initialTimerCharge)
  const [currentResourceId, setCurrentResourceId] = useState(initialResourceId)
  const [resourceOverrides, setResourceOverrides] = useState<Record<string, Resource['status']>>({})
  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)
  const [refundableOrderList, setRefundableOrderList] = useState(refundableOrders)
  const { display: timerDisplay } = useTimer({ startedAt: timerStartedAt, isRunning: timerRunning })

  const resourceOptions = resources.map(resource => ({
    ...resource,
    status: resourceOverrides[resource.id] ?? resource.status,
  }))

  const operationFailed = t('operationFailed')
  const reportError = useCallback((code?: string) => {
    if (code) console.error('POS operation failed:', code)
    setError(operationFailed)
  }, [operationFailed])

  const handleAddProduct = useCallback(async (product: Product) => {
    setIsLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('orderId', orderId)
      formData.set('productId', product.id)
      formData.set('quantity', '1')

      const result = await addItemAction(formData)
      if (result.error) {
        reportError(result.error)
        return
      }

      const productName = locale === 'ar' ? product.nameAr || product.name : product.name
      setCartItems(previous => {
        const existing = previous.find(item => item.productId === product.id)
        if (existing) {
          return previous.map(item => item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                totalPrice: multiplyMoney(item.unitPrice, item.quantity + 1),
              }
            : item)
        }
        return [...previous, {
          productId: product.id,
          productName,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
          orderItemId: result.item?.id,
        }]
      })
    } catch (actionError) {
      reportError(actionError instanceof Error ? actionError.message : undefined)
    } finally {
      setIsLoading(false)
    }
  }, [locale, orderId, reportError])

  const handleVoidItem = useCallback(async (productId: string, reason: string): Promise<string | void> => {
    const item = cartItems.find(row => row.productId === productId)
    if (!item?.orderItemId) return operationFailed

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      formData.set('reason', reason)
      const result = await voidItem(formData)
      if (result.error) {
        console.error('Void item failed:', result.error)
        return operationFailed
      }
      setCartItems(previous => previous.filter(row => row.productId !== productId))
    } catch (actionError) {
      console.error('Void item failed:', actionError)
      return operationFailed
    } finally {
      setIsLoading(false)
    }
  }, [cartItems, operationFailed])

  const handleIncrementItem = useCallback(async (productId: string) => {
    const item = cartItems.find(row => row.productId === productId)
    if (!item?.orderItemId) return

    setIsLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      formData.set('quantity', String(item.quantity + 1))
      const result = await updateQuantityAction(formData)
      if (result.error) {
        reportError(result.error)
        return
      }
      setCartItems(previous => previous.map(row => row.productId === productId
        ? {
            ...row,
            quantity: row.quantity + 1,
            totalPrice: multiplyMoney(row.unitPrice, row.quantity + 1),
          }
        : row))
    } catch (actionError) {
      reportError(actionError instanceof Error ? actionError.message : undefined)
    } finally {
      setIsLoading(false)
    }
  }, [cartItems, reportError])

  const handleUpdateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const item = cartItems.find(row => row.productId === productId)
      if (item) setVoidTarget({ type: 'item', id: productId, name: item.productName })
      return
    }

    const item = cartItems.find(row => row.productId === productId)
    if (!item?.orderItemId) return

    setIsLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      formData.set('quantity', String(quantity))
      const result = await updateQuantityAction(formData)
      if (result.error) {
        reportError(result.error)
        return
      }
      setCartItems(previous => previous.map(row => row.productId === productId
        ? { ...row, quantity, totalPrice: multiplyMoney(row.unitPrice, quantity) }
        : row))
    } catch (actionError) {
      reportError(actionError instanceof Error ? actionError.message : undefined)
    } finally {
      setIsLoading(false)
    }
  }, [cartItems, reportError])

  const handleClearOrder = useCallback(() => {
    setVoidTarget({ type: 'order', id: orderId, name: t('currentOrder') })
  }, [orderId, t])

  const handleSelectResource = useCallback(async (nextResourceId: string) => {
    setIsLoading(true)
    setError('')
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
    } catch (actionError) {
      reportError(actionError instanceof Error ? actionError.message : undefined)
    } finally {
      setIsLoading(false)
    }
  }, [currentResourceId, orderId, reportError])

  const handleStopTimer = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await stopTimerAction(orderId)
      if (!result) {
        reportError()
        return
      }
      setTimerCharge(result.charge)
      setTimerRunning(false)
    } catch (actionError) {
      reportError(actionError instanceof Error ? actionError.message : undefined)
    } finally {
      setIsLoading(false)
    }
  }, [orderId, reportError])

  const subtotal = fromCents(cartItems.reduce((sum, item) => sum + toCents(item.totalPrice), 0))
  const total = fromCents(toCents(subtotal) + toCents(timerCharge))
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = useCallback(async (payments: PaymentLine[]): Promise<string | void> => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('orderId', orderId)
      formData.set('payments', JSON.stringify(payments))
      const result = await processCheckout(formData)
      if (result.error) {
        console.error('Checkout failed:', result.error)
        return operationFailed
      }
      setShowCheckout(false)
      setShowMobileOrder(false)
      router.refresh()
    } catch (actionError) {
      console.error('Checkout failed:', actionError)
      return operationFailed
    } finally {
      setIsLoading(false)
    }
  }, [operationFailed, orderId, router])

  const handleVoidConfirm = useCallback(async (reason: string): Promise<string | void> => {
    if (!voidTarget) return operationFailed
    setIsLoading(true)
    try {
      if (voidTarget.type === 'item') {
        return await handleVoidItem(voidTarget.id, reason)
      }

      const formData = new FormData()
      formData.set('orderId', voidTarget.id)
      formData.set('reason', reason)
      const result = voidTarget.type === 'refund'
        ? await refundOrderAction(formData)
        : await voidOrderAction(formData)
      if (result.error) {
        console.error('POS reversal failed:', result.error)
        return operationFailed
      }

      if (voidTarget.type === 'refund') {
        setRefundableOrderList(previous => previous.filter(order => order.id !== voidTarget.id))
      } else {
        setShowMobileOrder(false)
        router.refresh()
      }
    } catch (actionError) {
      console.error('POS reversal failed:', actionError)
      return operationFailed
    } finally {
      setIsLoading(false)
    }
  }, [handleVoidItem, operationFailed, router, voidTarget])

  const renderOrderSummary = (className?: string) => (
    <OrderSummary
      className={className}
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
  )

  return (
    <POSLayout shiftStatus="open" cashierName={cashierName} shiftOpenedAt={shiftOpenedAt}>
      <div className="grid min-h-0 gap-4 px-0 py-3 lg:h-full lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-4">
        <div className="min-w-0">
          {error && (
            <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
              <span>{error}</span>
              <Button variant="ghost" size="icon" onClick={() => setError('')} aria-label={t('dismissError')}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowResourceGrid(previous => !previous)}
              disabled={isLoading}
            >
              {showResourceGrid ? t('backToProducts') : t('selectResource')}
            </Button>

            {refundableOrderList.length > 0 && (
              <details className="relative">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl bg-surface-container-high px-4 text-sm font-semibold text-on-surface">
                  <ReceiptText className="h-4 w-4" /> {t('completedOrders')}
                </summary>
                <div className="absolute end-0 z-30 mt-2 max-h-72 w-72 space-y-2 overflow-y-auto rounded-xl bg-surface-container-lowest p-3 shadow-[0_20px_55px_rgba(24,34,48,.18)]">
                  {refundableOrderList.map(order => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setVoidTarget({
                        type: 'refund',
                        id: order.id,
                        name: `${order.id.slice(0, 8)} · ${formatCurrency(order.totalAmount)} IQD`,
                      })}
                      className="block min-h-12 w-full rounded-lg bg-surface-container-low p-3 text-start text-sm hover:bg-surface-container-high"
                    >
                      {order.id.slice(0, 8)} · {formatCurrency(order.totalAmount)} IQD
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div className="min-h-[55vh] lg:h-[calc(100%-3.75rem)]">
            {showResourceGrid ? (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-on-surface">{t('selectResource')}</h2>
                <ResourceGrid
                  resources={resourceOptions}
                  onSelectResource={handleSelectResource}
                  disabled={isLoading}
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
        </div>

        <div className="hidden min-h-0 lg:block">
          {renderOrderSummary()}
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-24 z-40 flex gap-2 lg:hidden">
        <Button
          className="flex-1 shadow-[0_12px_35px_rgba(24,34,48,.2)]"
          onClick={() => setShowMobileOrder(true)}
        >
          <ShoppingCart className="h-5 w-5" />
          <span>{t('viewOrder')}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-xs">{itemCount}</span>
          <span className="ms-auto font-mono">{formatCurrency(total)}</span>
        </Button>
      </div>

      {showMobileOrder && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-surface lg:hidden" role="dialog" aria-modal="true" aria-label={t('title')}>
          <div className="flex h-16 items-center justify-between border-b border-outline-variant/50 px-4">
            <h2 className="font-display text-xl font-bold text-on-surface">{t('title')}</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowMobileOrder(false)} aria-label={t('closeOrder')}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 p-3">
            {renderOrderSummary()}
          </div>
        </div>
      )}

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
