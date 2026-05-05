'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createVendorAction, updateVendorAction, deleteVendorAction } from '../_actions/procurementActions'
import type { VendorRow } from '../_types'

interface VendorModalProps {
  vendor?: VendorRow | null
  onSuccess: () => void
  onClose: () => void
}

export default function VendorModal({ vendor, onSuccess, onClose }: VendorModalProps) {
  const t = useTranslations('procurement')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = vendor
      ? await updateVendorAction(vendor.id, formData)
      : await createVendorAction(formData)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-headline-sm font-semibold mb-4">
          {vendor ? t('editVendor') : t('addVendor')}
        </h2>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">{t('name')}</label>
            <input
              name="name"
              defaultValue={vendor?.name ?? ''}
              className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface"
              required
            />
          </div>
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">{t('phone')}</label>
            <input
              name="phone"
              defaultValue={vendor?.phone ?? ''}
              className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface"
            />
          </div>
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">{t('address')}</label>
            <textarea
              name="address"
              defaultValue={vendor?.address ?? ''}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface"
            />
          </div>
          {error && <p className="text-error text-body-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50">
              {loading ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}