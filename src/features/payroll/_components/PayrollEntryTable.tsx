"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, CheckCircle } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deletePayrollEntryAction, markPayrollPaidAction } from '@/features/payroll/_actions/payrollActions'
import type { PayrollEntryRecord } from '@/features/payroll/_services/payrollService'

interface PayrollEntryTableProps {
  entries: PayrollEntryRecord[]
  employeeNames: Record<string, string>
}

export default function PayrollEntryTable({ entries: initialEntries, employeeNames }: PayrollEntryTableProps) {
  const router = useRouter()
  const [entryList, setEntryList] = useState(initialEntries)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payroll entry?')) return
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

  const formatCurrency = (value: string) => Number(value).toLocaleString()

  const columns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (row: PayrollEntryRecord) => (
        <span className="font-medium text-on-surface">{employeeNames[row.employeeId] ?? 'Unknown'}</span>
      ),
    },
    {
      key: 'period',
      label: 'Period',
      render: (row: PayrollEntryRecord) => (
        <span className="text-on-surface-variant">
          {new Date(row.periodStart).toLocaleDateString()} - {new Date(row.periodEnd).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'baseSalary',
      label: 'Base',
      render: (row: PayrollEntryRecord) => (
        <span className="font-mono text-on-surface">{formatCurrency(row.baseSalary)}</span>
      ),
    },
    {
      key: 'netAmount',
      label: 'Net',
      render: (row: PayrollEntryRecord) => (
        <span className="font-mono text-on-surface font-medium">{formatCurrency(row.netAmount)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: PayrollEntryRecord) => (
        row.isPaid
          ? <Badge variant="success">Paid</Badge>
          : <Badge variant="neutral">Unpaid</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: PayrollEntryRecord) => (
        <div className="flex gap-1">
          {!row.isPaid && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleMarkPaid(row.id)}
              title="Mark as paid"
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
          Add Payroll Entry
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={entryList} emptyMessage="No payroll entries found" />
      </div>
    </div>
  )
}
