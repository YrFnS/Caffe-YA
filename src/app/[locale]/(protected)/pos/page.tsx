import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getActiveShift, getOrCreateDraftOrder, getDraftOrderItems } from '@/features/pos/_services/orderService'
import { getAllActiveProducts, getCategories } from '@/features/pos/_services/productService'
import { getResourcesWithCategories } from '@/features/pos/_services/resourceService'
import POSClientView from './_components/POSClientView'
import type { CartItem } from '@/features/pos/_types'

function mapOrderItemsToCartItems(items: Awaited<ReturnType<typeof getDraftOrderItems>>): CartItem[] {
  return items.map(item => ({
    productId: item.productId,
    productName: item.product?.name ?? 'Unknown',
    quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    orderItemId: item.id,
  }))
}

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
  const existingItems = await getDraftOrderItems(draftOrder.id)
  const initialCartItems = mapOrderItemsToCartItems(existingItems)

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
      initialCartItems={initialCartItems}
      initialTimerStartedAt={draftOrder.timerStartedAt}
      initialTimerCharge={draftOrder.timerChargeAmount ?? '0'}
      initialResourceId={draftOrder.resourceId}
    />
  )
}
