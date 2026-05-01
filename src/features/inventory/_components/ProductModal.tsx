"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const [form, setForm] = useState({
    name: product?.name || '',
    nameAr: product?.nameAr || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'standard' as 'standard' | 'recipe' | 'service',
    price: product?.price || '',
    trackStock: product?.trackStock || false,
    stockQty: product?.stockQty || '0',
    lowStockThreshold: product?.lowStockThreshold || '0',
  })

  const handleClose = () => {
    router.push('/inventory/products')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      if (editId) {
        formData.set('productId', editId)
      }
      formData.set('name', form.name)
      formData.set('nameAr', form.nameAr)
      formData.set('categoryId', form.categoryId)
      formData.set('type', form.type)
      formData.set('price', form.price)
      formData.set('trackStock', String(form.trackStock))
      formData.set('stockQty', form.stockQty)
      formData.set('lowStockThreshold', form.lowStockThreshold)

      if (editId) {
        await updateProductAction(formData)
      } else {
        await createProductAction(formData)
      }
      router.push('/inventory/products')
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title={editId ? t('edit') : t('add')}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('loading') : t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label={t('nameAr')}
          value={form.nameAr}
          onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
          dir="rtl"
        />
        <Select
          label={t('categories')}
          options={categoryOptions}
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          placeholder="Select category"
        />
        <Select
          label={t('type')}
          options={[
            { value: 'standard', label: t('standard') },
            { value: 'recipe', label: t('recipe') },
            { value: 'service', label: t('service') },
          ]}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as 'standard' | 'recipe' | 'service' })}
        />
        <Input
          label={t('price')}
          type="number"
          step="0.001"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="trackStock"
            checked={form.trackStock}
            onChange={(e) => setForm({ ...form, trackStock: e.target.checked })}
          />
          <label htmlFor="trackStock" className="text-sm text-on-surface">{t('tracked')}</label>
        </div>
        {form.trackStock && (
          <>
            <Input
              label={t('stock')}
              type="number"
              step="0.001"
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
            />
            <Input
              label={t('lowThreshold')}
              type="number"
              step="0.001"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
          </>
        )}
      </form>
    </Modal>
  )
}