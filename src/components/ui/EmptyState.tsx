"use client"

import type { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl p-8 bg-surface-container-lowest text-center',
        className
      )}
    >
      {Icon && (
        <Icon className="w-12 h-12 text-on-surface-variant mb-4" />
      )}
      <h3 className="text-body-lg font-medium text-on-surface mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-body-sm text-on-surface-variant max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="default"
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
