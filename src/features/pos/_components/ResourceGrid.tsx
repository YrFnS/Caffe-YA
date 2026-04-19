"use client"

import ResourceCard from './ResourceCard'
import type { Resource } from '../_types'

interface ResourceGridProps {
  resources: (Resource & { category?: { isTimed: boolean; hourlyRate: string | null } })[]
  onSelectResource: (resourceId: string) => void
  disabled?: boolean
}

export default function ResourceGrid({ resources, onSelectResource, disabled }: ResourceGridProps) {
  if (resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-on-surface-variant">
        <p className="text-body-md">No resources configured</p>
      </div>
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