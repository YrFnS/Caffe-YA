"use client"

import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'

interface DashboardContentProps {
  lowStockItems: Array<{ id: string; name: string; stockQty: string; unitName: string }>
}

export default function DashboardContent({ lowStockItems }: DashboardContentProps) {
  const t = useTranslations('nav')
  const tInventory = useTranslations('inventory')

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-on-surface mb-6">
        {t('dashboard')}
      </h1>
      {lowStockItems.length > 0 && (
        <div className="bg-warning-container text-warning-on p-4 rounded-lg mb-6 flex items-start gap-3">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('todaySales')}</p>
          <p className="text-2xl font-display font-bold text-on-surface mt-2">0 IQD</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('activeOrders')}</p>
          <p className="text-2xl font-display font-bold text-on-surface mt-2">0</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('activeTimers')}</p>
          <p className="text-2xl font-display font-bold text-on-surface mt-2">0</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('shiftStatus')}</p>
          <p className="text-2xl font-display font-bold text-tertiary mt-2">{t('closed')}</p>
        </div>
      </div>
    </div>
  )
}