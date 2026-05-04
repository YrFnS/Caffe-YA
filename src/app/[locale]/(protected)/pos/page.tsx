import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getActiveShift, getOrCreateDraftOrder } from '@/features/pos/_services/orderService'
import { getAllActiveProducts, getCategories } from '@/features/pos/_services/productService'
import { getResourcesWithCategories } from '@/features/pos/_services/resourceService'
import POSClientView from './_components/POSClientView'

export default async function POSPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (!session?.user) redirect(`/${locale}/sign-in`)

  const userId = session.user.id as string

  const activeShift = await getActiveShift(userId)
  if (!activeShift) {
    redirect(`/${locale}/shifts`)
  }

  const draftOrder = await getOrCreateDraftOrder(activeShift.id, userId)

  const [products, categories, resources] = await Promise.all([
    getAllActiveProducts(),
    getCategories(),
    getResourcesWithCategories(),
  ])

  return (
    <POSClientView
      products={products}
      categories={categories}
      resources={resources}
      shiftId={activeShift.id}
      orderId={draftOrder.id}
      cashierName={session.user.name || 'Cashier'}
      shiftOpenedAt={activeShift.openedAt}
    />
  )
}