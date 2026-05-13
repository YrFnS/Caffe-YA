import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getAllCategories } from '@/features/inventory/_services/categoryService'
import CategoryTable from '@/features/inventory/_components/CategoryTable'
import CategoryModal from '@/features/inventory/_components/CategoryModal'

interface CategoriesPageProps {
  searchParams: Promise<{ modal?: string; editId?: string }>
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('common')

  const params = await searchParams
  const categories = await getAllCategories(true)

  const editCategory = params.editId ? categories.find((c) => c.id === params.editId) : undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('inventory.categories')}</h1>
      </div>
      <CategoryTable categories={categories} />
      {(params.modal === 'add' || params.modal === 'edit') && (
        <CategoryModal category={editCategory} editId={params.editId} />
      )}
    </div>
  )
}