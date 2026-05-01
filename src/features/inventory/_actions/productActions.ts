'use server'

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  setProductRecipe,
} from '../_services/productService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getProductsAction() {
  return getAllProducts()
}

export async function createProductAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const name = formData.get('name') as string
  const nameAr = formData.get('nameAr') as string | null
  const categoryId = formData.get('categoryId') as string | null
  const type = formData.get('type') as string
  const price = formData.get('price') as string
  const trackStock = formData.get('trackStock') as string | null
  const stockQty = formData.get('stockQty') as string | null
  const lowStockThreshold = formData.get('lowStockThreshold') as string | null
  const localImageName = formData.get('localImageName') as string | null
  if (!name || !type || !price) return { error: 'INVALID_INPUT' }

  try {
    await createProduct({
      name,
      nameAr: nameAr ?? undefined,
      categoryId: categoryId ?? undefined,
      type: type as 'standard' | 'recipe' | 'service',
      price,
      trackStock: trackStock === 'true',
      stockQty: stockQty ?? undefined,
      lowStockThreshold: lowStockThreshold ?? undefined,
      localImageName: localImageName ?? undefined,
    })
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'CREATE_PRODUCT_FAILED' }
  }
}

export async function updateProductAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const productId = formData.get('productId') as string
  if (!productId) return { error: 'INVALID_INPUT' }

  const data: Parameters<typeof updateProduct>[1] = {}
  const name = formData.get('name') as string | null
  const nameAr = formData.get('nameAr') as string | null
  const categoryId = formData.get('categoryId') as string | null
  const type = formData.get('type') as string | null
  const price = formData.get('price') as string | null
  const trackStock = formData.get('trackStock') as string | null
  const stockQty = formData.get('stockQty') as string | null
  const lowStockThreshold = formData.get('lowStockThreshold') as string | null
  const localImageName = formData.get('localImageName') as string | null

  if (name) data.name = name
  if (nameAr) data.nameAr = nameAr
  if (categoryId) data.categoryId = categoryId
  if (type) data.type = type as 'standard' | 'recipe' | 'service'
  if (price) data.price = price
  if (trackStock) data.trackStock = trackStock === 'true'
  if (stockQty) data.stockQty = stockQty
  if (lowStockThreshold) data.lowStockThreshold = lowStockThreshold
  if (localImageName) data.localImageName = localImageName

  try {
    await updateProduct(productId, data)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'UPDATE_PRODUCT_FAILED' }
  }
}

export async function deleteProductAction(productId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  if (!productId) return { error: 'INVALID_INPUT' }

  try {
    await deleteProduct(productId)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'DELETE_PRODUCT_FAILED' }
  }
}

export async function setRecipeAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const productId = formData.get('productId') as string
  const ingredientsJson = formData.get('ingredients') as string
  if (!productId || !ingredientsJson) return { error: 'INVALID_INPUT' }

  try {
    const ingredients = JSON.parse(ingredientsJson) as Array<{
      ingredientId: string
      quantityUsed: string
    }>
    await setProductRecipe(productId, ingredients)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'SET_RECIPE_FAILED' }
  }
}
