import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { expenseCategories } from '@/lib/schema'
import type { ExpenseCategoryRow } from '../_types'

export async function getAllCategories(): Promise<ExpenseCategoryRow[]> {
  return db.query.expenseCategories.findMany()
}

export async function getCategoryById(id: string): Promise<ExpenseCategoryRow | null> {
  const row = await db.query.expenseCategories.findFirst({ where: eq(expenseCategories.id, id) })
  return row ?? null
}

export async function createCategory(data: {
  name: string
  accountId?: string | null
}): Promise<ExpenseCategoryRow> {
  const [row] = await db.insert(expenseCategories).values(data).returning()
  return row
}

export async function updateCategory(
  id: string,
  data: { name?: string; accountId?: string | null; isActive?: boolean }
): Promise<ExpenseCategoryRow | null> {
  const [updated] = await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id)).returning()
  return updated ?? null
}

export async function deleteCategory(id: string): Promise<void> {
  await db.delete(expenseCategories).where(eq(expenseCategories.id, id))
}