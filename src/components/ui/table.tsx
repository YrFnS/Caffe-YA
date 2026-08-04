"use client"

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export interface TableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  hideOnMobile?: boolean
  valueClassName?: string
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onSort?: (key: string, dir: 'asc' | 'desc') => void
  getRowId?: (row: T) => React.Key
  sortKey?: string | null
  sortDir?: 'asc' | 'desc' | null
  className?: string
}

function Table<T>({
  columns,
  data,
  loading,
  emptyMessage,
  onSort,
  getRowId,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  className,
}: TableProps<T>) {
  const t = useTranslations('common')
  const [localSort, setLocalSort] = React.useState<{ key: string | null; dir: 'asc' | 'desc' | null }>({
    key: null,
    dir: null,
  })
  const sortKey = controlledSortKey === undefined ? localSort.key : controlledSortKey
  const sortDir = controlledSortDir === undefined ? localSort.dir : controlledSortDir

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable || !onSort) return
    const nextDir = sortKey === column.key && sortDir === 'asc' ? 'desc' : 'asc'
    if (controlledSortKey === undefined) setLocalSort({ key: column.key, dir: nextDir })
    onSort(column.key, nextDir)
  }

  const renderValue = (row: T, column: TableColumn<T>) => column.render
    ? column.render(row)
    : ((row as Record<string, unknown>)[column.key] as React.ReactNode) ?? '—'

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center" role="status">
        <span className="text-on-surface-variant">{t('loading')}</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-on-surface-variant">{emptyMessage ?? t('noResults')}</span>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="hidden overflow-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm md:block">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-outline-variant bg-surface-container-low">
              {columns.map(column => {
                const active = sortKey === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.sortable && active ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
                    className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className="flex min-h-10 items-center gap-1 rounded-lg px-1 text-start hover:text-on-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                      >
                        {column.label}
                        {active && (sortDir === 'desc'
                          ? <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          : <ChevronUp className="h-4 w-4" aria-hidden="true" />)}
                      </button>
                    ) : column.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={getRowId ? getRowId(row) : index}
                className="border-b border-outline-variant/70 transition-colors last:border-0 hover:bg-surface-container-low/60"
              >
                {columns.map(column => (
                  <td key={column.key} className={cn('px-4 py-3 text-sm text-on-surface', column.valueClassName)}>
                    {renderValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {data.map((row, index) => (
          <article
            key={getRowId ? getRowId(row) : index}
            className="grid gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm"
          >
            {columns.filter(column => !column.hideOnMobile).map(column => (
              <div key={column.key} className="grid grid-cols-[minmax(7rem,0.75fr)_minmax(0,1.25fr)] items-start gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{column.label}</span>
                <div className={cn('min-w-0 text-sm text-on-surface', column.valueClassName)}>
                  {renderValue(row, column)}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  )
}

export { Table }
