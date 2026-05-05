'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import {
  getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
} from '../_services/expenseCategoryService'
import {
  getAllExpenses, getExpenseById, createExpense, deleteExpense,
} from '../_services/expenseService'
import { revalidatePath } from 'next/cache'

// ─── Category Actions ────────────────────────────────────────────────────────

export async function getCategoriesAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllCategories()
}

export async function createCategoryAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const name = formData.get('name') as string
  if (!name) return { error: 'INVALID_INPUT' }
  try {
    const cat = await createCategory({ name })
    revalidatePath('/expenses/categories')
    return { success: true, category: cat }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'CREATE_CATEGORY_FAILED' }
  }
}

export async function updateCategoryAction(categoryId: string, formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const name = formData.get('name') as string
  try {
    const cat = await updateCategory(categoryId, { name })
    revalidatePath('/expenses/categories')
    return { success: true, category: cat }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'UPDATE_CATEGORY_FAILED' }
  }
}

export async function deleteCategoryAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  try {
    await deleteCategory(id)
    revalidatePath('/expenses/categories')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'DELETE_CATEGORY_FAILED' }
  }
}

// ─── Expense Actions ─────────────────────────────────────────────────────────

export async function getExpensesAction(filters?: { categoryId?: string }) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllExpenses(filters)
}

export async function createExpenseAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const shiftId = formData.get('shiftId') as string
  const categoryId = formData.get('categoryId') as string
  const amount = formData.get('amount') as string
  const description = formData.get('description') as string | null
  if (!shiftId || !categoryId || !amount) return { error: 'INVALID_INPUT' }
  try {
    const result = await createExpense({
      shiftId, categoryId, amount,
      description: description || null,
      paidBy: session.user.id,
    })
    revalidatePath('/expenses')
    return { success: true, id: result.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'CREATE_EXPENSE_FAILED' }
  }
}

export async function deleteExpenseAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  try {
    await deleteExpense(id)
    revalidatePath('/expenses')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'DELETE_EXPENSE_FAILED' }
  }
}