import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllJournalEntries } from '@/features/accounting/_services/journalService'
import { getAllAccounts } from '@/features/accounting/_services/accountService'
import JournalEntriesList from '@/features/accounting/_components/JournalEntriesList'

export default async function JournalPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const [entries, accounts] = await Promise.all([
    getAllJournalEntries(100),
    getAllAccounts(true),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">Journal</h1>
      <JournalEntriesList entries={entries} accounts={accounts} />
    </div>
  )
}
