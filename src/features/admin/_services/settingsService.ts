import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { systemSettings, systemModules } from '@/lib/schema'

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
    .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } })
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await db.query.systemSettings.findMany()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function getModuleStatus(module: string): Promise<boolean> {
  const row = await db.query.systemModules.findFirst({ where: eq(systemModules.module, module) })
  return row?.isActive ?? false
}

export async function setModuleStatus(
  module: string,
  isActive: boolean,
  updatedBy?: string
): Promise<void> {
  await db
    .insert(systemModules)
    .values({ module, isActive, updatedBy })
    .onConflictDoUpdate({ target: systemModules.module, set: { isActive, updatedAt: new Date() } })
}

export async function getAllModules(): Promise<Array<{ module: string; isActive: boolean }>> {
  return db.query.systemModules.findMany()
}
