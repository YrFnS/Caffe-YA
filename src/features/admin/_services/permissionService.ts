import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { permissions, rolePermissions } from '@/lib/schema'
import type { PermissionGroup, Module, Permission } from '../_types'

export async function getAllPermissions(): Promise<Permission[]> {
  return db.query.permissions.findMany({ orderBy: [desc(permissions.key)] })
}

export async function getPermissionsByModule(module: string): Promise<Permission[]> {
  return db.query.permissions.findMany({
    where: eq(permissions.module, module),
    orderBy: [desc(permissions.key)],
  })
}

export async function getPermissionsByRole(roleId: string): Promise<Permission[]> {
  const rows = await db.query.rolePermissions.findMany({
    where: eq(rolePermissions.roleId, roleId),
    with: { permission: true },
  })
  return rows.map(r => r.permission)
}

export async function getGroupedPermissions(): Promise<PermissionGroup[]> {
  const allPerms = await getAllPermissions()
  const grouped = new Map<string, Permission[]>()
  for (const perm of allPerms) {
    const existing = grouped.get(perm.module) ?? []
    grouped.set(perm.module, [...existing, perm])
  }
  return Array.from(grouped.entries()).map(([module, perms]) => ({ module, permissions: perms }))
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  await db.transaction(async tx => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (permissionIds.length) {
      await tx.insert(rolePermissions).values(permissionIds.map(permissionId => ({ roleId, permissionId })))
    }
  })
}

export async function createPermission(data: {
  key: string
  description?: string
  module: string
}) {
  const [perm] = await db.insert(permissions).values(data).returning()
  return perm
}

export async function deletePermission(id: string) {
  await db.transaction(async tx => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.permissionId, id))
    await tx.delete(permissions).where(eq(permissions.id, id))
  })
}

export async function seedDefaultPermissions(): Promise<void> {
  const defaultPermissions: Array<{ key: string; module: Module; description: string }> = [
    // POS permissions
    { key: 'pos.view', module: 'pos', description: 'View POS' },
    { key: 'pos.checkout', module: 'pos', description: 'Process checkout' },
    { key: 'pos.void_item', module: 'pos', description: 'Void order items' },
    { key: 'pos.void_order', module: 'pos', description: 'Void entire order' },
    { key: 'pos.open_shift', module: 'pos', description: 'Open shift' },
    { key: 'pos.close_shift', module: 'pos', description: 'Close shift' },

    // Inventory permissions
    { key: 'inventory.view', module: 'inventory', description: 'View inventory' },
    { key: 'inventory.manage_products', module: 'inventory', description: 'Manage products' },
    { key: 'inventory.manage_ingredients', module: 'inventory', description: 'Manage ingredients' },
    { key: 'inventory.manage_categories', module: 'inventory', description: 'Manage categories' },
    { key: 'inventory.stock_movement', module: 'inventory', description: 'Record stock movement' },
    { key: 'resources.view', module: 'resources', description: 'View resources' },
    { key: 'resources.manage', module: 'resources', description: 'Manage resources' },

    // Shifts permissions
    { key: 'shifts.view', module: 'shifts', description: 'View shifts' },
    { key: 'shifts.open', module: 'shifts', description: 'Open shift' },
    { key: 'shifts.close', module: 'shifts', description: 'Close shift' },
    { key: 'shifts.approve', module: 'shifts', description: 'Approve shift variance' },

    // Admin permissions
    { key: 'admin.view', module: 'admin', description: 'View admin panel' },
    { key: 'admin.manage_users', module: 'admin', description: 'Manage users' },
    { key: 'admin.manage_roles', module: 'admin', description: 'Manage roles' },
    { key: 'admin.manage_permissions', module: 'admin', description: 'Manage permissions' },
    { key: 'admin.manage_settings', module: 'admin', description: 'Manage settings' },
    { key: 'admin.manage_modules', module: 'admin', description: 'Manage modules' },

    // Procurement permissions
    { key: 'procurement.create_po', module: 'procurement', description: 'Create purchase order' },
    { key: 'procurement.delete_po', module: 'procurement', description: 'Delete purchase order' },
    { key: 'procurement.receive_goods', module: 'procurement', description: 'Receive goods' },
    { key: 'procurement.approve_invoice', module: 'procurement', description: 'Approve invoice' },
    { key: 'procurement.view', module: 'procurement', description: 'View procurement' },

    // Expense permissions
    { key: 'expenses.create', module: 'expenses', description: 'Create expense' },
    { key: 'expenses.update', module: 'expenses', description: 'Update expense' },
    { key: 'expenses.delete', module: 'expenses', description: 'Delete expense' },
    { key: 'expenses.approve', module: 'expenses', description: 'Approve expense' },
    { key: 'accounting.view', module: 'accounting', description: 'View accounting' },
    { key: 'accounting.manage', module: 'accounting', description: 'Manage accounting' },
    { key: 'employees.view', module: 'employees', description: 'View employees' },
    { key: 'employees.manage', module: 'employees', description: 'Manage employees' },
    { key: 'payroll.view', module: 'payroll', description: 'View payroll' },
    { key: 'payroll.manage', module: 'payroll', description: 'Manage payroll' },
    { key: 'partners.view', module: 'partners', description: 'View partners' },
    { key: 'partners.manage', module: 'partners', description: 'Manage partners' },
    { key: 'reports.view', module: 'reports', description: 'View reports' },
  ]

  for (const perm of defaultPermissions) {
    const existing = await db.query.permissions.findFirst({ where: eq(permissions.key, perm.key) })
    if (!existing) {
      await db.insert(permissions).values(perm)
    }
  }
}
