"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Resource } from '@/features/pos/_types'

interface ResourcesClientViewProps {
  resources: (Resource & { category?: { isTimed: boolean; hourlyRate: string | null; name: string } })[]
  categories: { id: string; name: string; isTimed: boolean }[]
  shiftId: string
}

export default function ResourcesClientView({
  resources,
  categories,
}: ResourcesClientViewProps) {
  const t = useTranslations('resources')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const filtered = selectedCategoryId
    ? resources.filter(r => r.categoryId === selectedCategoryId)
    : resources

  const statusStyles = {
    available: 'border-s-4 border-secondary bg-surface-container-lowest',
    occupied: 'border-s-4 border-tertiary bg-surface-container-lowest',
    maintenance: 'border-s-4 border-tertiary-fixed-dim bg-surface-container-low',
  }

  const statusBadgeStyles = {
    available: 'bg-secondary/10 text-secondary',
    occupied: 'bg-tertiary/10 text-tertiary',
    maintenance: 'bg-surface-container-high text-on-surface-variant',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-headline-lg font-semibold text-on-surface">
          {t('title')}
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          {t('description')}
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategoryId === null ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSelectedCategoryId(null)}
        >
          {t('all')}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategoryId === cat.id ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Resource grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
          <Monitor className="w-12 h-12 mb-4" />
          <p className="text-body-lg">{t('noResources')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              className={cn(
                'relative flex flex-col p-4 rounded-lg transition-all hover:scale-[1.02]',
                statusStyles[resource.status]
              )}
            >
              {/* Timed indicator */}
              {resource.category?.isTimed && (
                <div className="absolute top-3 end-3">
                  <Clock className="w-4 h-4 text-on-surface-variant" />
                </div>
              )}

              {/* Icon */}
              <div className="mb-3">
                <Monitor className={cn(
                  'w-8 h-8',
                  resource.status === 'available' ? 'text-secondary' : 'text-on-surface-variant'
                )} />
              </div>

              {/* Name */}
              <h3 className="text-body-md font-medium text-on-surface mb-1">
                {resource.name}
              </h3>

              {/* Category */}
              <p className="text-label-sm text-on-surface-variant mb-2">
                {resource.category?.name || 'Unknown'}
              </p>

              {/* Hourly rate for timed resources */}
              {resource.category?.isTimed && resource.category?.hourlyRate && (
                <p className="text-label-sm text-secondary font-medium mb-3">
                  {Number(resource.category.hourlyRate).toLocaleString()}/hr
                </p>
              )}

              {/* Status badge */}
              <div className={cn(
                'inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded self-start',
                statusBadgeStyles[resource.status]
              )}>
                {resource.status === 'available' && t('available')}
                {resource.status === 'occupied' && t('occupied')}
                {resource.status === 'maintenance' && t('maintenance')}
              </div>

              {/* Action button for available resources */}
              {resource.status === 'available' && (
                <div className="mt-3 pt-3">
                  <Button variant="ghost" size="sm" className="w-full">
                    {t('assign')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}