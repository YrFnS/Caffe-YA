"use client"

import { useTranslations } from 'next-intl'
import { TrendingUp, Clock, ShoppingCart, DoorOpen } from 'lucide-react'
import { formatIQD } from '@/lib/format'
import type { TodaySummary } from '../_types'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  valueColor?: string
}

function StatCard({ label, value, icon, valueColor = 'text-on-surface' }: StatCardProps) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface-variant">{label}</span>
        <span className="text-on-surface-variant">{icon}</span>
      </div>
      <p className={`text-2xl font-display font-bold ${valueColor} mt-auto`}>
        {value}
      </p>
    </div>
  )
}

interface DashboardWidgetsProps {
  summary: TodaySummary
}

export default function DashboardWidgets({ summary }: DashboardWidgetsProps) {
  const t = useTranslations('nav')
  const isOpen = summary.shiftStatus === 'open'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={t('todaySales')}
        value={formatIQD(summary.salesTotal)}
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <StatCard
        label={t('activeOrders')}
        value={summary.activeOrders}
        icon={<ShoppingCart className="w-4 h-4" />}
      />
      <StatCard
        label={t('activeTimers')}
        value={summary.activeTimers}
        icon={<Clock className="w-4 h-4" />}
      />
      <StatCard
        label={t('shiftStatus')}
        value={isOpen ? t('open') : t('closed')}
        icon={<DoorOpen className="w-4 h-4" />}
        valueColor={isOpen ? 'text-secondary' : 'text-tertiary'}
      />
    </div>
  )
}
