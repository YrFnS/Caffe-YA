import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function ProcurementPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  redirect('/procurement/vendors')
}