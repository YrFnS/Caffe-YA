import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { productCategories, products } from '@/lib/schema'
import type { ProductCategory } from '../_types'

export async function getAllCategories(includeInactive = false): Promise<ProductCategory[]> {
  const results = await db.query.productCategories.findMany({
    where: includeInactive ? undefined : eq(productCategories.isActive, true),
  })
  return results
}

export async function getCategoryById(id: string): Promise<ProductCategory | null> {
  const result = await db.query.productCategories.findFirst({
    where: eq(productCategories.id, id),
  })
  return result ?? null
}

export async function createCategory(data: {
  name: string
  nameAr?: string
  parentId?: string
}): Promise<ProductCategory> {
  const [category] = await db.insert(productCategories).values({
    name: data.name,
    nameAr: data.nameAr ?? null,
    parentId: data.parentId ?? null,
  }).returning()
  if (!category) throw new Error('CREATE_FAILED')
  return category
}

export async function updateCategory(
  id: string,
  data: {
    name?: string
    nameAr?: string
    parentId?: string | null
    isActive?: boolean
  },
): Promise<ProductCategory> {
  const [category] = await db.update(productCategories).set(data).where(eq(productCategories.id, id)).returning()
  if (!category) throw new Error('NOT_FOUND')
  return category
}

export async function deleteCategory(id: string): Promise<void> {
  const inUse = await db.query.products.findFirst({
    where: eq(products.categoryId, id),
  })
  if (inUse) throw new Error('CATEGORY_IN_USE')
  await db.delete(productCategories).where(eq(productCategories.id, id))
}