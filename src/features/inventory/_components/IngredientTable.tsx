"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { Unit } from '@/features/inventory/_types'
import { formatCurrency } from '@/lib/currency'

interface IngredientWithUnitName {
  id: string
  name: string
  unitId: string
  stockQty: string
  lowStockThreshold: string | null
  costPerUnit: string | null
  isActive: boolean
  createdAt: Date
  unitName: string
}

interface IngredientTableProps {
  ingredients: IngredientWithUnitName[]
  units?: Unit[]
}

export default function IngredientTable({ ingredients }: IngredientTableProps) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      label: t('name'),
      render: (row: IngredientWithUnitName) => (
        <span className="font-medium text-on-surface">{row.name}</span>
      ),
    },
    {
      key: 'unit',
      label: t('unit'),
      render: (row: IngredientWithUnitName) => (
        <span className="text-on-surface-variant">{row.unitName}</span>
      ),
    },
    {
      key: 'stock',
      label: t('stock'),
      render: (row: IngredientWithUnitName) => (
        <span className="font-mono">{Number(row.stockQty).toFixed(3)}</span>
      ),
    },
    {
      key: 'costPerUnit',
      label: t('costPerUnit'),
      render: (row: IngredientWithUnitName) => (
        <span className="font-mono text-on-surface-variant">
          {formatCurrency(row.costPerUnit ?? '0')}
        </span>
      ),
    },
    {
      key: 'lowThreshold',
      label: t('lowThreshold'),
      render: (row: IngredientWithUnitName) => (
        <span className="font-mono text-on-surface-variant">
          {Number(row.lowStockThreshold).toFixed(3)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row: IngredientWithUnitName) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/inventory/ingredients?modal=edit&editId=${row.id}`)}
          >
            <Pencil className="w-4 h-4" />
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
        <Button onClick={() => router.push('/inventory/ingredients?modal=add')}>
          {t('add')}
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={filtered} emptyMessage={t('noResults')} />
      </div>
    </div>
  )
}
