"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createEmployeeAction, updateEmployeeAction } from '@/features/employees/_actions/employeeActions'
import type { EmployeeRecord } from '@/features/employees/_services/employeeService'

interface EmployeeModalProps {
  editId?: string
  existing?: EmployeeRecord | null
  users?: { id: string; name: string; email: string }[]
}

export default function EmployeeModal({ editId, existing, users }: EmployeeModalProps) {
  const router = useRouter()
  const t = useTranslations('employees')
  const common = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    phone: existing?.phone ?? '',
    salaryType: existing?.salaryType ?? 'fixed',
    salaryAmount: existing?.salaryAmount ?? '',
    hiredAt: existing?.hiredAt ? new Date(existing.hiredAt).toISOString().split('T')[0] : '',
    userId: existing?.userId ?? '',
  })

  const handleClose = () => {
    router.push('/employees')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      if (editId) {
        formData.set('id', editId)
      }
      formData.set('name', form.name)
      formData.set('phone', form.phone)
      formData.set('salaryType', form.salaryType)
      formData.set('salaryAmount', form.salaryAmount)
      if (form.hiredAt) formData.set('hiredAt', form.hiredAt)
      if (form.userId) formData.set('userId', form.userId)

      const result = editId
        ? await updateEmployeeAction(formData)
        : await createEmployeeAction(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push('/employees')
      router.refresh()
    } catch {
      setError(t('saveFailed'))
      setLoading(false)
    }
  }

  const salaryTypeOptions = [
    { value: 'fixed', label: t('fixed') },
    { value: 'hourly', label: t('hourly') },
  ]

  const userOptions = users
    ? [{ value: '', label: t('noLogin') }, ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))]
    : [{ value: '', label: t('noneOption') }]

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title={editId ? t('edit') : t('add')}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            {common('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('saving') : common('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-error">{error}</div>
        )}
        <Input
          label={t('name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder={t('namePlaceholder')}
        />
        <Input
          label={t('phone')}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+964 750 123 4567"
        />
        <Select
          label={t('salaryType')}
          options={salaryTypeOptions}
          value={form.salaryType}
          onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
        />
        <Input
          label={t('salaryAmount')}
          type="number"
          step="0.001"
          value={form.salaryAmount}
          onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
          required
          placeholder="0.000"
        />
        <Input
          label={t('hireDate')}
          type="date"
          value={form.hiredAt}
          onChange={(e) => setForm({ ...form, hiredAt: e.target.value })}
        />
        <Select
          label={t('linkUser')}
          options={userOptions}
          value={form.userId}
          onChange={(e) => setForm({ ...form, userId: e.target.value })}
        />
      </form>
    </Modal>
  )
}
