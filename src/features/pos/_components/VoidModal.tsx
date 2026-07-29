"use client"

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoidModalProps {
  isOpen: boolean
  itemName: string
  operation?: 'item' | 'order' | 'refund'
  onClose: () => void
  onConfirm: (reason: string) => Promise<string | void>
}

export default function VoidModal({
  isOpen,
  itemName,
  operation = 'item',
  onClose,
  onConfirm,
}: VoidModalProps) {
  const t = useTranslations('pos')
  const common = useTranslations('common')
  const dialogRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const [reason, setReason] = useState('')
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

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus(), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processingRef.current) onCloseRef.current()
      if (event.key !== 'Tab' || !dialogRef.current) return

      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [isOpen])

  if (!isOpen) return null

  const isRefund = operation === 'refund'
  const title = t(isRefund ? 'refundOrder' : operation === 'order' ? 'voidOrder' : 'voidItem')

  const handleClose = () => {
    if (isProcessing) return
    setReason('')
    setError('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setIsProcessing(true)
    setError('')
    try {
      const result = await onConfirm(reason.trim())
      if (result) {
        setError(result)
        return
      }
      setReason('')
      setError('')
      onClose()
    } catch (actionError) {
      console.error('Reversal confirmation failed:', actionError)
      setError(common('error_description'))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-surface-container-highest/80 backdrop-blur-xl"
        onClick={handleClose}
        aria-label={common('close')}
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reversal-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-surface-container-lowest shadow-[0_30px_80px_rgba(24,34,48,.22)] sm:rounded-3xl"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant/40 p-4 sm:p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-tertiary/10">
            <AlertTriangle className="h-6 w-6 text-tertiary" />
          </div>
          <h2 id="reversal-title" className="font-display text-xl font-semibold text-on-surface">
            {title}
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={handleClose} disabled={isProcessing} className="ms-auto" aria-label={common('close')}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <p className="text-sm leading-6 text-on-surface">
            {t(isRefund ? 'confirmRefundDescription' : 'confirmVoidDescription', { name: itemName })}
          </p>

          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface-variant" htmlFor="void-reason">
              {t('voidReason')}
            </label>
            <textarea
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder={t(isRefund ? 'refundReasonPlaceholder' : 'voidReasonPlaceholder')}
              className="h-28 w-full resize-none rounded-xl bg-surface-container-low p-4 text-sm text-on-surface outline-none placeholder:text-on-surface-disabled focus:ring-4 focus:ring-secondary/15"
              id="void-reason"
              maxLength={500}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-outline-variant/40 p-4 sm:p-5">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={isProcessing}>
            {common('cancel')}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!reason.trim() || isProcessing}
          >
            {isProcessing ? t('processing') : common('confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
