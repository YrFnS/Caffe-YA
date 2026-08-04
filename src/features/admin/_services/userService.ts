import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { accounts, rolePermissions, roles, sessions, users, userRoles } from '@/lib/schema'
import type { UserWithRoles } from '../_types'

export async function getAllUsers(includeDisabled = false): Promise<UserWithRoles[]> {
  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  })

  const filtered = includeDisabled ? allUsers : allUsers.filter(u => !u.isDisabled)

  const result: UserWithRoles[] = []
  for (const user of filtered) {
    const userRolesRows = await db.query.userRoles.findMany({
      where: eq(userRoles.userId, user.id),
      with: { role: true },
    })
    result.push({
      ...user,
      roles: userRolesRows.map(ur => ur.role),
    })
  }
  return result
}

export async function getUserById(id: string): Promise<UserWithRoles | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) return null

  const userRolesRows = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, id),
    with: { role: true },
  })
  return {
    ...user,
    roles: userRolesRows.map(ur => ur.role),
  }
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; isDisabled?: boolean; isActive?: boolean }
): Promise<UserWithRoles | null> {
  const updated = await db.transaction(async tx => {
    const [existing] = await tx.select().from(users).where(eq(users.id, id)).for('update')
    if (!existing) return null

    const nextEmail = data.email?.trim().toLowerCase()
    const [nextUser] = await tx.update(users).set({
      ...data,
      ...(nextEmail ? { email: nextEmail } : {}),
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning()

    if (nextEmail && nextEmail !== existing.email) {
      await tx.update(accounts).set({
        accountId: nextEmail,
        updatedAt: new Date(),
      }).where(eq(accounts.userId, id))
    }

    if (data.isDisabled === true || data.isActive === false) {
      await tx.delete(sessions).where(eq(sessions.userId, id))
    }

    return nextUser
  })

  if (!updated) return null
  return getUserById(id)
}

export async function setUserRoles(userId: string, roleIds: string[]): Promise<void> {
  const uniqueRoleIds = [...new Set(roleIds)]
  await db.transaction(async tx => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId))
    if (uniqueRoleIds.length) {
      await tx.insert(userRoles).values(uniqueRoleIds.map(roleId => ({ userId, roleId })))
    }
  })
}

export async function getAllRoles() {
  return db.query.roles.findMany({ orderBy: [desc(roles.createdAt)] })
}

export async function createRole(data: { name: string; description?: string }) {
  const [role] = await db.insert(roles).values(data).returning()
  return role
}

export async function updateRole(
  id: string,
  data: { name?: string; description?: string }
) {
  const [updated] = await db.update(roles).set(data).where(eq(roles.id, id)).returning()
  return updated
}

export async function deleteRole(id: string) {
  await db.transaction(async tx => {
    await tx.delete(userRoles).where(eq(userRoles.roleId, id))
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id))
    await tx.delete(roles).where(eq(roles.id, id))
  })
}
