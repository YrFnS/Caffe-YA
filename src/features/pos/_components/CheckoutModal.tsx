"use client"

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Banknote, CreditCard, Plus, Smartphone, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency, fromCents, toCents } from '@/lib/currency'
import type { PaymentLine } from '../_types'

interface CheckoutModalProps {
  total: string
  isOpen: boolean
  onClose: () => void
  onConfirm: (payments: PaymentLine[]) => Promise<string | void>
}

export default function CheckoutModal({
  total,
  isOpen,
  onClose,
  onConfirm,
}: CheckoutModalProps) {
  const t = useTranslations('pos')
  const common = useTranslations('common')
  const dialogRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const [payments, setPayments] = useState<PaymentLine[]>([{ method: 'cash', amount: total }])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    processingRef.current = isProcessing
  }, [isProcessing])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    setPayments([{ method: 'cash', amount: total }])
    setError('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, select, input')?.focus()
    }, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processingRef.current) onCloseRef.current()
      if (event.key !== 'Tab' || !dialogRef.current) return

      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, total])

  if (!isOpen) return null

  const methods = {
    cash: { icon: Banknote, label: t('cash') },
    card: { icon: CreditCard, label: t('card') },
    mobile_wallet: { icon: Smartphone, label: t('mobileWallet') },
  }

  const paid = payments.reduce((sum, payment) => {
    try {
      return sum + toCents(payment.amount || '0')
    } catch {
      return sum
    }
  }, 0)
  const remaining = fromCents(toCents(total) - paid)
  const remainingAmount = toCents(remaining)
  const invalidReference = payments.some(payment => payment.method !== 'cash' && !payment.reference?.trim())

  const handleConfirm = async () => {
    setIsProcessing(true)
    setError('')
    try {
      const result = await onConfirm(payments)
      if (result) setError(result)
    } catch (actionError) {
      console.error('Checkout confirmation failed:', actionError)
      setError(common('error_description'))
    } finally {
      setIsProcessing(false)
    }
  }

  function updatePayment(index: number, patch: Partial<PaymentLine>) {
    setPayments(lines => lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  function addPayment() {
    if (remainingAmount <= 0) return
    setPayments(lines => [...lines, { method: 'card', amount: remaining }])
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-surface-container-highest/80 backdrop-blur-xl"
        onClick={() => !isProcessing && onClose()}
        aria-label={common('close')}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-[0_30px_80px_rgba(24,34,48,.22)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/40 p-4 sm:p-5">
          <h2 id="checkout-title" className="font-display text-xl font-semibold text-on-surface">
            {t('checkout')}
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={isProcessing} aria-label={common('close')}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto">
          <div className="bg-secondary/10 p-5 text-center sm:p-6">
            <p className="mb-1 text-sm text-on-surface-variant">{t('total')}</p>
            <p className="font-mono text-3xl font-bold text-secondary sm:text-4xl">
              {formatCurrency(total)} IQD
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-sm font-semibold text-on-surface-variant">{t('paymentMethod')}</p>
            {payments.map((payment, index) => {
              const Icon = methods[payment.method].icon
              return (
                <div key={index} className="space-y-3 rounded-xl bg-surface-container-low p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_8rem_3rem] items-center gap-2">
                    <label className="flex min-h-12 items-center gap-2 rounded-lg bg-surface-container-lowest px-3">
                      <Icon className="h-5 w-5 shrink-0 text-secondary" />
                      <select
                        aria-label={t('paymentMethod')}
                        value={payment.method}
                        onChange={event => updatePayment(index, {
                          method: event.target.value as PaymentLine['method'],
                          reference: undefined,
                        })}
                        className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none"
                      >
                        {Object.entries(methods).map(([id, method]) => (
                          <option key={id} value={id}>{method.label}</option>
                        ))}
                      </select>
                    </label>
                    <input
                      aria-label={t('amount')}
                      inputMode="decimal"
                      value={payment.amount}
                      onChange={event => updatePayment(index, { amount: event.target.value })}
                      className="h-12 min-w-0 rounded-lg bg-surface-container-lowest px-3 text-end font-mono text-sm text-on-surface outline-none focus:ring-4 focus:ring-secondary/15"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('removePayment')}
                      onClick={() => setPayments(lines => lines.filter((_, lineIndex) => lineIndex !== index))}
                      disabled={payments.length === 1}
                      className="text-tertiary"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  {payment.method !== 'cash' && (
                    <input
                      aria-label={t('reference')}
                      placeholder={t('reference')}
                      value={payment.reference ?? ''}
                      onChange={event => updatePayment(index, { reference: event.target.value })}
                      className="h-12 w-full rounded-lg bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:ring-4 focus:ring-secondary/15"
                    />
                  )}
                </div>
              )
            })}
            <Button type="button" variant="outline" onClick={addPayment} disabled={remainingAmount <= 0} className="w-full">
              <Plus className="h-4 w-4" /> {t('addPayment')}
            </Button>
          </div>
        </div>

        <div className="border-t border-outline-variant/40 p-4 sm:p-5">
          <div className={cn(
            'mb-3 flex justify-between rounded-xl px-3 py-2 text-sm font-semibold',
            remainingAmount === 0 ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary',
          )}>
            <span>{t('remaining')}</span>
            <span className="font-mono">{formatCurrency(remaining)} IQD</span>
          </div>
          {error && <p role="alert" className="mb-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          <Button
            size="lg"
            className="w-full"
            onClick={handleConfirm}
            disabled={isProcessing || remainingAmount !== 0 || invalidReference}
          >
            {isProcessing ? t('processing') : t('confirmPayment')}
          </Button>
        </div>
      </div>
    </div>
  )
}
