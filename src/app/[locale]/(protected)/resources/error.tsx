"use client"

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function ResourcesError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const t = useTranslations('common')

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-center">
        <p className="text-body-lg text-tertiary font-medium mb-2">{t('error')}</p>
        <p className="text-body-sm text-on-surface-variant">{error.message}</p>
      </div>
      <Button onClick={reset} variant="secondary" size="sm">
        {t('retry')}
      </Button>
    </div>
  )
}