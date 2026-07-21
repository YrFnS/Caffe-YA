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
    <div className="group flex min-h-36 flex-col gap-5 rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-[0_8px_30px_rgba(24,34,48,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(24,34,48,.09)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-container-low text-secondary transition group-hover:bg-secondary group-hover:text-white">{icon}</span>
      </div>
      <p className={`mt-auto font-display text-3xl font-bold tracking-tight ${valueColor}`}>
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
