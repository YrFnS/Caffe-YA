"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/lib/navigation'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { ProductCategory, Product } from '@/features/inventory/_types'
import { createProductAction, updateProductAction } from '@/features/inventory/_actions/productActions'

interface ProductModalProps {
  categories: ProductCategory[]
  product?: Product
  editId?: string
}

export default function ProductModal({ categories, product, editId }: ProductModalProps) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: product?.name || '',
    nameAr: product?.nameAr || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'standard' as 'standard' | 'recipe' | 'service',
    price: product?.price || '',
    trackStock: product?.trackStock || false,
    stockQty: product?.stockQty || '0',
    lowStockThreshold: product?.lowStockThreshold || '0',
    costPerUnit: product?.costPerUnit || '0',
  })

  const handleClose = () => router.push('/inventory/products')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      if (editId) formData.set('productId', editId)
      formData.set('name', form.name)
      formData.set('nameAr', form.nameAr)
      formData.set('categoryId', form.categoryId)
      formData.set('type', form.type)
      formData.set('price', form.price)
      formData.set('trackStock', String(form.trackStock))
      formData.set('stockQty', form.stockQty)
      formData.set('lowStockThreshold', form.lowStockThreshold)
      formData.set('costPerUnit', form.costPerUnit)

      const result = editId
        ? await updateProductAction(formData)
        : await createProductAction(formData)
      if ('error' in result && result.error) {
        setError(result.error.replaceAll('_', ' '))
        return
      }

      router.push('/inventory/products')
      router.refresh()
    } catch (actionError) {
      console.error('Product save failed:', actionError)
      setError('SAVE FAILED')
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = categories.map(category => ({ value: category.id, label: category.name }))
  const tracksInventory = form.type === 'standard' && form.trackStock

  return (
    <Modal
      open
      onClose={handleClose}
      title={editId ? t('edit') : t('add')}
      footer={(
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="product-form" disabled={loading}>
            {loading ? t('loading') : t('save')}
          </Button>
        </>
      )}
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}
        <Input
          label={t('name')}
          value={form.name}
          onChange={event => setForm({ ...form, name: event.target.value })}
          required
        />
        <Input
          label={t('nameAr')}
          value={form.nameAr}
          onChange={event => setForm({ ...form, nameAr: event.target.value })}
          dir="rtl"
        />
        <Select
          label={t('categories')}
          options={categoryOptions}
          value={form.categoryId}
          onChange={event => setForm({ ...form, categoryId: event.target.value })}
          placeholder={t('selectCategory')}
        />
        <Select
          label={t('type')}
          options={[
            { value: 'standard', label: t('standard') },
            { value: 'recipe', label: t('recipe') },
            { value: 'service', label: t('service') },
          ]}
          value={form.type}
          onChange={event => {
            const type = event.target.value as 'standard' | 'recipe' | 'service'
            setForm({
              ...form,
              type,
              trackStock: type === 'standard' ? form.trackStock : false,
            })
          }}
        />
        <Input
          label={t('price')}
          type="number"
          min="0.001"
          step="0.001"
          value={form.price}
          onChange={event => setForm({ ...form, price: event.target.value })}
          required
        />
        {form.type === 'standard' && (
          <div className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              id="trackStock"
              className="h-5 w-5"
              checked={form.trackStock}
              onChange={event => setForm({ ...form, trackStock: event.target.checked })}
            />
            <label htmlFor="trackStock" className="text-sm text-on-surface">
              {t('tracked')}
            </label>
          </div>
        )}
        {tracksInventory && (
          <>
            <Input
              label={t('stock')}
              type="number"
              min="0"
              step="0.001"
              value={form.stockQty}
              onChange={event => setForm({ ...form, stockQty: event.target.value })}
            />
            <Input
              label={t('costPerUnit')}
              type="number"
              min="0"
              step="0.001"
              value={form.costPerUnit}
              onChange={event => setForm({ ...form, costPerUnit: event.target.value })}
              required
            />
            <Input
              label={t('lowThreshold')}
              type="number"
              min="0"
              step="0.001"
              value={form.lowStockThreshold}
              onChange={event => setForm({ ...form, lowStockThreshold: event.target.value })}
            />
          </>
        )}
      </form>
    </Modal>
  )
}
