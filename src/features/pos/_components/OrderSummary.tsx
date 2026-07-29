"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Minus, Package, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import type { CartItem } from '../_types'
import { formatCurrency, toCents } from '@/lib/currency'

const WARNING_THRESHOLD_MS = 10 * 60 * 1000

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: string
  timerCharge: string
  total: string
  timerRunning?: boolean
  timerDisplay?: string
  orderCreatedAt?: Date
  onAddItem: (productId: string) => void
  onVoidItem: (productId: string) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onCheckout: () => void
  onClear: () => void
  onStopTimer?: () => void
  isLoading?: boolean
  disabled?: boolean
  className?: string
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
  onVoidItem,
  onUpdateQuantity,
  onCheckout,
  onClear,
  onStopTimer,
  isLoading,
  disabled,
  className,
}: OrderSummaryProps) {
  const t = useTranslations('pos')
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!orderCreatedAt || !timerRunning) return

    const updateElapsed = () => {
      setElapsedMs(Date.now() - orderCreatedAt.getTime())
    }

    updateElapsed()
    const interval = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(interval)
  }, [orderCreatedAt, timerRunning])

  const isOverdue = elapsedMs > WARNING_THRESHOLD_MS

  const formatElapsed = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return [hours, minutes, seconds].map(value => value.toString().padStart(2, '0')).join(':')
  }

  return (
    <section className={cn(
      'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_16px_45px_rgba(24,34,48,.1)]',
      className,
    )} aria-label={t('title')}>
      <div className="border-b border-outline-variant/40 p-4 sm:p-5">
        <h2 className="font-display text-xl font-semibold text-on-surface">{t('title')}</h2>
        {timerRunning && (
          <div className={cn(
            'mt-3 flex items-center gap-3 rounded-xl bg-warning/10 p-3 text-warning',
            isOverdue && 'animate-pulse-warning',
          )}>
            <Clock className="h-5 w-5 shrink-0" />
            <span className="font-mono text-2xl font-bold tabular-nums">
              {timerDisplay || formatElapsed(elapsedMs)}
            </span>
          </div>
        )}
        {timerRunning && onStopTimer && (
          <Button variant="destructive" className="mt-3 w-full" onClick={onStopTimer} disabled={disabled}>
            {t('stopTimer')}
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('emptyCart')}
            className="h-full min-h-48 bg-surface-container-low"
          />
        ) : (
          items.map(item => (
            <article key={item.productId} className="rounded-xl bg-surface-container-low p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-on-surface">{item.productName}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {formatCurrency(item.unitPrice)} IQD × {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-on-surface">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                  disabled={disabled}
                  aria-label={t('decreaseQuantity')}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="min-w-10 text-center font-mono text-base font-bold tabular-nums">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAddItem(item.productId)}
                  disabled={disabled}
                  aria-label={t('increaseQuantity')}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-tertiary hover:text-tertiary"
                  onClick={() => onVoidItem(item.productId)}
                  disabled={disabled}
                  aria-label={t('removeItem')}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="border-t border-outline-variant/40 bg-surface-container-lowest p-4 sm:p-5">
        {toCents(timerCharge) > 0 && (
          <div className="mb-2 flex justify-between text-sm text-on-surface-variant">
            <span>{t('timer')}</span>
            <span className="font-mono">{formatCurrency(timerCharge)} IQD</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">{t('subtotal')}</span>
          <span className="font-mono">{formatCurrency(subtotal)} IQD</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="font-display text-lg font-bold text-on-surface">{t('total')}</span>
          <span className="text-end font-mono text-2xl font-bold text-secondary">{formatCurrency(total)} IQD</span>
        </div>

        <div className="mt-4 space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={onCheckout}
            disabled={(items.length === 0 && toCents(timerCharge) === 0) || timerRunning || disabled || isLoading}
          >
            {t('checkout')}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-tertiary"
            onClick={onClear}
            disabled={items.length === 0 || disabled || isLoading}
          >
            {t('clearOrder')}
          </Button>
        </div>
      </div>
    </section>
  )
}
