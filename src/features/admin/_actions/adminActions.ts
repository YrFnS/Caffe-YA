'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import {
  getAllUsers,
  getUserById,
  updateUser,
  setUserRoles,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
} from '../_services/userService'
import {
  getAllPermissions,
  getGroupedPermissions,
  getPermissionsByRole,
  setRolePermissions,
  createPermission,
  deletePermission,
  seedDefaultPermissions,
} from '../_services/permissionService'
import {
  getAllSettings,
  setSetting,
  getAllModules,
  setModuleStatus,
} from '../_services/settingsService'
import { revalidatePath } from 'next/cache'

// ─── Permission Check ─────────────────────────────────────────────────────────

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const session = await getSession()
  if (!session?.user || session.user.id !== userId) return false

  const user = await getUserById(userId)
  if (!user) return false

  for (const role of user.roles) {
    const perms = await getPermissionsByRole(role.id)
    if (perms.some(p => p.key === permissionKey)) return true
  }
  return false
}

export async function requirePermission(userId: string, permissionKey: string) {
  const granted = await hasPermission(userId, permissionKey)
  if (!granted) throw new Error('UNAUTHORIZED')
}

// ─── User Actions ─────────────────────────────────────────────────────────────

export async function getUsersAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllUsers()
}

export async function getUserAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getUserById(id)
}

export async function updateUserAction(
  userId: string,
  data: { name?: string; email?: string; isDisabled?: boolean; isActive?: boolean }
) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  // Check admin permission
  await requirePermission(session.user.id, 'admin.manage_users')

  const result = await updateUser(userId, data)
  revalidatePath('/admin/users')
  return { success: true, user: result }
}

export async function setUserRolesAction(userId: string, roleIds: string[]) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_users')

  await setUserRoles(userId, roleIds)
  revalidatePath('/admin/users')
  return { success: true }
}

// ─── Role Actions ─────────────────────────────────────────────────────────────

export async function getRolesAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllRoles()
}

export async function createRoleAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_roles')

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  if (!name) return { error: 'INVALID_INPUT' }

  try {
    const role = await createRole({ name, description: description ?? undefined })
    revalidatePath('/admin/roles')
    return { success: true, role }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'CREATE_ROLE_FAILED' }
  }
}

export async function updateRoleAction(
  roleId: string,
  data: { name?: string; description?: string }
) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_roles')

  try {
    const role = await updateRole(roleId, data)
    revalidatePath('/admin/roles')
    return { success: true, role }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'UPDATE_ROLE_FAILED' }
  }
}

export async function deleteRoleAction(roleId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_roles')

  try {
    await deleteRole(roleId)
    revalidatePath('/admin/roles')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'DELETE_ROLE_FAILED' }
  }
}

export async function getRolePermissionsAction(roleId: string) {
  return getPermissionsByRole(roleId)
}

export async function setRolePermissionsAction(roleId: string, permissionIds: string[]) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_permissions')

  await setRolePermissions(roleId, permissionIds)
  revalidatePath('/admin/roles')
  return { success: true }
}

// ─── Permission Actions ────────────────────────────────────────────────────────

export async function getPermissionsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllPermissions()
}

export async function getGroupedPermissionsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getGroupedPermissions()
}

export async function createPermissionAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_permissions')

  const key = formData.get('key') as string
  const description = formData.get('description') as string | null
  const moduleName = formData.get('module') as string
  if (!key || !moduleName) return { error: 'INVALID_INPUT' }

  try {
    const perm = await createPermission({ key, description: description ?? undefined, module: moduleName })
    return { success: true, permission: perm }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'CREATE_PERMISSION_FAILED' }
  }
}

export async function deletePermissionAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_permissions')

  try {
    await deletePermission(id)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'DELETE_PERMISSION_FAILED' }
  }
}

// ─── Settings Actions ──────────────────────────────────────────────────────────

export async function getSettingsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllSettings()
}

export async function setSettingAction(key: string, value: unknown) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_settings')

  await setSetting(key, value, session.user.id)
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function getModulesAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllModules()
}

export async function setModuleStatusAction(module: string, isActive: boolean) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_modules')

  await setModuleStatus(module, isActive, session.user.id)
  revalidatePath('/admin/modules')
  return { success: true }
}

// ─── Seed Action ────────────────────────────────────────────────────────────────

export async function seedPermissionsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'admin.manage_permissions')

  await seedDefaultPermissions()
  revalidatePath('/admin/roles')
  return { success: true }
}
