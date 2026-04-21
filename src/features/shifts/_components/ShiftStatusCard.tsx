"use client"

import { useTranslations } from 'next-intl'
import { Clock, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ShiftStatusCardProps {
  shiftId: string
  cashierName: string
  openedAt: Date
  onCloseShift: () => void
}

function useShiftDuration(openedAt: Date) {
  const [duration, setDuration] = useState('')

  useEffect(() => {
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

export default function ShiftStatusCard({
  cashierName,
  openedAt,
  onCloseShift,
}: ShiftStatusCardProps) {
  const t = useTranslations('shifts')
  const duration = useShiftDuration(openedAt)

  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-label-sm text-on-surface-variant mb-0.5">{t('cashier')}</p>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-on-surface-variant" />
            <span className="text-body-lg font-semibold text-on-surface">{cashierName}</span>
          </div>
        </div>
        <div className="w-px h-10 bg-outline-variant/15" />
        <div>
          <p className="text-label-sm text-on-surface-variant mb-0.5">{t('openedAt')}</p>
          <p className="text-body-lg font-medium text-on-surface">
            {new Date(openedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="w-px h-10 bg-outline-variant/15" />
        <div>
          <p className="text-label-sm text-on-surface-variant mb-0.5">{t('shiftDuration')}</p>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-display-sm font-bold font-mono text-secondary">
              {duration}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onCloseShift}
        className="h-12 px-6 rounded-lg bg-tertiary text-on-primary font-medium"
      >
        {t('closeShift')}
      </button>
    </div>
  )
}
