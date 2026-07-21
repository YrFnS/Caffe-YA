"use client"

import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import DashboardWidgets from '@/features/reports/_components/DashboardWidgets'
import type { TodaySummary } from '@/features/reports/_types'

interface DashboardContentProps {
  summary: TodaySummary
  lowStockItems: Array<{ id: string; name: string; stockQty: string; unitName: string }>
}

export default function DashboardContent({ summary, lowStockItems }: DashboardContentProps) {
  const t = useTranslations('nav')
  const tInventory = useTranslations('inventory')

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">{t('dashboard')}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Sales, service, and shift activity at a glance.</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-warning">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{tInventory('lowStockAlert')}</p>
            <ul className="mt-1 text-sm space-y-0.5">
              {lowStockItems.map((item) => (
                <li key={item.id}>
                  {item.name}: {item.stockQty} {item.unitName}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <DashboardWidgets summary={summary} />
    </div>
  )
}
