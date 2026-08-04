import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import {
  getAllProducts,
  getProductIngredients,
} from '@/features/inventory/_services/productService'
import { getAllCategories } from '@/features/inventory/_services/categoryService'
import { getAllIngredients } from '@/features/inventory/_services/ingredientService'
import ProductTable from '@/features/inventory/_components/ProductTable'
import ProductModal from '@/features/inventory/_components/ProductModal'

interface ProductsPageProps {
  searchParams: Promise<{ modal?: string; editId?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const t = await getTranslations('inventory')

  const params = await searchParams
  const [products, categories, ingredients] = await Promise.all([
    getAllProducts(true),
    getAllCategories(true),
    getAllIngredients(),
  ])

  const editProduct = params.editId ? products.find(product => product.id === params.editId) : undefined
  const recipeRows = editProduct?.type === 'recipe'
    ? await getProductIngredients(editProduct.id)
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('products')}</h1>
      </div>
      <ProductTable products={products} categories={categories} />
      {(params.modal === 'add' || params.modal === 'edit') && (
        <ProductModal
          categories={categories}
          ingredients={ingredients.map(ingredient => ({
            id: ingredient.id,
            name: ingredient.name,
            unitName: ingredient.unitName,
            costPerUnit: ingredient.costPerUnit ?? '0',
          }))}
          recipeRows={recipeRows.map(row => ({
            ingredientId: row.ingredientId,
            quantityUsed: row.quantityUsed,
          }))}
          product={editProduct}
          editId={params.editId}
        />
      )}
    </div>
  )
}
