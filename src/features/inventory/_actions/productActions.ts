'use server'

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  setProductRecipe,
  type RecipeInput,
} from '../_services/productService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import { toCents } from '@/lib/currency'

const productTypes = ['standard', 'recipe', 'service'] as const
type ProductType = (typeof productTypes)[number]

function parseNonnegativeMoney(value: FormDataEntryValue | null, fallback = '0'): string {
  const normalized = typeof value === 'string' && value.trim() ? value.trim() : fallback
  if (toCents(normalized) < 0) throw new Error('INVALID_INPUT')
  return normalized
}

function parseProductType(value: FormDataEntryValue | null): ProductType {
  if (typeof value !== 'string' || !productTypes.includes(value as ProductType)) {
    throw new Error('INVALID_INPUT')
  }
  return value as ProductType
}

function parseRecipeIngredients(value: FormDataEntryValue | null, type: ProductType): RecipeInput[] {
  if (type !== 'recipe') return []
  if (typeof value !== 'string') throw new Error('RECIPE_REQUIRED')

  let rows: RecipeInput[]
  try {
    rows = JSON.parse(value) as RecipeInput[]
  } catch {
    throw new Error('INVALID_RECIPE')
  }

  const normalized = rows.map(row => ({
    ingredientId: row.ingredientId?.trim(),
    quantityUsed: row.quantityUsed?.trim(),
  }))
  if (!normalized.length) throw new Error('RECIPE_REQUIRED')
  if (new Set(normalized.map(row => row.ingredientId)).size !== normalized.length) {
    throw new Error('DUPLICATE_RECIPE_INGREDIENT')
  }
  if (normalized.some(row => !row.ingredientId || toCents(row.quantityUsed) <= 0)) {
    throw new Error('INVALID_RECIPE')
  }
  return normalized
}

function revalidateProductViews() {
  revalidatePath('/inventory')
  revalidatePath('/inventory/products')
  revalidatePath('/pos')
}

export async function getProductsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.view')
  return getAllProducts()
}

export async function createProductAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  try {
    const name = (formData.get('name') as string | null)?.trim()
    const type = parseProductType(formData.get('type'))
    const price = parseNonnegativeMoney(formData.get('price'))
    if (!name || toCents(price) <= 0) return { error: 'INVALID_INPUT' }

    const trackStock = type === 'standard' && formData.get('trackStock') === 'true'
    const stockQty = trackStock ? parseNonnegativeMoney(formData.get('stockQty')) : '0'
    const lowStockThreshold = trackStock
      ? parseNonnegativeMoney(formData.get('lowStockThreshold'))
      : '0'
    const costPerUnit = trackStock
      ? parseNonnegativeMoney(formData.get('costPerUnit'))
      : undefined
    if (trackStock && toCents(stockQty) > 0 && toCents(costPerUnit ?? '0') <= 0) {
      return { error: 'INVENTORY_COST_REQUIRED' }
    }

    const product = await createProduct({
      name,
      nameAr: (formData.get('nameAr') as string | null)?.trim() || undefined,
      categoryId: (formData.get('categoryId') as string | null)?.trim() || undefined,
      type,
      price,
      trackStock,
      stockQty,
      lowStockThreshold,
      costPerUnit,
      localImageName: (formData.get('localImageName') as string | null)?.trim() || undefined,
      recipeIngredients: parseRecipeIngredients(formData.get('recipeIngredients'), type),
    })
    revalidateProductViews()
    return { success: true, id: product.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'CREATE_PRODUCT_FAILED' }
  }
}

export async function updateProductAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  const productId = formData.get('productId') as string
  if (!productId) return { error: 'INVALID_INPUT' }

  try {
    const name = (formData.get('name') as string | null)?.trim()
    const type = parseProductType(formData.get('type'))
    const price = parseNonnegativeMoney(formData.get('price'))
    if (!name || toCents(price) <= 0) return { error: 'INVALID_INPUT' }

    const trackStock = type === 'standard' && formData.get('trackStock') === 'true'
    const stockQty = trackStock ? parseNonnegativeMoney(formData.get('stockQty')) : '0'
    const lowStockThreshold = trackStock
      ? parseNonnegativeMoney(formData.get('lowStockThreshold'))
      : '0'
    const costPerUnit = trackStock
      ? parseNonnegativeMoney(formData.get('costPerUnit'))
      : null
    if (trackStock && toCents(stockQty) > 0 && toCents(costPerUnit ?? '0') <= 0) {
      return { error: 'INVENTORY_COST_REQUIRED' }
    }

    await updateProduct(productId, {
      name,
      nameAr: (formData.get('nameAr') as string | null)?.trim() || null,
      categoryId: (formData.get('categoryId') as string | null)?.trim() || null,
      type,
      price,
      trackStock,
      stockQty,
      lowStockThreshold,
      localImageName: (formData.get('localImageName') as string | null)?.trim() || null,
    }, costPerUnit, parseRecipeIngredients(formData.get('recipeIngredients'), type))
    revalidateProductViews()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'UPDATE_PRODUCT_FAILED' }
  }
}

export async function deleteProductAction(productId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  if (!productId) return { error: 'INVALID_INPUT' }

  try {
    await deleteProduct(productId)
    revalidateProductViews()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'DELETE_PRODUCT_FAILED' }
  }
}

export async function setRecipeAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  const productId = formData.get('productId') as string
  if (!productId) return { error: 'INVALID_INPUT' }

  try {
    await setProductRecipe(productId, parseRecipeIngredients(formData.get('ingredients'), 'recipe'))
    revalidateProductViews()
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'SET_RECIPE_FAILED' }
  }
}
