"use client"

import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

interface LowStockAlert {
  id: string
  name: string
  stockQty: string
  unitName: string
}

interface AlertsBannerProps {
  alerts: LowStockAlert[]
}

export default function AlertsBanner({ alerts }: AlertsBannerProps) {
  const t = useTranslations('inventory')

  return (
    <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
      <div>
        <p className="text-body-md font-medium text-on-surface">{t('lowStockAlert')}</p>
        <ul className="mt-1 space-y-0.5">
          {alerts.slice(0, 5).map((alert) => (
            <li key={alert.id} className="text-body-sm text-on-surface-variant">
              {alert.name}: {alert.stockQty} {alert.unitName}
            </li>
          ))}
          {alerts.length > 5 && (
            <li className="text-body-sm text-on-surface-variant">
              +{alerts.length - 5} more
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}