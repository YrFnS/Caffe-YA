import { db } from '@/lib/db'
import { eq, desc, asc } from 'drizzle-orm'
import { products, productIngredients } from '@/lib/schema'
import type { Product, ProductIngredientRow } from '../_types'

export async function getAllProducts(includeInactive = false): Promise<(Product & { categoryName: string })[]> {
  const allProducts = await db.query.products.findMany({
    where: includeInactive ? undefined : eq(products.isActive, true),
    orderBy: [desc(products.createdAt)],
  })
  const allCategories = await db.query.productCategories.findMany()
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]))
  return allProducts.map((p) => ({
    ...p,
    categoryName: p.categoryId ? categoryMap.get(p.categoryId) ?? '' : '',
  })) as (Product & { categoryName: string })[]
}

export async function getProductById(id: string): Promise<Product | null> {
  const result = await db.query.products.findFirst({
    where: eq(products.id, id),
  })
  return result ?? null
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  return db.query.products.findMany({
    where: eq(products.categoryId, categoryId),
    orderBy: [asc(products.name)],
  })
}

export async function createProduct(data: {
  name: string
  nameAr?: string
  categoryId?: string
  type: 'standard' | 'recipe' | 'service'
  price: string
  trackStock: boolean
  stockQty?: string
  lowStockThreshold?: string
  localImageName?: string
}): Promise<Product> {
  const [product] = await db.insert(products).values({
    name: data.name,
    nameAr: data.nameAr ?? null,
    categoryId: data.categoryId ?? null,
    type: data.type,
    price: data.price,
    trackStock: data.trackStock,
    stockQty: data.stockQty ?? '0',
    lowStockThreshold: data.lowStockThreshold ?? '0',
    localImageName: data.localImageName ?? null,
  }).returning()
  if (!product) throw new Error('CREATE_FAILED')
  return product
}

export async function updateProduct(
  id: string,
  data: {
    name?: string
    nameAr?: string
    categoryId?: string | null
    type?: 'standard' | 'recipe' | 'service'
    price?: string
    trackStock?: boolean
    stockQty?: string
    lowStockThreshold?: string
    localImageName?: string | null
    isActive?: boolean
  },
): Promise<Product> {
  const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning()
  if (!product) throw new Error('NOT_FOUND')
  return product
}

export async function deleteProduct(id: string): Promise<void> {
  await db.delete(products).where(eq(products.id, id))
}

export async function getProductIngredients(productId: string): Promise<ProductIngredientRow[]> {
  const results = await db.query.productIngredients.findMany({
    where: eq(productIngredients.productId, productId),
  })
  const allIngredients = await db.query.ingredients.findMany()
  const ingredientMap = new Map(allIngredients.map((i) => [i.id, i]))
  return results
    .map((r) => {
      const ing = ingredientMap.get(r.ingredientId)
      return {
        ...r,
        ingredientName: ing?.name ?? 'Unknown',
        productName: '',
      }
    }) as ProductIngredientRow[]
}

export async function setProductRecipe(
  productId: string,
  recipeIngredients: Array<{ ingredientId: string; quantityUsed: string }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(productIngredients).where(eq(productIngredients.productId, productId))
    if (recipeIngredients.length > 0) {
      await tx.insert(productIngredients).values(
        recipeIngredients.map((ing) => ({
          productId,
          ingredientId: ing.ingredientId,
          quantityUsed: ing.quantityUsed,
        })),
      )
    }
  })
}

export async function getRecipeCost(productId: string): Promise<string> {
  const results = await db.query.productIngredients.findMany({
    where: eq(productIngredients.productId, productId),
  })
  if (results.length === 0) return '0.000'

  const allIngredients = await db.query.ingredients.findMany()
  const ingredientMap = new Map(allIngredients.map((i) => [i.id, i]))

  let total = 0
  for (const r of results) {
    const ing = ingredientMap.get(r.ingredientId)
    if (ing) {
      total += Number(ing.costPerUnit) * Number(r.quantityUsed)
    }
  }
  return total.toFixed(3) // display: formatted recipe cost string
}