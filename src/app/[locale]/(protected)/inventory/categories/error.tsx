"use client"

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function InventoryCategoriesError({ reset }: { reset: () => void }) {
  const t = useTranslations('common')

  useEffect(() => {
    reset()
  }, [reset])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <AlertTriangle className="w-12 h-12 text-tertiary" />
      <h2 className="text-headline-md text-on-surface">{t('error')}</h2>
      <p className="text-body-md text-on-surface-variant">{t('error_description')}</p>
      <Button onClick={reset}>{t('retry') || 'Retry'}</Button>
    </div>
  )
}