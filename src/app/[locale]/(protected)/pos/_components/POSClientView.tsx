"use client"

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import POSLayout from './POSLayout'
import ProductGrid from '@/features/pos/_components/ProductGrid'
import OrderSummary from '@/features/pos/_components/OrderSummary'
import ResourceGrid from '@/features/pos/_components/ResourceGrid'
import CheckoutModal from '@/features/pos/_components/CheckoutModal'
import { addItemAction, removeItemAction, updateQuantityAction, clearOrderAction } from '@/features/pos/_actions/cart'
import { processCheckout } from '@/features/pos/_actions/checkout'
import { Button } from '@/components/ui/button'
import type { Product, Category, Resource, CartItem } from '@/features/pos/_types'

interface POSClientViewProps {
  products: Product[]
  categories: Category[]
  resources: (Resource & { category?: { isTimed: boolean; hourlyRate: string | null } })[]
  shiftId: string
  orderId: string
  cashierName: string
}

export default function POSClientView({
  products,
  categories,
  resources,
  shiftId: _shiftId, // eslint-disable-line @typescript-eslint/no-unused-vars
  orderId,
  cashierName,
}: POSClientViewProps) {
  const t = useTranslations('pos')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showResourceGrid, setShowResourceGrid] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_timerDisplay, setTimerDisplay] = useState<string>('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_timerRunning, setTimerRunning] = useState(false)

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
            ? { ...i, quantity: i.quantity + 1, totalPrice: (Number(i.unitPrice) * (i.quantity + 1)).toFixed(3) }
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

  const handleRemoveItem = useCallback(async (productId: string) => {
    const item = cartItems.find(i => i.productId === productId)
    if (!item?.orderItemId) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('itemId', item.orderItemId)
      await removeItemAction(formData)
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
          ? { ...i, quantity: i.quantity + 1, totalPrice: (Number(i.unitPrice) * (i.quantity + 1)).toFixed(3) }
          : i
      ))
    } finally {
      setIsLoading(false)
    }
  }, [cartItems])

  const handleUpdateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId)
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
          ? { ...i, quantity, totalPrice: (Number(i.unitPrice) * quantity).toFixed(3) }
          : i
      ))
    } finally {
      setIsLoading(false)
    }
  }, [cartItems, handleRemoveItem])

  const handleClearOrder = useCallback(async () => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.set('orderId', orderId)
      await clearOrderAction(formData)
      setCartItems([])
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  const handleSelectResource = useCallback(async (resourceId: string) => {
    console.log('Resource selected:', resourceId)
    // TODO: Wire to assignResourceToOrder server action
    setShowResourceGrid(false)
  }, [])

  const handleCheckout = useCallback(async (method: string, reference?: string) => {
    const total = cartItems.reduce((sum, i) => sum + Number(i.totalPrice), 0).toFixed(3)

    const formData = new FormData()
    formData.set('orderId', orderId)
    formData.set('paymentMethod', method)
    formData.set('amount', total)
    if (reference) formData.set('reference', reference)

    const result = await processCheckout(formData)
    if (result.error) {
      console.error('Checkout failed:', result.error)
      return
    }

    setShowCheckout(false)
    setCartItems([])
  }, [cartItems, orderId])

  const subtotal = cartItems.reduce((sum, i) => sum + Number(i.totalPrice), 0)

  return (
    <POSLayout shiftStatus="open" cashierName={cashierName}>
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
              onAddProduct={handleAddProduct}
            />
          )}
        </div>

        {/* Right: Order summary */}
        <OrderSummary
          items={cartItems}
          subtotal={subtotal.toFixed(3)}
          timerCharge="0"
          total={subtotal.toFixed(3)}
          timerRunning={_timerRunning}
          timerDisplay={_timerDisplay}
          onAddItem={handleIncrementItem}
          onRemoveItem={handleRemoveItem}
          onUpdateQuantity={handleUpdateQuantity}
          onCheckout={() => setShowCheckout(true)}
          onClear={handleClearOrder}
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

      {/* Checkout modal */}
      <CheckoutModal
        total={subtotal.toFixed(3)}
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onConfirm={handleCheckout}
      />
    </POSLayout>
  )
}