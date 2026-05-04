import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getLowStockIngredients } from '@/features/inventory/_services/ingredientService'
import DashboardContent from './_components/DashboardContent'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (!session?.user) redirect(`/${locale}/sign-in`)

  const lowStockItems = await getLowStockIngredients()

  return <DashboardContent lowStockItems={lowStockItems} />
}