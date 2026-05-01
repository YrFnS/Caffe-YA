"use client"

import { useTranslations } from 'next-intl'
import { Table } from '@/components/ui/table'
import type { StockMovement } from '@/features/inventory/_types'

interface StockHistoryTableProps {
  movements: StockMovement[]
}

const typeLabels: Record<string, string> = {
  purchase: 'Purchase',
  sale_deduction: 'Sale',
  wastage: 'Wastage',
  adjustment: 'Adjustment',
  opening_balance: 'Opening Balance',
}

export default function StockHistoryTable({ movements }: StockHistoryTableProps) {
  const t = useTranslations('inventory')

  const columns = [
    {
      key: 'createdAt',
      label: 'Date',
      render: (row: StockMovement) => (
        <span className="text-on-surface-variant">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'type',
      label: t('type'),
      render: (row: StockMovement) => (
        <span className="text-on-surface-variant capitalize">
          {typeLabels[row.type] || row.type}
        </span>
      ),
    },
    {
      key: 'quantity',
      label: t('stock'),
      render: (row: StockMovement) => (
        <span className={`font-mono ${row.quantity.startsWith('-') ? 'text-tertiary' : 'text-secondary'}`}>
          {row.quantity}
        </span>
      ),
    },
    {
      key: 'note',
      label: 'Note',
      render: (row: StockMovement) => (
        <span className="text-on-surface-variant">{row.note || '—'}</span>
      ),
    },
  ]

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
      <Table columns={columns} data={movements} emptyMessage={t('noResults')} />
    </div>
  )
}