"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: category?.name || '',
    nameAr: category?.nameAr || '',
  })

  const handleClose = () => {
    router.push('/inventory/categories')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      if (editId) {
        formData.set('id', editId)
      }
      formData.set('name', form.name)
      formData.set('nameAr', form.nameAr)

      if (editId) {
        await updateCategoryAction(formData)
      } else {
        await createCategoryAction(formData)
      }
      router.push('/inventory/categories')
      router.refresh()
    } catch {
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