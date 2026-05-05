'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createPurchaseAction } from '../_actions/procurementActions'
import type { VendorRow } from '../_types'

interface PurchaseFormProps {
  vendors: VendorRow[]
  onSuccess: () => void
  onClose: () => void
}

interface LineItem {
  ingredientId: string
  productId: string
  name: string
  quantity: string
  unitCost: string
}

export default function PurchaseForm({ vendors, onSuccess, onClose }: PurchaseFormProps) {
  const t = useTranslations('procurement')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [note, setNote] = useState('')
  const [items, setItems] = useState<LineItem[]>([])

  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitCost), 0).toFixed(3)

  function addItem() {
    setItems([...items, { ingredientId: '', productId: '', name: '', quantity: '1', unitCost: '0' }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const itemsData = items
      .filter(i => i.ingredientId || i.productId)
      .map(i => ({
        ingredientId: i.ingredientId || null,
        productId: i.productId || null,
        quantity: i.quantity,
        unitCost: i.unitCost,
        totalCost: (Number(i.quantity) * Number(i.unitCost)).toFixed(3),
      }))

    const formData = new FormData()
    formData.set('vendorId', vendorId)
    formData.set('isPaid', String(isPaid))
    formData.set('note', note)
    formData.set('items', JSON.stringify(itemsData))

    const result = await createPurchaseAction(formData)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-headline-sm font-semibold mb-4">{t('newPurchase')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">{t('vendor')}</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface">
              <option value="">{t('selectVendor')}</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">{t('items')}</label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <input placeholder={t('ingredientId')} value={item.ingredientId} onChange={e => updateItem(idx, 'ingredientId', e.target.value)} className="flex-1 px-2 py-1 rounded border border-outline-variable bg-surface-container-lowest text-on-surface text-sm" />
                <input placeholder={t('qty')} value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-20 px-2 py-1 rounded border border-outline-variable bg-surface-container-lowest text-on-surface text-sm" />
                <input placeholder={t('unitCost')} value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', e.target.value)} className="w-28 px-2 py-1 rounded border border-outline-variable bg-surface-container-lowest text-on-surface text-sm" />
                <span className="w-24 text-body-sm">{(Number(item.quantity) * Number(item.unitCost)).toFixed(3)}</span>
                <button type="button" onClick={() => removeItem(idx)} className="text-error text-sm">✕</button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-primary text-body-sm hover:underline">{t('addItem')}</button>
          </div>
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">{t('note')}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPaid" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
            <label htmlFor="isPaid" className="text-body-sm text-on-surface">{t('paid')}</label>
          </div>
          <div className="flex justify-end text-headline-sm font-semibold">
            {t('total')}: {Number(total).toLocaleString()}
          </div>
          {error && <p className="text-error text-body-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
            <button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50">
              {loading ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}