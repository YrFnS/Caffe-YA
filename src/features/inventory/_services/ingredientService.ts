import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { ingredients } from '@/lib/schema'
import type { Ingredient } from '../_types'

interface IngredientWithUnitName {
  id: string
  name: string
  unitId: string
  stockQty: string
  lowStockThreshold: string | null
  costPerUnit: string | null
  isActive: boolean
  createdAt: Date
  unitName: string
}

type LowStockAlert = {
  id: string
  name: string
  stockQty: string
  unitName: string
}

export async function getAllIngredients(includeInactive = false): Promise<IngredientWithUnitName[]> {
  const results = await db.query.ingredients.findMany({
    where: includeInactive ? undefined : eq(ingredients.isActive, true),
    orderBy: [desc(ingredients.createdAt)],
  })
  const allUnits = await db.query.units.findMany()
  const unitMap = new Map(allUnits.map((u) => [u.id, u.name]))
  return results.map((r): IngredientWithUnitName => ({
    id: r.id,
    name: r.name,
    unitId: r.unitId,
    stockQty: r.stockQty,
    lowStockThreshold: r.lowStockThreshold,
    costPerUnit: r.costPerUnit,
    isActive: r.isActive,
    createdAt: r.createdAt,
    unitName: unitMap.get(r.unitId) ?? 'Unknown',
  }))
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
  const result = await db.query.ingredients.findFirst({
    where: eq(ingredients.id, id),
  })
  return result ?? null
}

export async function createIngredient(data: {
  name: string
  unitId: string
  stockQty?: string
  costPerUnit?: string
  lowStockThreshold?: string
}): Promise<Ingredient> {
  const [ingredient] = await db.insert(ingredients).values({
    name: data.name,
    unitId: data.unitId,
    stockQty: data.stockQty ?? '0',
    costPerUnit: data.costPerUnit ?? '0',
    lowStockThreshold: data.lowStockThreshold ?? '0',
  }).returning()
  if (!ingredient) throw new Error('CREATE_FAILED')
  return ingredient
}

export async function updateIngredient(
  id: string,
  data: {
    name?: string
    unitId?: string
    stockQty?: string
    costPerUnit?: string
    lowStockThreshold?: string
    isActive?: boolean
  },
): Promise<Ingredient> {
  const [ingredient] = await db.update(ingredients).set(data).where(eq(ingredients.id, id)).returning()
  if (!ingredient) throw new Error('NOT_FOUND')
  return ingredient
}

export async function deleteIngredient(id: string): Promise<void> {
  await db.delete(ingredients).where(eq(ingredients.id, id))
}

export async function getLowStockIngredients(): Promise<LowStockAlert[]> {
  const results = await db.query.ingredients.findMany({
    where: eq(ingredients.isActive, true),
  })
  const allUnits = await db.query.units.findMany()
  const unitMap = new Map(allUnits.map((u) => [u.id, u.name]))
  return results
    .filter((r) => {
      const stock = Number(r.stockQty)
      const threshold = Number(r.lowStockThreshold)
      return threshold > 0 && stock <= threshold
    })
    .map((r): LowStockAlert => ({
      id: r.id,
      name: r.name,
      stockQty: r.stockQty,
      unitName: unitMap.get(r.unitId) ?? 'Unknown',
    }))
}