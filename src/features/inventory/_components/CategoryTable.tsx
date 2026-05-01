"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { ProductCategory } from '@/features/inventory/_types'

interface CategoryTableProps {
  categories: ProductCategory[]
}

export default function CategoryTable({ categories }: CategoryTableProps) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.nameAr?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'name',
      label: t('name'),
      render: (row: ProductCategory) => (
        <div>
          <p className="font-medium text-on-surface">{row.name}</p>
          {row.nameAr && (
            <p className="text-sm text-on-surface-variant" dir="rtl">{row.nameAr}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row: ProductCategory) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/inventory/categories?modal=edit&editId=${row.id}`)}
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
        <Button onClick={() => router.push('/inventory/categories?modal=add')}>
          {t('add')}
        </Button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <Table columns={columns} data={filtered} emptyMessage={t('noResults')} />
      </div>
    </div>
  )
}