import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllAccounts } from '@/features/accounting/_services/accountService'
import AccountsList from '@/features/accounting/_components/AccountsList'

export default async function AccountsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const accounts = await getAllAccounts(true)

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">Chart of Accounts</h1>
      <AccountsList accounts={accounts} />
    </div>
  )
}
