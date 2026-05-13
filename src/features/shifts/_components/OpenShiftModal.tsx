"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { openShiftAction } from '../_actions/shiftActions'

interface OpenShiftModalProps {
  onSuccess?: () => void
}

export default function OpenShiftModal({ onSuccess }: OpenShiftModalProps) {
  const t = useTranslations('shifts')
  const tCommon = useTranslations('common')
  const [float, setFloat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.set('openingFloat', float)

    const result = await openShiftAction(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-container-highest/80 backdrop-blur-xl" />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-headline-md font-semibold text-on-surface mb-2">
          {t('openShift')}
        </h2>
        <p className="text-body-md text-on-surface-variant mb-6">
          {t('openingFloat')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1.5">
              {t('openingFloat')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={float}
              onChange={(e) => setFloat(e.target.value)}
              placeholder={t('floatPlaceholder')}
              className="w-full h-14 px-4 bg-surface-container-highest rounded-lg text-body-lg text-on-surface
                outline-none focus:ring-2 focus:ring-outline placeholder:text-on-surface-disabled text-end"
              required
            />
          </div>

          {error && (
            <p className="text-body-sm text-tertiary">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 h-12 rounded-lg bg-surface-container-high text-on-surface font-medium"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !float}
              className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50"
            >
              {loading ? tCommon('loading') : tCommon('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
