"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import type { CartItem, ActiveOrder, Product } from '../_types'
import { fromCents, multiplyMoney, toCents } from '@/lib/currency'

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
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (order?.items && !isInitializedRef.current) {
      isInitializedRef.current = true
      setItems(order.items)
    }
  }, [order?.items])

  const addItem = useCallback(async (product: Product) => {
    setIsLoading(true)
    try {
      const existing = items.find(i => i.productId === product.id)
      if (existing) {
        await onUpdateQuantity(existing.orderItemId || existing.productId, existing.quantity + 1)
        setItems(prev => prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: multiplyMoney(i.unitPrice, i.quantity + 1) }
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
      if (item?.orderItemId) {
        await onRemoveItem(item.orderItemId)
      }
      setItems(prev => prev.filter(i => i.productId !== productId))
    } finally {
      setIsLoading(false)
    }
  }, [items, onRemoveItem])

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const item = items.find(i => i.productId === productId)
    if (!item?.orderItemId) return
    await onUpdateQuantity(item.orderItemId, quantity)
    setItems(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity, totalPrice: multiplyMoney(i.unitPrice, quantity) }
        : i
    ))
  }, [items, onUpdateQuantity])

  const clearCart = useCallback(async () => {
    await onClearOrder()
    setItems([])
  }, [onClearOrder])

  const subtotal = items.reduce((sum, item) => sum + toCents(item.totalPrice), 0)
  const total = subtotal + toCents(order?.timerCharge || '0')

  return {
    items,
    subtotal: fromCents(subtotal),
    timerCharge: order?.timerCharge || '0',
    total: fromCents(total),
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }
}
