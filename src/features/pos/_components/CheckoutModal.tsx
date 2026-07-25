"use client"

import { useTranslations } from 'next-intl'
import { X, Banknote, CreditCard, Smartphone, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { formatCurrency, fromCents, toCents } from '@/lib/currency'
import type { PaymentLine } from '../_types'

interface CheckoutModalProps {
  total: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (payments: PaymentLine[]) => Promise<void>
}

export default function CheckoutModal({
  total,
  isOpen,
  onClose,
  onConfirm,
}: CheckoutModalProps) {
  const t = useTranslations('pos')
  const [payments, setPayments] = useState<PaymentLine[]>([{ method: 'cash', amount: total }])
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm(payments)
    } finally {
      setIsProcessing(false)
    }
  }

  const methods = {
    cash: { icon: Banknote, label: t('cash') },
    card: { icon: CreditCard, label: t('card') },
    mobile_wallet: { icon: Smartphone, label: t('mobileWallet') },
  }
  const paid = payments.reduce((sum, payment) => {
    try { return sum + toCents(payment.amount || '0') } catch { return sum }
  }, 0)
  const remaining = fromCents(toCents(total) - paid)

  function updatePayment(index: number, patch: Partial<PaymentLine>) {
    setPayments(lines => lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  function addPayment() {
    setPayments(lines => [...lines, { method: 'card', amount: remaining }])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-surface-container-highest/80 backdrop-blur-xl cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-headline-sm font-semibold text-on-surface">
            {t('checkout')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Total display */}
        <div className="p-6 text-center">
          <p className="text-body-sm text-on-surface-variant mb-1">{t('total')}</p>
          <p className="text-display-lg font-bold text-secondary">
            {formatCurrency(total)} IQD
          </p>
        </div>

        {/* Payment methods */}
        <div className="p-4 space-y-3">
          <p className="text-label-md text-on-surface-variant">{t('paymentMethod')}</p>
          {payments.map((payment, index) => {
            const Icon = methods[payment.method].icon
            return (
              <div key={index} className="grid grid-cols-[1fr_7rem_auto] gap-2 rounded-lg bg-surface-container-high p-3">
                <label className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <select
                    aria-label={t('paymentMethod')}
                    value={payment.method}
                    onChange={event => updatePayment(index, { method: event.target.value as PaymentLine['method'], reference: undefined })}
                    className="min-w-0 flex-1 bg-transparent"
                  >
                    {Object.entries(methods).map(([id, method]) => <option key={id} value={id}>{method.label}</option>)}
                  </select>
                </label>
                <input
                  aria-label={t('amount')}
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={event => updatePayment(index, { amount: event.target.value })}
                  className="min-w-0 rounded border border-outline bg-surface-container-lowest px-2"
                />
                <button
                  type="button"
                  aria-label={t('removePayment')}
                  onClick={() => setPayments(lines => lines.filter((_, lineIndex) => lineIndex !== index))}
                  disabled={payments.length === 1}
                  className="p-2 text-tertiary disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {payment.method !== 'cash' && (
                  <input
                    aria-label={t('reference')}
                    placeholder={t('reference')}
                    value={payment.reference ?? ''}
                    onChange={event => updatePayment(index, { reference: event.target.value })}
                    className="col-span-3 h-10 rounded border border-outline bg-surface-container-lowest px-3"
                  />
                )}
              </div>
            )
          })}
          <button type="button" onClick={addPayment} className="flex items-center gap-2 text-primary">
            <Plus className="h-4 w-4" /> {t('addPayment')}
          </button>
        </div>

        <div className={cn('px-4 text-sm', remaining === '0.000' ? 'text-secondary' : 'text-tertiary')}>
          {t('remaining')}: {formatCurrency(remaining)} IQD
        </div>

        {/* Actions */}
        <div className="p-4">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handleConfirm}
            disabled={isProcessing || remaining !== '0.000' || payments.some(payment => payment.method !== 'cash' && !payment.reference?.trim())}
          >
            {isProcessing ? t('processing') : t('confirmPayment')}
          </Button>
        </div>
      </div>
    </div>
  )
}
