export interface ExpenseCategoryRow {
  id: string
  name: string
  accountId: string | null
  isActive: boolean
}

export interface ExpenseRow {
  id: string
  shiftId: string
  categoryId: string
  categoryName: string | null
  amount: string
  description: string | null
  paidBy: string | null
  paidByName: string | null
  receiptImageName: string | null
  createdAt: Date
}