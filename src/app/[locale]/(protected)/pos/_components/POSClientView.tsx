"use client"

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import POSLayout from './POSLayout'
import ProductGrid from '@/features/pos/_components/ProductGrid'
import OrderSummary from '@/features/pos/_components/OrderSummary'
import ResourceGrid from '@/features/pos/_components/ResourceGrid'
import CheckoutModal from '@/features/pos/_components/CheckoutModal'
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
  shiftId: _shiftId,
  orderId,
  cashierName,
}: POSClientViewProps) {
  const t = useTranslations('pos')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showResourceGrid, setShowResourceGrid] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleAddProduct = useCallback(async (product: Product) => {
    setIsLoading(true)
    try {
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
        }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [cartItems])

  const handleRemoveItem = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(i => i.productId !== productId))
  }, [])

  const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId)
      return
    }
    setCartItems(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity, totalPrice: (Number(i.unitPrice) * quantity).toFixed(3) }
        : i
    ))
  }, [handleRemoveItem])

  const handleClearOrder = useCallback(() => {
    setCartItems([])
  }, [])

  const handleSelectResource = useCallback((resourceId: string) => {
    console.log('Resource selected:', resourceId)
    setShowResourceGrid(false)
  }, [])

  const handleCheckout = useCallback(async (method: string, reference?: string) => {
    console.log('Checkout:', method, reference, orderId)
    setShowCheckout(false)
    setCartItems([])
  }, [orderId])

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
          onAddItem={handleAddProduct}
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