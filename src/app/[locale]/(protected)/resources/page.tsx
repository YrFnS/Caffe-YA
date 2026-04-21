import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getActiveShift } from '@/features/pos/_services/orderService'
import { getResourcesWithCategories, getResourceCategories } from '@/features/pos/_services/resourceService'
import ResourcesClientView from './_components/ResourcesClientView'

export default async function ResourcesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string

  const activeShift = await getActiveShift(userId)
  if (!activeShift) {
    redirect('/shifts')
  }

  const [resources, categories] = await Promise.all([
    getResourcesWithCategories(),
    getResourceCategories(),
  ])

  return (
    <ResourcesClientView
      resources={resources}
      categories={categories}
      shiftId={activeShift.id}
    />
  )
}