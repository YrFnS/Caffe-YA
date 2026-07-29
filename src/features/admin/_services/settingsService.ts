import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { systemSettings, systemModules } from '@/lib/schema'

const CORE_MODULES = new Set(['admin'])

export function isCoreModule(module: string): boolean {
  return CORE_MODULES.has(module)
}

export async function getSetting(key: string): Promise<unknown> {
  const row = await db.query.systemSettings.findFirst({ where: eq(systemSettings.key, key) })
  return row ? row.value : null
}

export async function setSetting(
  key: string,
  value: unknown,
  updatedBy?: string
): Promise<void> {
  await db
    .insert(systemSettings)
    .values({ key, value, updatedBy })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedBy, updatedAt: new Date() },
    })
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.query.systemSettings.findMany()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function getModuleStatus(module: string): Promise<boolean> {
  if (isCoreModule(module)) return true

  const row = await db.query.systemModules.findFirst({ where: eq(systemModules.module, module) })
  return row?.isActive ?? false
}

export async function setModuleStatus(
  module: string,
  isActive: boolean,
  updatedBy?: string
): Promise<void> {
  if (isCoreModule(module) && !isActive) {
    throw new Error('CORE_MODULE_REQUIRED')
  }

  const nextStatus = isCoreModule(module) ? true : isActive
  await db
    .insert(systemModules)
    .values({ module, isActive: nextStatus, updatedBy })
    .onConflictDoUpdate({
      target: systemModules.module,
      set: { isActive: nextStatus, updatedBy, updatedAt: new Date() },
    })
}

export async function getAllModules(): Promise<Array<{ module: string; isActive: boolean }>> {
  const rows = await db.query.systemModules.findMany()
  const modules = new Map(rows.map(row => [row.module, { module: row.module, isActive: row.isActive }]))

  for (const module of CORE_MODULES) {
    modules.set(module, { module, isActive: true })
  }

  return [...modules.values()].sort((a, b) => a.module.localeCompare(b.module))
}
