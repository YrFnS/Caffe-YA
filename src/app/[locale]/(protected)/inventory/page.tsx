import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import InventoryClientView from '@/features/inventory/_components/InventoryClientView'
import AlertsBanner from '@/features/inventory/_components/AlertsBanner'
import { getAllProducts } from '@/features/inventory/_services/productService'
import { getAllCategories } from '@/features/inventory/_services/categoryService'
import { getAllIngredients } from '@/features/inventory/_services/ingredientService'
import { getLowStockIngredients } from '@/features/inventory/_services/ingredientService'

interface LowStockAlert {
  id: string
  name: string
  stockQty: string
  unitName: string
}

export default async function InventoryPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('nav')

  const [products, categories, ingredients, lowStockAlerts] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getAllIngredients(),
    getLowStockIngredients(),
  ])

  const typedLowStock = JSON.parse(JSON.stringify(lowStockAlerts)) as LowStockAlert[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('inventory')}</h1>
      </div>
      {typedLowStock.length > 0 && <AlertsBanner alerts={typedLowStock} />}
      <InventoryClientView
        products={products}
        categories={categories}
        ingredients={ingredients}
      />
    </div>
  )
}