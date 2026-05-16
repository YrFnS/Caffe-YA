import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getAllAccounts } from '@/features/accounting/_services/accountService'
import AccountsList from '@/features/accounting/_components/AccountsList'

export default async function AccountsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('nav')

  const accounts = await getAllAccounts(true)

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">{t('accounting')}</h1>
      <AccountsList accounts={accounts} />
    </div>
  )
}
