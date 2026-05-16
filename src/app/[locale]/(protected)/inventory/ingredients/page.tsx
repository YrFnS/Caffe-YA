import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getAllIngredients } from '@/features/inventory/_services/ingredientService'
import { getAllUnits } from '@/features/inventory/_services/unitService'
import IngredientTable from '@/features/inventory/_components/IngredientTable'
import IngredientModal from '@/features/inventory/_components/IngredientModal'

interface IngredientsPageProps {
  searchParams: Promise<{ modal?: string; editId?: string }>
}

export default async function IngredientsPage({ searchParams }: IngredientsPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('inventory')

  const params = await searchParams
  const [ingredients, units] = await Promise.all([
    getAllIngredients(true),
    getAllUnits(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('ingredients')}</h1>
      </div>
      <IngredientTable ingredients={ingredients} units={units} />
      {(params.modal === 'add' || params.modal === 'edit') && (
        <IngredientModal units={units} editId={params.editId} />
      )}
    </div>
  )
}