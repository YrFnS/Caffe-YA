import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import UsersClientView from './_components/UsersClientView'
import UserModal from '@/features/admin/_components/UserModal'
import { getAllUsers } from '@/features/admin/_services/userService'
import { getAllRoles } from '@/features/admin/_services/userService'
import { hasPermission } from '@/features/admin/_actions/adminActions'

interface AdminUsersPageProps {
  searchParams: Promise<{ modal?: string }>
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const canAccess = await hasPermission(session.user.id, 'admin.view')
  if (!canAccess) redirect('/dashboard')

  const params = await searchParams
  const [users, roles] = await Promise.all([getAllUsers(true), getAllRoles()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Users</h1>
      </div>
      <UsersClientView users={users} roles={roles} currentUserId={session.user.id} />
      {params.modal === 'add' && <UserModal />}
    </div>
  )
}
