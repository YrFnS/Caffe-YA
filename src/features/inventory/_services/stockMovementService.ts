import { db } from '@/lib/db'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { stockMovements, ingredients, products, productIngredients } from '@/lib/schema'
import type { StockMovement } from '../_types'

export async function logMovement(data: {
  ingredientId?: string
  productId?: string
  type: 'purchase' | 'sale_deduction' | 'wastage' | 'adjustment' | 'opening_balance'
  quantity: string
  note?: string
  orderId?: string
  purchaseId?: string
  createdBy?: string
}): Promise<StockMovement> {
  const qty = Number(data.quantity)

  if (isNaN(qty) || qty === 0) throw new Error('INVALID_QUANTITY')

  await db.transaction(async (tx) => {
    // Update ingredient stock
    if (data.ingredientId) {
      const ing = await tx.query.ingredients.findFirst({
        where: eq(ingredients.id, data.ingredientId),
      })
      if (!ing) throw new Error('NOT_FOUND')

      const current = Number(ing.stockQty)
      let newStock: number

      if (data.type === 'sale_deduction' || data.type === 'wastage') {
        newStock = current - Math.abs(qty)
      } else {
        newStock = current + Math.abs(qty)
      }

      if (newStock < 0) throw new Error('INVALID_QUANTITY')

      await tx.update(ingredients)
        .set({ stockQty: String(newStock) })
        .where(eq(ingredients.id, data.ingredientId))
    }

    // If sale_deduction and product is a recipe, deduct each recipe ingredient
    if (data.type === 'sale_deduction' && data.productId) {
      const product = await tx.query.products.findFirst({
        where: eq(products.id, data.productId),
      })
      if (product && product.type === 'recipe') {
        const recipeIngredients = await tx.query.productIngredients.findMany({
          where: eq(productIngredients.productId, data.productId),
        })
        for (const ri of recipeIngredients) {
          const ing = await tx.query.ingredients.findFirst({
            where: eq(ingredients.id, ri.ingredientId),
          })
          if (ing) {
            const deduction = Number(ri.quantityUsed) * Math.abs(qty)
            const newStock = Number(ing.stockQty) - deduction
            if (newStock < 0) throw new Error('INVALID_QUANTITY')
            await tx.update(ingredients)
              .set({ stockQty: String(newStock) })
              .where(eq(ingredients.id, ri.ingredientId))
          }
        }
      }
    }

    // Record the movement
    const [movement] = await tx.insert(stockMovements).values({
      type: data.type,
      quantity: data.quantity,
      ingredientId: data.ingredientId ?? null,
      productId: data.productId ?? null,
      note: data.note ?? null,
      orderId: data.orderId ?? null,
      purchaseId: data.purchaseId ?? null,
      createdBy: data.createdBy ?? null,
    }).returning()

    if (!movement) throw new Error('CREATE_FAILED')
  })

  const [movement] = await db.query.stockMovements.findMany({
    where: and(
      data.ingredientId ? eq(stockMovements.ingredientId, data.ingredientId) : undefined,
      data.productId ? eq(stockMovements.productId, data.productId) : undefined,
    ),
    orderBy: [desc(stockMovements.createdAt)],
    limit: 1,
  })
  return movement as StockMovement
}

export async function getStockHistory(options?: {
  ingredientId?: string
  productId?: string
  type?: 'purchase' | 'sale_deduction' | 'wastage' | 'adjustment' | 'opening_balance'
  from?: Date
  to?: Date
  limit?: number
}): Promise<StockMovement[]> {
  const conditions = []
  if (options?.ingredientId) conditions.push(eq(stockMovements.ingredientId, options.ingredientId))
  if (options?.productId) conditions.push(eq(stockMovements.productId, options.productId))
  if (options?.type) conditions.push(eq(stockMovements.type, options.type))
  if (options?.from) conditions.push(gte(stockMovements.createdAt, options.from))
  if (options?.to) conditions.push(lte(stockMovements.createdAt, options.to))

  return db.query.stockMovements.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(stockMovements.createdAt)],
    limit: options?.limit ?? 100,
  })
}
