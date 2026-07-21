'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { receivePurchaseAction } from '../_actions/procurementActions'
import { formatCurrency } from '@/lib/currency'
import type { PurchaseRow } from '../_types'

export default function GoodsReceiptForm({ purchase, onClose }: { purchase: PurchaseRow; onClose: () => void }) {
  const t = useTranslations('procurement')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const receive = async () => {
    setSaving(true)
    const result = await receivePurchaseAction(purchase.id, note || undefined)
    setSaving(false)
    if (result.error) return setError(result.error)
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-surface-container-high p-6">
        <h2 className="mb-4 text-headline-sm font-semibold">{t('receiveGoods')}</h2>
        <p className="mb-4 text-body-sm text-on-surface-variant">
          {t('vendor')}: {purchase.vendorName ?? '—'} — {formatCurrency(purchase.totalAmount)} IQD
        </p>
        <label className="block text-body-sm">
          {t('note')}
          <textarea value={note} onChange={event => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-outline bg-surface p-3" />
        </label>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-outline px-4 py-2">{t('cancel')}</button>
          <button type="button" onClick={receive} disabled={saving} className="flex-1 rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{t('receiveGoods')}</button>
        </div>
      </div>
    </div>
  )
}
