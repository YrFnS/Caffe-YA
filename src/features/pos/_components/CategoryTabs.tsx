"use client"

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Category } from '../_types'

interface CategoryTabsProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryTabs({ categories, selectedId, onSelect }: CategoryTabsProps) {
  const t = useTranslations('pos')

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'flex-shrink-0 px-4 py-2 rounded-full text-label-md font-medium transition-colors',
          selectedId === null
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
        )}
      >
        {t('all') || 'All'}
      </button>
      {categories.map((cat) => (
        <button
          type="button"
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'flex-shrink-0 px-4 py-2 rounded-full text-label-md font-medium transition-colors',
            selectedId === cat.id
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}