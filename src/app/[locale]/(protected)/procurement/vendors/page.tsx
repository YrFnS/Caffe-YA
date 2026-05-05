import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllVendors } from '@/features/procurement/_services/vendorService'
import VendorsList from '@/features/procurement/_components/VendorsList'
import VendorModal from '@/features/procurement/_components/VendorModal'

export default async function VendorsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const vendors = await getAllVendors(true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Vendors</h1>
      </div>
      <VendorsList vendors={vendors} />
    </div>
  )
}