import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ModulesClientView from './_components/ModulesClientView'
import { getAllModules } from '@/features/admin/_services/settingsService'
import { hasPermission } from '@/features/admin/_actions/adminActions'
import { MODULES } from '@/features/admin/_types'

export default async function AdminModulesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const canAccess = await hasPermission(session.user.id, 'admin.view')
  if (!canAccess) redirect('/dashboard')

  const dbModules = await getAllModules()
  const moduleMap = new Map(dbModules.map(m => [m.module, m.isActive]))

  // Merge with known modules, defaulting unknown to false
  const modulesWithStatus = MODULES.map(m => ({
    module: m,
    isActive: moduleMap.get(m) ?? false,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Modules</h1>
      </div>
      <ModulesClientView modules={modulesWithStatus} />
    </div>
  )
}
