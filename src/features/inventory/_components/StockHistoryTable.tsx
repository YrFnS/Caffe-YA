"use client"

import { useLocale, useTranslations } from 'next-intl'
import { Table } from '@/components/ui/table'
import type { StockMovement } from '@/features/inventory/_types'
import { formatDateTime } from '@/lib/format'

interface StockHistoryTableProps {
  movements: StockMovement[]
}

export default function StockHistoryTable({ movements }: StockHistoryTableProps) {
  const t = useTranslations('inventory')
  const locale = useLocale()

  const columns = [
    {
      key: 'createdAt',
      label: t('date'),
      render: (row: StockMovement) => (
        <span className="text-on-surface-variant">
          {formatDateTime(row.createdAt, locale)}
        </span>
      ),
    },
    {
      key: 'type',
      label: t('type'),
      render: (row: StockMovement) => (
        <span className="text-on-surface-variant capitalize">
          {t(`movement.${row.type}`)}
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
      label: t('note'),
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
