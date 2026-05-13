import { InferSelectModel } from 'drizzle-orm'
import { users, roles, permissions, userRoles, rolePermissions } from '@/lib/schema'

export type User = InferSelectModel<typeof users>
export type Role = InferSelectModel<typeof roles>
export type Permission = InferSelectModel<typeof permissions>
export type UserRole = InferSelectModel<typeof userRoles>
export type RolePermission = InferSelectModel<typeof rolePermissions>

export interface UserWithRoles extends User {
  roles: Role[]
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export interface PermissionGroup {
  module: string
  permissions: Permission[]
}

export const MODULES = ['pos', 'inventory', 'shifts', 'admin', 'procurement', 'expenses', 'accounting', 'partners'] as const
export type Module = (typeof MODULES)[number]
