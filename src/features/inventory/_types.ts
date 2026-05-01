import { ingredients, units, productCategories, products, productIngredients, stockMovements } from '@/lib/schema'
import { InferSelectModel } from 'drizzle-orm'

export type Product = InferSelectModel<typeof products>
export type ProductCategory = InferSelectModel<typeof productCategories>
export type Ingredient = InferSelectModel<typeof ingredients>
export type Unit = InferSelectModel<typeof units>
export type StockMovement = InferSelectModel<typeof stockMovements>
export type ProductIngredient = InferSelectModel<typeof productIngredients>

export interface ProductIngredientRow extends InferSelectModel<typeof productIngredients> {
  ingredientName: string
  productName: string
}

export interface LowStockIngredient extends InferSelectModel<typeof ingredients> {
  name: string
  unitName: string
  unit?: { name: string }
}