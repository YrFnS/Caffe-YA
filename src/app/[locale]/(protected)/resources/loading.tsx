import { useTranslations } from 'next-intl'

export default function ResourcesLoading() {
  const t = useTranslations('resources')

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-body-md text-on-surface-variant">{t('loading')}</p>
      </div>
    </div>
  )
}