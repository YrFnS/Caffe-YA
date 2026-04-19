"use client"

import { useTranslations } from 'next-intl'
import POSLayout from './_components/POSLayout'

export default function POSPage() {
  const t = useTranslations('pos')

  return (
    <POSLayout shiftStatus="open" cashierName="Cashier">
      <div className="flex items-center justify-center h-full text-on-surface-variant">
        <p>{t('loadingPos')}</p>
      </div>
    </POSLayout>
  )
}