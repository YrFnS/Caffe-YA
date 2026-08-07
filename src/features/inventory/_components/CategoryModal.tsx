"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ProductCategory } from '@/features/inventory/_types'
import { createCategoryAction, updateCategoryAction } from '@/features/inventory/_actions/categoryActions'

interface CategoryModalProps {
  category?: ProductCategory
  editId?: string
}

export default function CategoryModal({ category, editId }: CategoryModalProps) {
  const t = useTranslations('inventory')
  const common = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: category?.name || '',
    nameAr: category?.nameAr || '',
  })

  const handleClose = () => {
    router.push(`/${locale}/inventory/categories`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      if (editId) {
        formData.set('categoryId', editId)
      }
      formData.set('name', form.name)
      formData.set('nameAr', form.nameAr)

      const result = editId
        ? await updateCategoryAction(formData)
        : await createCategoryAction(formData)
      if (result.error) {
        setError(common('error_description'))
        return
      }
      router.push(`/${locale}/inventory/categories`)
      router.refresh()
    } catch {
      setError(common('error_description'))
    } finally {
      setLoading(false)
    }
  }

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
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
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
      </form>
    </Modal>
  )
}