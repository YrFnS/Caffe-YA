import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { units, ingredients } from '@/lib/schema'
import type { Unit } from '../_types'

export async function getAllUnits(): Promise<Unit[]> {
  return db.query.units.findMany({
    orderBy: (u, { asc }) => [asc(u.name)],
  })
}

export async function getUnitById(id: string): Promise<Unit | null> {
  const result = await db.query.units.findFirst({
    where: eq(units.id, id),
  })
  return result ?? null
}

export async function createUnit(name: string, abbreviation: string): Promise<Unit> {
  const existing = await db.query.units.findFirst({
    where: eq(units.name, name),
  })
  if (existing) throw new Error('ALREADY_EXISTS')

  const [unit] = await db.insert(units).values({
    name,
    abbreviation,
  }).returning()
  if (!unit) throw new Error('CREATE_FAILED')
  return unit
}

export async function updateUnit(id: string, data: { name?: string; abbreviation?: string }): Promise<Unit> {
  const [unit] = await db.update(units).set(data).where(eq(units.id, id)).returning()
  if (!unit) throw new Error('NOT_FOUND')
  return unit
}

export async function deleteUnit(id: string): Promise<void> {
  const inUse = await db.query.ingredients.findFirst({
    where: eq(ingredients.unitId, id),
  })
  if (inUse) throw new Error('UNIT_IN_USE')
  await db.delete(units).where(eq(units.id, id))
}
