"use client"

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { Minus, Plus, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CartItem } from '../_types'

const WARNING_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: string
  timerCharge: string
  total: string
  timerRunning?: boolean
  timerDisplay?: string
  orderCreatedAt?: Date
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
  orderCreatedAt,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  onClear,
  isLoading,
  disabled,
}: OrderSummaryProps) {
  const t = useTranslations('pos')
  const [elapsedMs, setElapsedMs] = useState(0)

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!orderCreatedAt || !timerRunning) {
      return
    }

    const updateElapsed = () => {
      setElapsedMs(Date.now() - orderCreatedAt.getTime())
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [orderCreatedAt, timerRunning])

  const isOverdue = elapsedMs > WARNING_THRESHOLD_MS

  // Format elapsed time as MM:SS
  const formatElapsed = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-80 flex flex-col bg-surface-container-lowest rounded-lg h-full">
      {/* Header */}
      <div className="p-4">
        <h2 className="text-headline-sm font-semibold text-on-surface">{t('title')}</h2>
        {timerRunning && (
          <div className={`flex items-center gap-2 mt-2 ${isOverdue ? 'text-warning animate-pulse-warning' : 'text-warning'}`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono text-display-sm">
              {timerDisplay || formatElapsed(elapsedMs)}
            </span>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-body-md text-on-surface-variant">{t('emptyCart')}</p>
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

      {/* Timer charge line */}
      {Number(timerCharge) > 0 && (
        <div className="px-4 py-2">
          <div className="flex justify-between text-body-sm text-on-surface-variant">
            <span>{t('timer')}</span>
            <span className="font-mono">{Number(timerCharge).toLocaleString()} IQD</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="p-4 space-y-2">
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
      <div className="p-4 space-y-2">
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