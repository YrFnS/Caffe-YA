import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getAllExpenses } from '@/features/expenses/_services/expenseService'
import { getAllCategories } from '@/features/expenses/_services/expenseCategoryService'
import { getActiveShiftForUser } from '@/features/shifts/_services/shiftService'
import ExpensesList from '@/features/expenses/_components/ExpensesList'

export default async function ExpensesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('common')

  const [expenses, categories, activeShift] = await Promise.all([
    getAllExpenses(),
    getAllCategories(),
    getActiveShiftForUser(session.user.id as string),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">{t('expenses')}</h1>
      <ExpensesList
        expenses={expenses}
        categories={categories}
        currentShiftId={activeShift?.id ?? ''}
      />
    </div>
  )
}