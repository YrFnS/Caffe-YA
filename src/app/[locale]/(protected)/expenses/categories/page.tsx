import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllCategories } from '@/features/expenses/_services/expenseCategoryService'
import CategoriesList from '@/features/expenses/_components/CategoriesList'

export default async function CategoriesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const categories = await getAllCategories()

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">Expense Categories</h1>
      <CategoriesList categories={categories} />
    </div>
  )
}