"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, User } from 'lucide-react'
import { Link } from '@/lib/navigation'

interface POSLayoutProps {
  children: React.ReactNode
  shiftStatus?: string
  cashierName?: string
  shiftOpenedAt?: Date
}

function useShiftDuration(openedAt: Date | undefined) {
  const [duration, setDuration] = useState('00:00:00')

  useEffect(() => {
    if (!openedAt) return

    const calculate = () => {
      const difference = Math.max(0, Date.now() - new Date(openedAt).getTime())
      const hours = Math.floor(difference / 3_600_000)
      const minutes = Math.floor((difference % 3_600_000) / 60_000)
      const seconds = Math.floor((difference % 60_000) / 1000)
      setDuration([hours, minutes, seconds].map(value => value.toString().padStart(2, '0')).join(':'))
    }

    calculate()
    const interval = window.setInterval(calculate, 1000)
    return () => window.clearInterval(interval)
  }, [openedAt])

  return duration
}

export default function POSLayout({
  children,
  shiftStatus,
  cashierName,
  shiftOpenedAt,
}: POSLayoutProps) {
  const t = useTranslations('pos')
  const tShifts = useTranslations('shifts')
  const duration = useShiftDuration(shiftOpenedAt)

  return (
    <div className="flex min-h-0 flex-col lg:h-[calc(100vh_-_10rem)]">
      <header className="flex flex-col gap-3 rounded-2xl bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t('title')}
          </h1>
          {shiftStatus && (
            <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${
              shiftStatus === 'open' ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'
            }`}>
              {shiftStatus === 'open' ? t('shiftOpen') : t('shiftClosed')}
            </span>
          )}
          {shiftOpenedAt && (
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-surface-container-high px-3 font-mono text-xs font-semibold tabular-nums text-on-surface-variant">
              <Clock className="h-4 w-4" /> {duration}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cashierName && (
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-lowest px-3 text-on-surface-variant sm:flex-none">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate text-sm font-medium">{cashierName}</span>
            </div>
          )}
          {shiftOpenedAt && (
            <Link
              href="/shifts"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-tertiary/10 px-4 text-sm font-semibold text-tertiary transition-colors hover:bg-tertiary/20 sm:flex-none"
            >
              {tShifts('closeShift')}
            </Link>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 lg:overflow-hidden">
        {children}
      </div>
    </div>
  )
}
