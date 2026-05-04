import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import UsersClientView from './_components/UsersClientView'
import { getAllUsers } from '@/features/admin/_services/userService'
import { getAllRoles } from '@/features/admin/_services/userService'
import { hasPermission } from '@/features/admin/_actions/adminActions'

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const canAccess = await hasPermission(session.user.id, 'admin.view')
  if (!canAccess) redirect('/dashboard')

  const [users, roles] = await Promise.all([getAllUsers(true), getAllRoles()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Users</h1>
      </div>
      <UsersClientView users={users} roles={roles} currentUserId={session.user.id} />
    </div>
  )
}
