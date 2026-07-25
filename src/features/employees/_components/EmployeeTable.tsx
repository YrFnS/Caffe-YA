"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteEmployeeAction } from '@/features/employees/_actions/employeeActions'
import type { EmployeeRecord } from '@/features/employees/_services/employeeService'
import { formatCurrency } from '@/lib/currency'
import { useLocale, useTranslations } from 'next-intl'
import { formatDate } from '@/lib/format'

interface EmployeeTableProps {
  employees: EmployeeRecord[]
}

export default function EmployeeTable({ employees: initialEmployees }: EmployeeTableProps) {
  const router = useRouter()
  const t = useTranslations('employees')
  const locale = useLocale()
  const [employeeList, setEmployeeList] = useState(initialEmployees)
  const [search, setSearch] = useState('')

  const filtered = employeeList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    await deleteEmployeeAction(id)
    setEmployeeList(prev => prev.filter(e => e.id !== id))
    router.refresh()
  }

  const columns = [
    {
      key: 'name',
      label: t('name'),
      render: (row: EmployeeRecord) => (
        <span className="font-medium text-on-surface">{row.name}</span>
      ),
    },
    {
      key: 'phone',
      label: t('phone'),
      render: (row: EmployeeRecord) => (
        <span className="text-on-surface-variant">{row.phone ?? '-'}</span>
      ),
    },
    {
      key: 'salary',
      label: t('salary'),
      render: (row: EmployeeRecord) => (
        <span className="font-mono text-on-surface">
          {formatCurrency(row.salaryAmount)} ({row.salaryType})
        </span>
      ),
    },
    {
      key: 'hiredAt',
      label: t('hired'),
      render: (row: EmployeeRecord) => (
        <span className="text-on-surface-variant">
          {row.hiredAt ? formatDate(row.hiredAt, locale) : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (row: EmployeeRecord) => (
        row.isActive
          ? <Badge variant="success">{t('active')}</Badge>
          : <Badge variant="neutral">{t('inactive')}</Badge>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row: EmployeeRecord) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/employees?modal=edit&editId=${row.id}`)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="w-4 h-4 text-error" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 px-4 rounded-lg border-b-2 border-outline bg-surface-container-highest text-sm outline-none focus:border-outline"
        />
        <Button onClick={() => router.push('/employees?modal=add')}>
          {t('add')}
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={filtered} emptyMessage={t('none')} />
      </div>
    </div>
  )
}
