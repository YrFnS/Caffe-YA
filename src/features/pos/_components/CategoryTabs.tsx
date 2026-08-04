"use client"

import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Category } from '../_types'

interface CategoryTabsProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryTabs({ categories, selectedId, onSelect }: CategoryTabsProps) {
  const t = useTranslations('pos')
  const locale = useLocale()

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t('title')}>
      <button
        type="button"
        role="tab"
        aria-selected={selectedId === null}
        onClick={() => onSelect(null)}
        className={cn(
          'min-h-12 flex-shrink-0 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/20',
          selectedId === null
            ? 'bg-primary text-on-primary'
            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
        )}
      >
        {t('all')}
      </button>
      {categories.map(category => {
        const displayName = locale === 'ar' ? category.nameAr || category.name : category.name
        return (
          <button
            type="button"
            role="tab"
            aria-selected={selectedId === category.id}
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              'min-h-12 flex-shrink-0 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/20',
              selectedId === category.id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
            )}
          >
            {displayName}
          </button>
        )
      })}
    </div>
  )
}
