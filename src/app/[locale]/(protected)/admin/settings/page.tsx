import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import SettingsClientView from './_components/SettingsClientView'
import { getAllSettings } from '@/features/admin/_services/settingsService'
import { hasPermission } from '@/features/admin/_actions/adminActions'

export default async function AdminSettingsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const canAccess = await hasPermission(session.user.id, 'admin.view')
  if (!canAccess) redirect('/dashboard')

  const settings = await getAllSettings()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Settings</h1>
      </div>
      <SettingsClientView settings={settings} />
    </div>
  )
}
