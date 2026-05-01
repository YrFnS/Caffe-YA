"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Unit } from '@/features/inventory/_types'
import { createIngredientAction, updateIngredientAction } from '@/features/inventory/_actions/ingredientActions'

interface IngredientModalProps {
  units: Unit[]
  editId?: string
}

export default function IngredientModal({ units, editId }: IngredientModalProps) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    unitId: '',
    stockQty: '0',
    costPerUnit: '0',
    lowStockThreshold: '0',
  })

  const handleClose = () => {
    router.push('/inventory/ingredients')
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
      formData.set('unitId', form.unitId)
      formData.set('stockQty', form.stockQty)
      formData.set('costPerUnit', form.costPerUnit)
      formData.set('lowStockThreshold', form.lowStockThreshold)

      if (editId) {
        await updateIngredientAction(formData)
      } else {
        await createIngredientAction(formData)
      }
      router.push('/inventory/ingredients')
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  const unitOptions = units.map((u) => ({ value: u.id, label: u.name }))

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
        <Select
          label={t('unit')}
          options={unitOptions}
          value={form.unitId}
          onChange={(e) => setForm({ ...form, unitId: e.target.value })}
          placeholder="Select unit"
        />
        <Input
          label={t('stock')}
          type="number"
          step="0.001"
          value={form.stockQty}
          onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
        />
        <Input
          label={t('costPerUnit')}
          type="number"
          step="0.001"
          value={form.costPerUnit}
          onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
        />
        <Input
          label={t('lowThreshold')}
          type="number"
          step="0.001"
          value={form.lowStockThreshold}
          onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
        />
      </form>
    </Modal>
  )
}