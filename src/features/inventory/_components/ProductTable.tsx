"use client"

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { useRouter } from '@/lib/navigation'
import { Table, type TableColumn } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { Product, ProductCategory } from '@/features/inventory/_types'
import { formatCurrency } from '@/lib/currency'

interface ProductTableProps {
  products: (Product & { categoryName: string })[]
  categories?: ProductCategory[]
}

type ProductRow = Product & { categoryName: string }

export default function ProductTable({ products, categories = [] }: ProductTableProps) {
  const t = useTranslations('inventory')
  const locale = useLocale()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const categoryMap = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories])
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase(locale)
    if (!term) return products
    return products.filter(product => {
      const category = product.categoryId ? categoryMap.get(product.categoryId) : undefined
      return [product.name, product.nameAr, category?.name, category?.nameAr]
        .filter(Boolean)
        .some(value => value!.toLocaleLowerCase(locale).includes(term))
    })
  }, [categoryMap, locale, products, search])

  const columns: TableColumn<ProductRow>[] = [
    {
      key: 'name',
      label: t('name'),
      render: row => {
        const displayName = locale === 'ar' ? row.nameAr || row.name : row.name
        const secondaryName = locale === 'ar' ? row.name : row.nameAr
        const imageSrc = row.localImageName
          ? row.localImageName.startsWith('http') ? row.localImageName : `/uploads/products/${row.localImageName}`
          : ''
        return (
          <div className="flex min-w-48 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-container-low">
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc} alt="" className="h-full w-full object-cover" />
              ) : <span className="font-semibold text-on-surface-variant">{displayName.charAt(0)}</span>}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-on-surface">{displayName}</p>
              {secondaryName && <p className="truncate text-xs text-on-surface-variant">{secondaryName}</p>}
              {!row.isActive && <span className="mt-1 inline-flex rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">{t('inactive')}</span>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'category',
      label: t('categories'),
      render: row => {
        const category = row.categoryId ? categoryMap.get(row.categoryId) : undefined
        return <span className="text-on-surface-variant">{category ? (locale === 'ar' ? category.nameAr || category.name : category.name) : '—'}</span>
      },
    },
    {
      key: 'type',
      label: t('type'),
      render: row => <span className="text-on-surface-variant">{t(row.type)}</span>,
    },
    {
      key: 'price',
      label: t('price'),
      valueClassName: 'font-mono',
      render: row => <span>{formatCurrency(row.price)} IQD</span>,
    },
    {
      key: 'stock',
      label: t('stock'),
      render: row => (
        <span className={row.trackStock ? 'text-on-surface' : 'text-on-surface-variant'}>
          {row.trackStock ? row.stockQty : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: row => (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => router.push(`/inventory/products?modal=edit&editId=${row.id}`)}
          aria-label={`${t('edit')} ${locale === 'ar' ? row.nameAr || row.name : row.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid flex-1 gap-1 text-sm font-medium text-on-surface sm:max-w-md">
          {t('search')}
          <input
            type="search"
            placeholder={t('search')}
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>
        <Button onClick={() => router.push('/inventory/products?modal=add')}>{t('add')}</Button>
      </div>
      <Table columns={columns} data={filtered} getRowId={row => row.id} emptyMessage={t('noResults')} />
    </div>
  )
}
