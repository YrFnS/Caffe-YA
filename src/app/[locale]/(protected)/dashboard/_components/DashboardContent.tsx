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
      <h1 className="font-display text-2xl font-semibold text-on-surface mb-6">
        {t('dashboard')}
      </h1>

      {lowStockItems.length > 0 && (
        <div className="bg-warning/15 text-warning border border-warning/20 p-4 rounded-lg mb-6 flex items-start gap-3">
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
