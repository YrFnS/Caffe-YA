"use client"

import { useTranslations } from 'next-intl'
import { Gamepad2 } from 'lucide-react'
import ResourceCard from './ResourceCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Resource } from '../_types'

interface ResourceGridProps {
  resources: (Resource & { category?: { isTimed: boolean; hourlyRate: string | null } })[]
  onSelectResource: (resourceId: string) => void
  disabled?: boolean
}

export default function ResourceGrid({ resources, onSelectResource, disabled }: ResourceGridProps) {
  const t = useTranslations('resources')

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={Gamepad2}
        title={t('noResources')}
      />
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={() => onSelectResource(resource.id)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}