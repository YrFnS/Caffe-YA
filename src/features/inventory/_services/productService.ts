import { db } from '@/lib/db'
import { eq, desc, asc, inArray } from 'drizzle-orm'
import { products, productIngredients } from '@/lib/schema'
import { productInventoryCosts } from '@/lib/valuationSchema'
import type { Product, ProductIngredientRow } from '../_types'
import { fromCents, multiplyDecimalMoney, toCents } from '@/lib/currency'

type ProductWithCategory = Product & { categoryName: string }

export async function getAllProducts(includeInactive = false): Promise<ProductWithCategory[]> {
  const allProducts = await db.query.products.findMany({
    where: includeInactive ? undefined : eq(products.isActive, true),
    orderBy: [desc(products.createdAt)],
  })
  const [allCategories, valuations] = await Promise.all([
    db.query.productCategories.findMany(),
    allProducts.length
      ? db.select().from(productInventoryCosts).where(
          inArray(productInventoryCosts.productId, allProducts.map(product => product.id)),
        )
      : Promise.resolve([]),
  ])
  const categoryMap = new Map(allCategories.map(category => [category.id, category.name]))
  const valuationMap = new Map(valuations.map(valuation => [valuation.productId, valuation.unitCost]))

  return allProducts.map(product => ({
    ...product,
    categoryName: product.categoryId ? categoryMap.get(product.categoryId) ?? '' : '',
    costPerUnit: valuationMap.get(product.id) ?? null,
  }))
}

export async function getProductById(id: string): Promise<Product | null> {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) })
  if (!product) return null
  const [valuation] = await db.select().from(productInventoryCosts)
    .where(eq(productInventoryCosts.productId, id))
  return { ...product, costPerUnit: valuation?.unitCost ?? null }
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
  costPerUnit?: string
  localImageName?: string
}): Promise<Product> {
  return db.transaction(async tx => {
    const [product] = await tx.insert(products).values({
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

    if (product.type === 'standard' && product.trackStock) {
      const costPerUnit = data.costPerUnit ?? '0'
      if (toCents(product.stockQty ?? '0') > 0 && toCents(costPerUnit) <= 0) {
        throw new Error('INVENTORY_COST_REQUIRED')
      }
      await tx.insert(productInventoryCosts).values({
        productId: product.id,
        unitCost: costPerUnit,
      })
      return { ...product, costPerUnit }
    }

    return { ...product, costPerUnit: null }
  })
}

export async function updateProduct(
  id: string,
  data: {
    name?: string
    nameAr?: string | null
    categoryId?: string | null
    type?: 'standard' | 'recipe' | 'service'
    price?: string
    trackStock?: boolean
    stockQty?: string
    lowStockThreshold?: string
    localImageName?: string | null
    isActive?: boolean
  },
  costPerUnit?: string | null,
): Promise<Product> {
  return db.transaction(async tx => {
    const [product] = await tx.update(products).set(data).where(eq(products.id, id)).returning()
    if (!product) throw new Error('NOT_FOUND')

    if (product.type !== 'standard' || !product.trackStock) {
      await tx.delete(productInventoryCosts).where(eq(productInventoryCosts.productId, id))
      return { ...product, costPerUnit: null }
    }

    const [currentValuation] = await tx.select().from(productInventoryCosts)
      .where(eq(productInventoryCosts.productId, id))
      .for('update')
    const nextCost = costPerUnit === undefined
      ? currentValuation?.unitCost ?? '0'
      : costPerUnit ?? '0'
    if (toCents(product.stockQty ?? '0') > 0 && toCents(nextCost) <= 0) {
      throw new Error('INVENTORY_COST_REQUIRED')
    }

    await tx.insert(productInventoryCosts).values({
      productId: id,
      unitCost: nextCost,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: productInventoryCosts.productId,
      set: { unitCost: nextCost, updatedAt: new Date() },
    })
    return { ...product, costPerUnit: nextCost }
  })
}

export async function deleteProduct(id: string): Promise<void> {
  const [product] = await db.update(products)
    .set({ isActive: false })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!product) throw new Error('NOT_FOUND')
}

export async function getProductIngredients(productId: string): Promise<ProductIngredientRow[]> {
  const results = await db.query.productIngredients.findMany({
    where: eq(productIngredients.productId, productId),
  })
  const allIngredients = await db.query.ingredients.findMany()
  const ingredientMap = new Map(allIngredients.map(ingredient => [ingredient.id, ingredient]))
  return results.map(row => ({
    ...row,
    ingredientName: ingredientMap.get(row.ingredientId)?.name ?? 'Unknown',
    productName: '',
  }))
}

export async function setProductRecipe(
  productId: string,
  recipeIngredients: Array<{ ingredientId: string; quantityUsed: string }>,
): Promise<void> {
  await db.transaction(async tx => {
    await tx.delete(productIngredients).where(eq(productIngredients.productId, productId))
    if (recipeIngredients.length > 0) {
      await tx.insert(productIngredients).values(
        recipeIngredients.map(ingredient => ({
          productId,
          ingredientId: ingredient.ingredientId,
          quantityUsed: ingredient.quantityUsed,
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
  const ingredientMap = new Map(allIngredients.map(ingredient => [ingredient.id, ingredient]))
  let total = 0
  for (const row of results) {
    const ingredient = ingredientMap.get(row.ingredientId)
    if (ingredient) {
      total += toCents(multiplyDecimalMoney(ingredient.costPerUnit ?? '0', row.quantityUsed))
    }
  }
  return fromCents(total)
}
