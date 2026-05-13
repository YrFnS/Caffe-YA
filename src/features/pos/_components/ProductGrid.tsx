"use client"

import { useTranslations } from 'next-intl'
import ProductCard from './ProductCard'
import CategoryTabs from './CategoryTabs'
import type { Product, Category } from '../_types'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onAddProduct: (product: Product) => void
}

export default function ProductGrid({
  products,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddProduct
}: ProductGridProps) {
  const t = useTranslations('pos')

  const filtered = selectedCategoryId
    ? products.filter(p => p.categoryId === selectedCategoryId)
    : products

  return (
    <div className="flex flex-col gap-4 h-full">
      <CategoryTabs
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={onSelectCategory}
      />

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-body-lg text-on-surface-variant">{t('noProducts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAddProduct}
            />
          ))}
        </div>
      )}
    </div>
  )
}