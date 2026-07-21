import { db } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { auditLogs, chartOfAccounts, expenses, expenseCategories, journalEntries, journalEntryLines } from '@/lib/schema'
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
  return db.transaction(async tx => {
    const category = await tx.query.expenseCategories.findFirst({ where: eq(expenseCategories.id, data.categoryId) })
    const [cashAccount] = await tx.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, '1001')).limit(1)
    if (!category?.accountId || !cashAccount) throw new Error('ACCOUNTING_NOT_CONFIGURED')
    const [row] = await tx.insert(expenses).values({
      shiftId: data.shiftId,
      categoryId: data.categoryId,
      amount: data.amount,
      description: data.description ?? null,
      paidBy: data.paidBy ?? null,
      receiptImageName: data.receiptImageName ?? null,
    }).returning()
    const [journal] = await tx.insert(journalEntries).values({
      reference: `EXPENSE-${row.id.slice(0, 8)}`,
      description: data.description ?? category.name,
      sourceType: 'expense',
      sourceId: row.id,
      createdBy: data.paidBy,
    }).returning()
    await tx.insert(journalEntryLines).values([
      { journalEntryId: journal.id, accountId: category.accountId, type: 'debit', amount: data.amount },
      { journalEntryId: journal.id, accountId: cashAccount.id, type: 'credit', amount: data.amount },
    ])
    await tx.insert(auditLogs).values({ userId: data.paidBy, action: 'CREATE_EXPENSE', targetTable: 'expenses', targetId: row.id, newValue: { amount: data.amount } })
    return { id: row.id }
  })
}

export async function deleteExpense(id: string, userId: string): Promise<void> {
  await db.transaction(async tx => {
    const entry = await tx.query.journalEntries.findFirst({ where: eq(journalEntries.sourceId, id) })
    if (entry) await tx.delete(journalEntries).where(eq(journalEntries.id, entry.id))
    await tx.delete(expenses).where(eq(expenses.id, id))
    await tx.insert(auditLogs).values({ userId, action: 'DELETE_EXPENSE', targetTable: 'expenses', targetId: id })
  })
}
