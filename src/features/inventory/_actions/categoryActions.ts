'use server'

import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} from '../_services/categoryService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getCategoriesAction() {
  return getAllCategories()
}

export async function createCategoryAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const name = formData.get('name') as string
  const nameAr = formData.get('nameAr') as string | null
  const parentId = formData.get('parentId') as string | null
  if (!name) return { error: 'INVALID_INPUT' }

  try {
    await createCategory({
      name,
      nameAr: nameAr ?? undefined,
      parentId: parentId ?? undefined,
    })
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'CREATE_CATEGORY_FAILED' }
  }
}

export async function updateCategoryAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const categoryId = formData.get('categoryId') as string
  if (!categoryId) return { error: 'INVALID_INPUT' }

  const data: Parameters<typeof updateCategory>[1] = {}
  const name = formData.get('name') as string | null
  const nameAr = formData.get('nameAr') as string | null
  const parentId = formData.get('parentId') as string | null

  if (name) data.name = name
  if (nameAr) data.nameAr = nameAr
  if (parentId) data.parentId = parentId

  try {
    await updateCategory(categoryId, data)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'UPDATE_CATEGORY_FAILED' }
  }
}

export async function deleteCategoryAction(categoryId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  if (!categoryId) return { error: 'INVALID_INPUT' }

  try {
    await deleteCategory(categoryId)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'DELETE_CATEGORY_FAILED' }
  }
}
