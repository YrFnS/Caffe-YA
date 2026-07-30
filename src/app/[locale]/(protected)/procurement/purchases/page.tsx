import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import {
  getAllPurchases,
  getPurchasePaymentAccounts,
} from '@/features/procurement/_services/purchaseService'
import { getAllVendors } from '@/features/procurement/_services/vendorService'
import PurchasesClientView from './_components/PurchasesClientView'
import { getAllIngredients } from '@/features/inventory/_services/ingredientService'
import { getAllProducts } from '@/features/inventory/_services/productService'
import { hasPermission } from '@/features/admin/_actions/adminActions'

export default async function PurchasesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  if (!await hasPermission(session.user.id, 'procurement.view')) redirect('/dashboard')

  const [canCreate, canReceive, canPay, canDelete] = await Promise.all([
    hasPermission(session.user.id, 'procurement.create_po'),
    hasPermission(session.user.id, 'procurement.receive_goods'),
    hasPermission(session.user.id, 'procurement.approve_invoice'),
    hasPermission(session.user.id, 'procurement.delete_po'),
  ])
  const [purchases, vendors, ingredients, products, paymentAccounts] = await Promise.all([
    getAllPurchases(),
    getAllVendors(true),
    getAllIngredients(),
    getAllProducts(),
    canPay ? getPurchasePaymentAccounts() : Promise.resolve([]),
  ])

  return (
    <PurchasesClientView
      purchases={purchases}
      vendors={vendors}
      ingredients={ingredients.map(item => ({ id: item.id, name: item.name }))}
      products={products.map(item => ({ id: item.id, name: item.name, nameAr: item.nameAr }))}
      paymentAccounts={paymentAccounts}
      permissions={{ canCreate, canReceive, canPay, canDelete }}
    />
  )
}
