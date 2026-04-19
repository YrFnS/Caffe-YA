"use client"

import { useTranslations } from 'next-intl'
import { Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Resource } from '../_types'

interface ResourceCardProps {
  resource: Resource & { category?: { isTimed: boolean; hourlyRate: string | null } }
  onClick: () => void
  disabled?: boolean
}

export default function ResourceCard({ resource, onClick, disabled }: ResourceCardProps) {
  const t = useTranslations('pos')

  const statusStyles = {
    available: 'bg-surface-container-lowest border-s-4 border-secondary',
    occupied: 'bg-surface-container-lowest border-s-4 border-tertiary',
    maintenance: 'bg-surface-container-low border-s-4 border-tertiary-fixed-dim',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || resource.status === 'maintenance'}
      className={cn(
        'relative flex flex-col p-4 rounded-lg transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        statusStyles[resource.status],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <Monitor className={cn(
          'w-8 h-8',
          resource.status === 'available' ? 'text-secondary' : 'text-on-surface-variant'
        )} />
        {resource.category?.isTimed && resource.category?.hourlyRate && (
          <span className="text-label-sm text-on-surface-variant">
            {Number(resource.category.hourlyRate).toLocaleString()}/hr
          </span>
        )}
      </div>

      <h3 className="text-body-md font-medium text-on-surface mb-1">{resource.name}</h3>

      <div className={cn(
        'inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded self-start',
        resource.status === 'available' && 'bg-secondary/10 text-secondary',
        resource.status === 'occupied' && 'bg-tertiary/10 text-tertiary',
        resource.status === 'maintenance' && 'bg-surface-container-high text-on-surface-variant',
      )}>
        {resource.status === 'available' && t('available')}
        {resource.status === 'occupied' && t('occupied')}
        {resource.status === 'maintenance' && t('maintenance')}
      </div>
    </button>
  )
}