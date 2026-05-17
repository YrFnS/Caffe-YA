"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
      setError('Failed to save employee')
      setLoading(false)
    }
  }

  const salaryTypeOptions = [
    { value: 'fixed', label: 'Fixed' },
    { value: 'hourly', label: 'Hourly' },
  ]

  const userOptions = users
    ? [{ value: '', label: 'None (no login)' }, ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))]
    : [{ value: '', label: 'None' }]

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title={editId ? 'Edit Employee' : 'Add Employee'}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-error">{error}</div>
        )}
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="John Doe"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+964 750 123 4567"
        />
        <Select
          label="Salary Type"
          options={salaryTypeOptions}
          value={form.salaryType}
          onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
        />
        <Input
          label="Salary Amount"
          type="number"
          step="0.001"
          value={form.salaryAmount}
          onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
          required
          placeholder="0.000"
        />
        <Input
          label="Hire Date"
          type="date"
          value={form.hiredAt}
          onChange={(e) => setForm({ ...form, hiredAt: e.target.value })}
        />
        <Select
          label="Link to User (optional)"
          options={userOptions}
          value={form.userId}
          onChange={(e) => setForm({ ...form, userId: e.target.value })}
        />
      </form>
    </Modal>
  )
}
