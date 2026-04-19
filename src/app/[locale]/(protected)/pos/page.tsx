import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getActiveShift, getOrCreateDraftOrder } from '@/features/pos/_services/orderService'
import { getAllActiveProducts, getCategories } from '@/features/pos/_services/productService'
import { getResourcesWithCategories } from '@/features/pos/_services/resourceService'
import POSClientView from './_components/POSClientView'

export default async function POSPage() {
  const session = await auth()
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string

  const activeShift = await getActiveShift(userId)
  if (!activeShift) {
    redirect('/shifts')
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
    />
  )
}