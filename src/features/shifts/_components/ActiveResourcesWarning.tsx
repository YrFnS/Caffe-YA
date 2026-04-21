"use client"

import { useTranslations } from 'next-intl'
import { Monitor, Clock } from 'lucide-react'

interface ActiveResource {
  id: string
  name: string
  orderId: string
}

interface ActiveResourcesWarningProps {
  resources: ActiveResource[]
}

export default function ActiveResourcesWarning({ resources }: ActiveResourcesWarningProps) {
  const t = useTranslations('shifts')

  if (resources.length === 0) return null

  return (
    <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-tertiary" />
        <h3 className="text-headline-sm font-semibold text-tertiary">
          {t('activeResourcesWarning')}
        </h3>
      </div>
      <p className="text-body-sm text-on-surface-variant mb-4">
        {t('activeResourcesDesc')}
      </p>
      <div className="space-y-2">
        {resources.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between bg-surface-container-lowest rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-tertiary" />
              <span className="text-body-md font-medium text-on-surface">{r.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
