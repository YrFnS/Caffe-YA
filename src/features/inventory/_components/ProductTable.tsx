"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { Product, ProductCategory } from '@/features/inventory/_types'

interface ProductTableProps {
  products: (Product & { categoryName: string })[]
  categories?: ProductCategory[]
}

export default function ProductTable({ products }: ProductTableProps) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.nameAr?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      label: t('name'),
      render: (row: Product & { categoryName: string }) => (
        <div>
          <p className="font-medium text-on-surface">{row.name}</p>
          {row.nameAr && (
            <p className="text-sm text-on-surface-variant" dir="rtl">{row.nameAr}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: t('categories'),
      render: (row: Product & { categoryName: string }) => (
        <span className="text-on-surface-variant">{row.categoryName || '—'}</span>
      ),
    },
    {
      key: 'type',
      label: t('type'),
      render: (row: Product) => (
        <span className="text-on-surface-variant capitalize">{row.type}</span>
      ),
    },
    {
      key: 'price',
      label: t('price'),
      render: (row: Product) => (
        <span className="font-mono">{Number(row.price).toLocaleString()} IQD</span>
      ),
    },
    {
      key: 'stock',
      label: t('stock'),
      render: (row: Product) => (
        <span className={row.trackStock ? 'text-on-surface' : 'text-on-surface-variant'}>
          {row.trackStock ? row.stockQty : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row: Product) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/inventory/products?modal=edit&editId=${row.id}`)}
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
        <Button onClick={() => router.push('/inventory/products?modal=add')}>
          {t('add')}
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={filtered} emptyMessage={t('noResults')} />
      </div>
    </div>
  )
}