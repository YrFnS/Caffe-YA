'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { receivePurchaseAction } from '../_actions/procurementActions'
import { formatCurrency } from '@/lib/currency'
import type { PurchaseRow } from '../_types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface GoodsReceiptFormProps {
  purchase: PurchaseRow
  onClose: () => void
  onSuccess: () => void
}

export default function GoodsReceiptForm({ purchase, onClose, onSuccess }: GoodsReceiptFormProps) {
  const t = useTranslations('procurement')
  const locale = useLocale()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const copy = locale === 'ar'
    ? { close: 'إغلاق', help: 'سيتم تحديث كميات وتكلفة المخزون وإنشاء قيد المخزون مقابل الحسابات الدائنة.' }
    : { close: 'Close', help: 'Stock quantity and valuation will update, and Inventory will be posted against Accounts Payable.' }

  const receive = async () => {
    setSaving(true)
    setError('')
    try {
      const result = await receivePurchaseAction(purchase.id, note || undefined)
      if (result.error) {
        setError(result.error.replaceAll('_', ' '))
        return
      }
      onSuccess()
    } catch (actionError) {
      console.error('Receive purchase failed:', actionError)
      setError(t('operationFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('receiveGoods')}
      closeLabel={copy.close}
      busy={saving}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t('cancel')}</Button>
          <Button onClick={receive} disabled={saving}>{saving ? t('saving') : t('receiveGoods')}</Button>
        </>
      )}
    >
      <div className="space-y-4">
        {error && <div role="alert" className="rounded-xl bg-error/10 p-3 text-sm text-error">{error}</div>}
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant">{purchase.vendorName ?? '—'}</p>
          <p className="mt-1 font-mono text-xl font-bold">{formatCurrency(purchase.totalAmount)} IQD</p>
        </div>
        <p className="text-sm text-on-surface-variant">{copy.help}</p>
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {t('note')}
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={3}
            className="rounded-xl border border-outline-variant bg-surface p-3 text-on-surface"
          />
        </label>
      </div>
    </Modal>
  )
}
