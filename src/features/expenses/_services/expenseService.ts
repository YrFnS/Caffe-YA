import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { expenses, expenseCategories } from '@/lib/schema'
import type { ExpenseRow } from '../_types'

export async function getAllExpenses(filters?: {
  categoryId?: string
  fromDate?: Date
  toDate?: Date
}): Promise<ExpenseRow[]> {
  const rows = await db.query.expenses.findMany()

  // Fetch category names separately
  const categoryRows = await db.query.expenseCategories.findMany()
  const categoryMap = new Map(categoryRows.map(c => [c.id, c.name]))

  let filtered = rows
  if (filters?.categoryId) {
    filtered = filtered.filter(r => r.categoryId === filters.categoryId)
  }
  if (filters?.fromDate) {
    filtered = filtered.filter(r => r.createdAt >= filters.fromDate!)
  }
  if (filters?.toDate) {
    filtered = filtered.filter(r => r.createdAt <= filters.toDate!)
  }

  return filtered.map(r => ({
    ...r,
    categoryName: categoryMap.get(r.categoryId) ?? null,
    paidByName: null,
  }))
}

export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  const row = await db.query.expenses.findFirst({ where: eq(expenses.id, id) })
  if (!row) return null

  const category = await db.query.expenseCategories.findFirst({
    where: eq(expenseCategories.id, row.categoryId),
  })
  return { ...row, categoryName: category?.name ?? null, paidByName: null }
}

export async function createExpense(data: {
  shiftId: string
  categoryId: string
  amount: string
  description?: string | null
  paidBy?: string
  receiptImageName?: string | null
}): Promise<{ id: string }> {
  const [row] = await db.insert(expenses).values({
    shiftId: data.shiftId,
    categoryId: data.categoryId,
    amount: data.amount,
    description: data.description ?? null,
    paidBy: data.paidBy ?? null,
    receiptImageName: data.receiptImageName ?? null,
  }).returning()
  return { id: row.id }
}

export async function deleteExpense(id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id))
}