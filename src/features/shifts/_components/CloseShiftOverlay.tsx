"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { closeShiftAction } from '../_actions/shiftActions'
import ActiveResourcesWarning from './ActiveResourcesWarning'

interface ActiveResource {
  id: string
  name: string
  orderId: string
}

interface CloseShiftOverlayProps {
  shiftId: string
  openingFloat: string
  cashSales: string
  cashExpenses: string
  activeResources: ActiveResource[]
  onClose?: () => void
  onSuccess?: () => void
}

export default function CloseShiftOverlay({
  shiftId,
  openingFloat,
  cashSales,
  cashExpenses,
  activeResources,
  onClose,
  onSuccess,
}: CloseShiftOverlayProps) {
  const t = useTranslations('shifts')
  const tCommon = useTranslations('common')
  const [countedCash, setCountedCash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExpected, setShowExpected] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [approverId, setApproverId] = useState('')

  const expected = (Number(openingFloat) + Number(cashSales) - Number(cashExpenses)).toFixed(3)
  const varianceNum = showExpected && countedCash ? Number(countedCash) - Number(expected) : 0
  const isOver = varianceNum > 0
  const isShort = varianceNum < 0

  const VARIANCE_THRESHOLD = 50000
  const requiresApproval = showExpected && Math.abs(varianceNum) > VARIANCE_THRESHOLD

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showExpected) {
      setShowExpected(true)
      return
    }

    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.set('shiftId', shiftId)
    fd.set('countedCash', countedCash)
    if (requiresApproval && approverId) fd.set('approvedBy', approverId)

    const result = await closeShiftAction(fd)
    if (result?.error) {
      if (result.error === 'ACTIVE_RESOURCES') {
        setError('ACTIVE_RESOURCES')
      } else {
        setError(result.error)
      }
      setLoading(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Glassmorphism backdrop — restricted to shift overlay per DESIGN.md */}
      <div className="absolute inset-0 bg-surface/60 backdrop-blur-xl" />

      <div className="relative bg-surface-container-lowest rounded-2xl p-8 w-full max-w-lg shadow-2xl">
        {!showExpected ? (
          <>
            {/* BLIND COUNT ENTRY — expected amount NOT shown */}
            <h2 className="text-headline-md font-semibold text-on-surface mb-1">
              {t('blindCountTitle')}
            </h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              {t('blindCountDesc')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeResources.length > 0 && (
                <ActiveResourcesWarning resources={activeResources} />
              )}

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1.5">
                  {t('countedCash')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder={t('cashPlaceholder')}
                  className="w-full h-14 px-4 bg-surface-container-highest rounded-lg text-body-lg text-on-surface
                    outline-none focus:ring-2 focus:ring-outline placeholder:text-on-surface-disabled text-end"
                  required
                />
              </div>

              {error === 'ACTIVE_RESOURCES' && (
                <p className="text-body-sm text-tertiary">{t('activeResourcesWarning')}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-lg bg-surface-container-high text-on-surface font-medium"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !countedCash || activeResources.length > 0}
                  className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50"
                >
                  {loading ? t('processing') : t('confirmClose')}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* VARIANCE REVEAL — expected now visible */}
            <h2 className="text-headline-md font-semibold text-on-surface mb-6">
              {t('variance')}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-label-sm text-on-surface-variant mb-1">{t('expectedCash')}</p>
                <p className="text-display-sm font-bold text-on-surface font-mono">
                  {Number(expected).toLocaleString()}
                </p>
              </div>
              <div className={`rounded-xl p-4 ${isOver ? 'bg-secondary/10' : isShort ? 'bg-tertiary/10' : 'bg-secondary/10'}`}>
                <p className="text-label-sm text-on-surface-variant mb-1">{t('variance')}</p>
                <p className={`text-display-sm font-bold font-mono ${
                  isOver ? 'text-secondary' : isShort ? 'text-tertiary' : 'text-secondary'
                }`}>
                  {isOver ? '+' : ''}{varianceNum.toLocaleString()}
                </p>
                <p className="text-label-sm mt-1">
                  {isOver ? t('varianceOver') : isShort ? t('varianceShort') : t('varianceOk')}
                </p>
              </div>
            </div>

            {requiresApproval && !needsApproval && (
              <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-body-sm text-warning">{t('managerApprovalRequired')}</p>
                <button
                  type="button"
                  onClick={() => setNeedsApproval(true)}
                  className="mt-2 text-label-md text-warning underline"
                >
                  {t('approveAndClose')}
                </button>
              </div>
            )}

            {requiresApproval && needsApproval && (
              <div className="mb-4">
                <label className="block text-label-md text-on-surface-variant mb-1.5">
                  {t('approvedBy')}
                </label>
                <input
                  type="text"
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  placeholder={t('approvedBy')}
                  className="w-full h-12 px-4 bg-surface-container-highest rounded-lg text-body-md text-on-surface
                    outline-none focus:ring-2 focus:ring-outline"
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && error !== 'ACTIVE_RESOURCES' && (
                <p className="text-body-sm text-tertiary">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpected(false)}
                  className="flex-1 h-12 rounded-lg bg-surface-container-high text-on-surface font-medium"
                >
                  {t('backToProducts')}
                </button>
                <button
                  type="submit"
                  disabled={loading || (requiresApproval && !approverId)}
                  className="flex-1 h-12 rounded-lg bg-tertiary text-on-primary font-medium disabled:opacity-50"
                >
                  {loading ? t('processing') : requiresApproval ? t('approveAndClose') : t('confirmClose')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
