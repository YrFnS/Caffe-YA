'use server'

import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getAllIngredients,
  getLowStockIngredients,
} from '../_services/ingredientService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getIngredientsAction() {
  return getAllIngredients()
}

export async function getLowStockIngredientsAction() {
  return getLowStockIngredients()
}

export async function createIngredientAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const name = formData.get('name') as string
  const unitId = formData.get('unitId') as string
  const stockQty = formData.get('stockQty') as string | null
  const costPerUnit = formData.get('costPerUnit') as string | null
  const lowStockThreshold = formData.get('lowStockThreshold') as string | null
  if (!name || !unitId) return { error: 'INVALID_INPUT' }

  try {
    await createIngredient({
      name,
      unitId,
      stockQty: stockQty ?? undefined,
      costPerUnit: costPerUnit ?? undefined,
      lowStockThreshold: lowStockThreshold ?? undefined,
    })
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'CREATE_INGREDIENT_FAILED' }
  }
}

export async function updateIngredientAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const ingredientId = formData.get('ingredientId') as string
  if (!ingredientId) return { error: 'INVALID_INPUT' }

  const data: Parameters<typeof updateIngredient>[1] = {}
  const name = formData.get('name') as string | null
  const unitId = formData.get('unitId') as string | null
  const stockQty = formData.get('stockQty') as string | null
  const costPerUnit = formData.get('costPerUnit') as string | null
  const lowStockThreshold = formData.get('lowStockThreshold') as string | null
  const isActive = formData.get('isActive') as string | null

  if (name) data.name = name
  if (unitId) data.unitId = unitId
  if (stockQty) data.stockQty = stockQty
  if (costPerUnit) data.costPerUnit = costPerUnit
  if (lowStockThreshold) data.lowStockThreshold = lowStockThreshold
  if (isActive) data.isActive = isActive === 'true'

  try {
    await updateIngredient(ingredientId, data)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'UPDATE_INGREDIENT_FAILED' }
  }
}

export async function deleteIngredientAction(ingredientId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  if (!ingredientId) return { error: 'INVALID_INPUT' }

  try {
    await deleteIngredient(ingredientId)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'DELETE_INGREDIENT_FAILED' }
  }
}
