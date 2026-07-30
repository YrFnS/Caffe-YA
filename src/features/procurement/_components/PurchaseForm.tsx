'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { createPurchaseAction } from '../_actions/procurementActions'
import type { VendorRow } from '../_types'
import { formatCurrency, fromCents, multiplyDecimalMoney, toCents } from '@/lib/currency'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PurchaseFormProps {
  vendors: VendorRow[]
  ingredients: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; nameAr: string | null }>
  onSuccess: () => void
  onClose: () => void
}

interface LineItem {
  ingredientId: string
  productId: string
  quantity: string
  unitCost: string
}

const emptyLine = (): LineItem => ({ ingredientId: '', productId: '', quantity: '1', unitCost: '0' })

function lineTotal(item: LineItem) {
  try {
    return multiplyDecimalMoney(item.unitCost || '0', item.quantity || '0')
  } catch {
    return '0.000'
  }
}

export default function PurchaseForm({ vendors, ingredients, products, onSuccess, onClose }: PurchaseFormProps) {
  const t = useTranslations('procurement')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyLine()])

  const copy = locale === 'ar'
    ? {
        unpaidHelp: 'يُسجَّل أمر الشراء غير مدفوع. بعد استلام البضاعة اختر حساب الدفع لتسوية الذمم الدائنة.',
        quantity: 'الكمية',
        lineTotal: 'إجمالي السطر',
        invalidItems: 'أكمل مادة واحدة على الأقل بكمية أكبر من صفر وتكلفة صحيحة.',
        close: 'إغلاق',
      }
    : {
        unpaidHelp: 'Purchases are created unpaid. After receiving goods, choose the payment account to settle Accounts Payable.',
        quantity: 'Quantity',
        lineTotal: 'Line total',
        invalidItems: 'Complete at least one item with a quantity above zero and a valid cost.',
        close: 'Close',
      }

  const total = fromCents(items.reduce((sum, item) => sum + toCents(lineTotal(item)), 0))

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const itemsData = items
      .filter(item => item.ingredientId || item.productId)
      .map(item => ({
        ingredientId: item.ingredientId || null,
        productId: item.productId || null,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: lineTotal(item),
      }))
    if (!itemsData.length || itemsData.some(item => !item.quantity || !item.unitCost)) {
      setError(copy.invalidItems)
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.set('vendorId', vendorId)
      formData.set('note', note)
      formData.set('items', JSON.stringify(itemsData))

      const result = await createPurchaseAction(formData)
      if (result.error) {
        setError(result.error.replaceAll('_', ' '))
        return
      }
      onSuccess()
    } catch (actionError) {
      console.error('Create purchase failed:', actionError)
      setError(t('operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('newPurchase')}
      size="xl"
      closeLabel={copy.close}
      busy={loading}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('cancel')}</Button>
          <Button type="submit" form="purchase-form" disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </>
      )}
    >
      <form id="purchase-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <div role="alert" className="rounded-xl bg-error/10 p-3 text-sm text-error">{error}</div>}
        <p className="rounded-xl bg-primary/10 p-3 text-sm text-on-surface">{copy.unpaidHelp}</p>

        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {t('vendor')}
          <select
            value={vendorId}
            onChange={event => setVendorId(event.target.value)}
            className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface"
          >
            <option value="">{t('selectVendor')}</option>
            {vendors.filter(vendor => vendor.isActive).map(vendor => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
        </label>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-on-surface">{t('items')}</h3>
            <Button type="button" variant="secondary" onClick={() => setItems(rows => [...rows, emptyLine()])}>
              <Plus className="h-4 w-4" /> {t('addItem')}
            </Button>
          </div>

          {items.map((item, index) => (
            <article key={index} className="grid gap-3 rounded-2xl bg-surface-container-low p-4 lg:grid-cols-[minmax(0,1fr)_9rem_11rem_auto] lg:items-end">
              <label className="grid gap-1 text-sm font-medium text-on-surface">
                {t('item')}
                <select
                  aria-label={t('item')}
                  value={item.ingredientId ? `ingredient:${item.ingredientId}` : item.productId ? `product:${item.productId}` : ''}
                  onChange={event => {
                    const [kind, id = ''] = event.target.value.split(':')
                    setItems(rows => rows.map((row, rowIndex) => rowIndex === index
                      ? { ...row, ingredientId: kind === 'ingredient' ? id : '', productId: kind === 'product' ? id : '' }
                      : row))
                  }}
                  className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface"
                >
                  <option value="">{t('selectItem')}</option>
                  <optgroup label={t('ingredients')}>
                    {ingredients.map(ingredient => <option key={ingredient.id} value={`ingredient:${ingredient.id}`}>{ingredient.name}</option>)}
                  </optgroup>
                  <optgroup label={t('products')}>
                    {products.map(product => (
                      <option key={product.id} value={`product:${product.id}`}>
                        {locale === 'ar' ? product.nameAr || product.name : product.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <Input
                label={copy.quantity}
                type="number"
                min="0.001"
                step="0.001"
                value={item.quantity}
                onChange={event => updateItem(index, 'quantity', event.target.value)}
              />
              <Input
                label={t('unitCost')}
                type="number"
                min="0"
                step="0.001"
                value={item.unitCost}
                onChange={event => updateItem(index, 'unitCost', event.target.value)}
              />
              <div className="flex min-h-12 items-center justify-between gap-3 lg:justify-end">
                <div className="text-end">
                  <p className="text-xs text-on-surface-variant">{copy.lineTotal}</p>
                  <p className="font-mono text-sm font-semibold">{formatCurrency(lineTotal(item))} IQD</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setItems(rows => rows.length === 1 ? [emptyLine()] : rows.filter((_, rowIndex) => rowIndex !== index))}
                  aria-label={t('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </section>

        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {t('note')}
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={3}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
          />
        </label>

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-low p-4">
          <span className="font-semibold text-on-surface">{t('total')}</span>
          <span className="font-mono text-xl font-bold text-on-surface">{formatCurrency(total)} IQD</span>
        </div>
      </form>
    </Modal>
  )
}
