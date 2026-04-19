import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('nav')

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-on-surface mb-6">
        {t('dashboard')}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('todaySales')}</p>
          <p className="text-2xl font-display font-bold text-on-surface mt-2">0 IQD</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('activeOrders')}</p>
          <p className="text-2xl font-display font-bold text-on-surface mt-2">0</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('activeTimers')}</p>
          <p className="text-2xl font-display font-bold text-on-surface mt-2">0</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-lg">
          <p className="text-sm text-on-surface-variant">{t('shiftStatus')}</p>
          <p className="text-2xl font-display font-bold text-tertiary mt-2">{t('closed')}</p>
        </div>
      </div>
    </div>
  )
}