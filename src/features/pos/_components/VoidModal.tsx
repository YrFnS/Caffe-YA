"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoidModalProps {
  isOpen: boolean
  itemName: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export default function VoidModal({ isOpen, itemName, onClose, onConfirm }: VoidModalProps) {
  const t = useTranslations('pos')
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setIsProcessing(true)
    try {
      await onConfirm(reason)
      setReason('')
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-surface-container-high/80 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-outline-variant/15">
          <div className="p-2 rounded-lg bg-tertiary/10">
            <AlertTriangle className="w-5 h-5 text-tertiary" />
          </div>
          <h2 className="text-headline-sm font-semibold text-on-surface">
            {t('voidItem')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors ms-auto"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-body-md text-on-surface">
            Are you sure you want to void <strong>{itemName}</strong>?
          </p>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-2"
              htmlFor="void-reason">
              {t('voidReason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for voiding..."
              className="w-full h-24 px-4 py-3 bg-surface-container-highest border-b-2 border-outline text-body-md text-on-surface placeholder:text-on-surface-disabled focus:border-outline focus:outline-none resize-none"
              id="void-reason"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-outline-variant/15 flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onClose}
            disabled={isProcessing}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-tertiary text-on-primary hover:bg-tertiary/90"
            onClick={handleConfirm}
            disabled={!reason.trim() || isProcessing}
          >
            {t('confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}