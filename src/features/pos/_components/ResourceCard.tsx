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
  const imageSrc = resource.localImageName?.startsWith('http') ? resource.localImageName : null

  const statusStyles = {
    available: 'bg-white border-secondary/25',
    occupied: 'bg-white border-tertiary/25',
    maintenance: 'bg-surface-container-low border-outline-variant',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || resource.status === 'maintenance'}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-3 text-start shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]',
        statusStyles[resource.status],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {imageSrc && (
        <div className="mb-3 h-28 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mb-3 flex items-center justify-between">
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
