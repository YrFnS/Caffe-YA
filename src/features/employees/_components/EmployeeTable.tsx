"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { deleteEmployeeAction } from '@/features/employees/_actions/employeeActions'
import type { EmployeeRecord } from '@/features/employees/_services/employeeService'

interface EmployeeTableProps {
  employees: EmployeeRecord[]
}

export default function EmployeeTable({ employees: initialEmployees }: EmployeeTableProps) {
  const router = useRouter()
  const [employeeList, setEmployeeList] = useState(initialEmployees)
  const [search, setSearch] = useState('')

  const filtered = employeeList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return
    await deleteEmployeeAction(id)
    setEmployeeList(prev => prev.filter(e => e.id !== id))
    router.refresh()
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: EmployeeRecord) => (
        <span className="font-medium text-on-surface">{row.name}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row: EmployeeRecord) => (
        <span className="text-on-surface-variant">{row.phone ?? '-'}</span>
      ),
    },
    {
      key: 'salary',
      label: 'Salary',
      render: (row: EmployeeRecord) => (
        <span className="font-mono text-on-surface">
          {Number(row.salaryAmount).toLocaleString()} ({row.salaryType})
        </span>
      ),
    },
    {
      key: 'hiredAt',
      label: 'Hired',
      render: (row: EmployeeRecord) => (
        <span className="text-on-surface-variant">
          {row.hiredAt ? new Date(row.hiredAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: EmployeeRecord) => (
        row.isActive
          ? <Badge variant="success">Active</Badge>
          : <Badge variant="neutral">Inactive</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
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
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 px-4 rounded-lg border-b-2 border-outline bg-surface-container-highest text-sm outline-none focus:border-outline"
        />
        <Button onClick={() => router.push('/employees?modal=add')}>
          Add Employee
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={filtered} emptyMessage="No employees found" />
      </div>
    </div>
  )
}
