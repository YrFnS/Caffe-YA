"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, CheckCircle } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deletePayrollEntryAction, markPayrollPaidAction } from '@/features/payroll/_actions/payrollActions'
import type { PayrollEntryRecord } from '@/features/payroll/_services/payrollService'
import { formatCurrency } from '@/lib/currency'
import { useLocale, useTranslations } from 'next-intl'
import { formatDate } from '@/lib/format'

interface PayrollEntryTableProps {
  entries: PayrollEntryRecord[]
  employeeNames: Record<string, string>
}

export default function PayrollEntryTable({ entries: initialEntries, employeeNames }: PayrollEntryTableProps) {
  const router = useRouter()
  const t = useTranslations('payroll')
  const locale = useLocale()
  const [entryList, setEntryList] = useState(initialEntries)

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    await deletePayrollEntryAction(id)
    setEntryList(prev => prev.filter(e => e.id !== id))
    router.refresh()
  }

  const handleMarkPaid = async (id: string) => {
    await markPayrollPaidAction(id)
    setEntryList(prev =>
      prev.map(e => e.id === id ? { ...e, isPaid: true, paidAt: new Date() } : e)
    )
    router.refresh()
  }


  const columns = [
    {
      key: 'employee',
      label: t('employee'),
      render: (row: PayrollEntryRecord) => (
        <span className="font-medium text-on-surface">{employeeNames[row.employeeId] ?? t('unknown')}</span>
      ),
    },
    {
      key: 'period',
      label: t('period'),
      render: (row: PayrollEntryRecord) => (
        <span className="text-on-surface-variant">
          {formatDate(row.periodStart, locale)} - {formatDate(row.periodEnd, locale)}
        </span>
      ),
    },
    {
      key: 'baseSalary',
      label: t('base'),
      render: (row: PayrollEntryRecord) => (
        <span className="font-mono text-on-surface">{formatCurrency(row.baseSalary)}</span>
      ),
    },
    {
      key: 'netAmount',
      label: t('net'),
      render: (row: PayrollEntryRecord) => (
        <span className="font-mono text-on-surface font-medium">{formatCurrency(row.netAmount)}</span>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (row: PayrollEntryRecord) => (
        row.isPaid
          ? <Badge variant="success">{t('paid')}</Badge>
          : <Badge variant="neutral">{t('unpaid')}</Badge>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row: PayrollEntryRecord) => (
        <div className="flex gap-1">
          {!row.isPaid && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleMarkPaid(row.id)}
              title={t('markPaid')}
            >
              <CheckCircle className="w-4 h-4 text-success" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/payroll?modal=edit&editId=${row.id}`)}
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
        <div />
        <Button onClick={() => router.push('/payroll?modal=add')}>
          {t('add')}
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={entryList} emptyMessage={t('none')} />
      </div>
    </div>
  )
}
