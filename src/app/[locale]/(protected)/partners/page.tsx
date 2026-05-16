import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getAllPartners, getPartnerDashboard } from '@/features/partners/_services/partnerService'
import PartnersList from '@/features/partners/_components/PartnersList'

export default async function PartnersPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('common')

  const partners = await getAllPartners()
  const dashboards: Record<string, Awaited<ReturnType<typeof getPartnerDashboard>>> = {}
  await Promise.all(
    partners.map(async p => {
      dashboards[p.id] = await getPartnerDashboard(p.id)
    })
  )

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">{t('partners')}</h1>
      <PartnersList
        partners={partners}
        dashboards={dashboards as Record<string, NonNullable<Awaited<ReturnType<typeof getPartnerDashboard>>>>}
      />
    </div>
  )
}
