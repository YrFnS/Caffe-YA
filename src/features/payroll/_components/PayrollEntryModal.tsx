"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createPayrollEntryAction, updatePayrollEntryAction } from '@/features/payroll/_actions/payrollActions'
import type { PayrollEntryRecord } from '@/features/payroll/_services/payrollService'
import { useTranslations } from 'next-intl'

interface PayrollEntryModalProps {
  editId?: string
  existing?: PayrollEntryRecord | null
  employees: { id: string; name: string }[]
}

export default function PayrollEntryModal({ editId, existing, employees }: PayrollEntryModalProps) {
  const router = useRouter()
  const t = useTranslations('payroll')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    employeeId: existing?.employeeId ?? '',
    periodStart: existing?.periodStart ? new Date(existing.periodStart).toISOString().split('T')[0] : '',
    periodEnd: existing?.periodEnd ? new Date(existing.periodEnd).toISOString().split('T')[0] : '',
    baseSalary: existing?.baseSalary ?? '',
    bonuses: existing?.bonuses ?? '0',
    deductions: existing?.deductions ?? '0',
    note: existing?.note ?? '',
  })

  const handleClose = () => {
    router.push('/payroll')
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
      formData.set('employeeId', form.employeeId)
      formData.set('periodStart', form.periodStart)
      formData.set('periodEnd', form.periodEnd)
      formData.set('baseSalary', form.baseSalary)
      formData.set('bonuses', form.bonuses)
      formData.set('deductions', form.deductions)
      formData.set('note', form.note)

      const result = editId
        ? await updatePayrollEntryAction(formData)
        : await createPayrollEntryAction(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push('/payroll')
      router.refresh()
    } catch {
      setError(t('saveFailed'))
      setLoading(false)
    }
  }

  const employeeOptions = employees.map(e => ({ value: e.id, label: e.name }))

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
            {loading ? t('saving') : t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-error">{error}</div>
        )}
        <Select
          label={t('employee')}
          options={employeeOptions}
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          placeholder={t('selectEmployee')}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('periodStart')}
            type="date"
            value={form.periodStart}
            onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
            required
          />
          <Input
            label={t('periodEnd')}
            type="date"
            value={form.periodEnd}
            onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
            required
          />
        </div>
        <Input
          label={t('baseSalary')}
          type="number"
          step="0.001"
          value={form.baseSalary}
          onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
          required
          placeholder="0.000"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('bonuses')}
            type="number"
            step="0.001"
            value={form.bonuses}
            onChange={(e) => setForm({ ...form, bonuses: e.target.value })}
            placeholder="0.000"
          />
          <Input
            label={t('deductions')}
            type="number"
            step="0.001"
            value={form.deductions}
            onChange={(e) => setForm({ ...form, deductions: e.target.value })}
            placeholder="0.000"
          />
        </div>
        <Input
          label={t('note')}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder={t('notePlaceholder')}
        />
      </form>
    </Modal>
  )
}
