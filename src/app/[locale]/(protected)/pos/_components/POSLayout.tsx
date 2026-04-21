"use client"

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface POSLayoutProps {
  children: React.ReactNode
  shiftStatus?: string
  cashierName?: string
  shiftOpenedAt?: Date
}

function useShiftDuration(openedAt: Date | undefined) {
  const [duration, setDuration] = useState('')

  useEffect(() => {
    if (!openedAt) return
    const calc = () => {
      const diff = Date.now() - new Date(openedAt).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDuration(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      )
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
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
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'
  const duration = useShiftDuration(shiftOpenedAt)

  return (
    <div className="flex flex-col h-full">
      {/* POS Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-container-low border-b border-outline-variant/15">
        <div className="flex items-center gap-4">
          <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
          {shiftStatus && (
            <span className={`text-label-md px-2 py-1 rounded ${
              shiftStatus === 'open' ? 'bg-secondary/10 text-secondary' : 'bg-tertiary/10 text-tertiary'
            }`}>
              {shiftStatus === 'open' ? t('shiftOpen') : t('shiftClosed')}
            </span>
          )}
          {shiftOpenedAt && (
            <>
              <div className="w-px h-6 bg-outline-variant/15" />
              <span className="font-mono text-label-md text-on-surface-variant">
                {duration}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {cashierName && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <User className="w-4 h-4" />
              <span className="text-sm">{cashierName}</span>
            </div>
          )}
          {shiftOpenedAt && (
            <a
              href={`/${locale}/shifts`}
              className="h-9 px-4 rounded-lg bg-tertiary/10 text-tertiary text-label-md hover:bg-tertiary/20 flex items-center"
            >
              {tShifts('closeShift')}
            </a>
          )}
        </div>
      </header>

      {/* POS Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
