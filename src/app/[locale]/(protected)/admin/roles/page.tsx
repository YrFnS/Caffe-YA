import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import RolesClientView from './_components/RolesClientView'
import { getAllRoles } from '@/features/admin/_services/userService'
import { getGroupedPermissions, getPermissionsByRole } from '@/features/admin/_services/permissionService'
import { hasPermission } from '@/features/admin/_actions/adminActions'

export default async function AdminRolesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const canAccess = await hasPermission(session.user.id, 'admin.view')
  if (!canAccess) redirect('/dashboard')

  const [roles, groupedPermissions] = await Promise.all([
    getAllRoles(),
    getGroupedPermissions(),
  ])
  const rolePermissions = Object.fromEntries(await Promise.all(
    roles.map(async role => [role.id, (await getPermissionsByRole(role.id)).map(permission => permission.id)]),
  ))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Roles</h1>
      </div>
      <RolesClientView roles={roles} groupedPermissions={groupedPermissions} rolePermissions={rolePermissions} />
    </div>
  )
}
