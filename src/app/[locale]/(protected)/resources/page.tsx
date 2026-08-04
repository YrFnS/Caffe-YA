import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getActiveShift } from '@/features/pos/_services/orderService'
import { getResourceCategories, getResourcesWithActiveOrders } from '@/features/pos/_services/resourceService'
import ResourcesClientView from './_components/ResourcesClientView'

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (!session?.user) redirect(`/${locale}/sign-in`)

  const userId = session.user.id as string
  const activeShift = await getActiveShift(userId)
  if (!activeShift) redirect(`/${locale}/shifts`)

  const [resources, categories] = await Promise.all([
    getResourcesWithActiveOrders(),
    getResourceCategories(),
  ])

  return (
    <ResourcesClientView
      resources={resources}
      categories={categories}
      currentUserId={userId}
    />
  )
}
