import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getLowStockIngredients } from '@/features/inventory/_services/ingredientService'
import { getTodaySummary } from '@/features/reports/_services/reportService'
import DashboardContent from './_components/DashboardContent'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (!session?.user) redirect(`/${locale}/sign-in`)

  const [summary, lowStockItems] = await Promise.all([
    getTodaySummary(),
    getLowStockIngredients(),
  ])

  return <DashboardContent summary={summary} lowStockItems={lowStockItems} />
}
