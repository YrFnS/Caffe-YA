import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllPurchases } from '@/features/procurement/_services/purchaseService'
import { getAllVendors } from '@/features/procurement/_services/vendorService'
import PurchasesClientView from './_components/PurchasesClientView'

export default async function PurchasesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const [purchases, vendors] = await Promise.all([
    getAllPurchases(),
    getAllVendors(true),
  ])

  return (
    <PurchasesClientView purchases={purchases} vendors={vendors} />
  )
}