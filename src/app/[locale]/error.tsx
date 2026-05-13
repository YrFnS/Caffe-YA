"use client"

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('common')

  useEffect(() => {
    reset()
  }, [reset])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="w-12 h-12 text-tertiary mb-4" />
      <h2 className="text-headline-md text-on-surface mb-2">{t('error')}</h2>
      <p className="text-body-md text-on-surface-variant mb-4">{error.message}</p>
      <Button onClick={reset}>{t('retry') || 'Retry'}</Button>
    </div>
  )
}