"use client"

import { useTranslations } from 'next-intl'
import { User } from 'lucide-react'

interface POSLayoutProps {
  children: React.ReactNode
  shiftStatus?: string
  cashierName?: string
}

export default function POSLayout({ children, shiftStatus, cashierName }: POSLayoutProps) {
  const t = useTranslations('pos')

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
        </div>
        <div className="flex items-center gap-3">
          {cashierName && (
            <div className="flex items-center gap-2 text-on-surface-variant">
              <User className="w-4 h-4" />
              <span className="text-sm">{cashierName}</span>
            </div>
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