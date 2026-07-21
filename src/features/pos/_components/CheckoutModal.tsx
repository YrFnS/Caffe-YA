"use client"

import { useTranslations } from 'next-intl'
import { X, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { formatCurrency } from '@/lib/currency'

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
          {paymentMethods.map(({ id, icon: Icon, label }) => (
            <button
              type="button"
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
        <div className="p-4">
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handleConfirm}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? t('processing') : t('confirmPayment')}
          </Button>
        </div>
      </div>
    </div>
  )
}
