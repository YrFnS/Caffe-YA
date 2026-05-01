"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import AlertsBanner from './AlertsBanner'
import ProductTable from './ProductTable'
import CategoryTable from './CategoryTable'
import IngredientTable from './IngredientTable'
import type { Product, ProductCategory, Unit } from '@/features/inventory/_types'

type Tab = 'products' | 'categories' | 'ingredients'

interface IngredientWithUnitName {
  id: string
  name: string
  unitId: string
  stockQty: string
  lowStockThreshold: string | null
  costPerUnit: string | null
  isActive: boolean
  createdAt: Date
  unitName: string
}

interface LowStockAlert {
  id: string
  name: string
  stockQty: string
  unitName: string
}

interface InventoryClientViewProps {
  products: (Product & { categoryName: string })[]
  categories: ProductCategory[]
  ingredients: IngredientWithUnitName[]
  units?: Unit[]
  lowStockAlerts?: LowStockAlert[]
}

export default function InventoryClientView({
  products,
  categories,
  ingredients,
  lowStockAlerts = [],
}: InventoryClientViewProps) {
  const t = useTranslations('inventory')
  const [activeTab, setActiveTab] = useState<Tab>('products')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
      </div>

      {lowStockAlerts.length > 0 && <AlertsBanner alerts={lowStockAlerts} />}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-surface-container-highest text-on-surface'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t('products')}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'bg-surface-container-highest text-on-surface'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t('categories')}
        </button>
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ingredients'
              ? 'bg-surface-container-highest text-on-surface'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t('ingredients')}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'products' && (
        <ProductTable products={products} categories={categories} />
      )}
      {activeTab === 'categories' && (
        <CategoryTable categories={categories} />
      )}
      {activeTab === 'ingredients' && (
        <IngredientTable ingredients={ingredients} />
      )}
    </div>
  )
}