"use client"

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ImageIcon, Plus, Trash2 } from 'lucide-react'
import { useRouter } from '@/lib/navigation'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { ProductCategory, Product } from '@/features/inventory/_types'
import { createProductAction, updateProductAction } from '@/features/inventory/_actions/productActions'
import { formatCurrency, multiplyDecimalMoney, toCents } from '@/lib/currency'

interface IngredientOption {
  id: string
  name: string
  unitName: string
  costPerUnit: string
}

interface RecipeRow {
  ingredientId: string
  quantityUsed: string
}

interface ProductModalProps {
  categories: ProductCategory[]
  ingredients: IngredientOption[]
  recipeRows?: RecipeRow[]
  product?: Product
  editId?: string
}

export default function ProductModal({
  categories,
  ingredients,
  recipeRows = [],
  product,
  editId,
}: ProductModalProps) {
  const t = useTranslations('inventory')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: product?.name || '',
    nameAr: product?.nameAr || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'standard' as 'standard' | 'recipe' | 'service',
    price: product?.price || '',
    trackStock: product?.trackStock || false,
    stockQty: product?.stockQty || '0',
    lowStockThreshold: product?.lowStockThreshold || '0',
    costPerUnit: product?.costPerUnit || '0',
    localImageName: product?.localImageName || '',
  })
  const [recipe, setRecipe] = useState<RecipeRow[]>(recipeRows)

  const copy = locale === 'ar'
    ? {
        image: 'رابط أو مسار صورة المنتج',
        imageHint: 'استخدم رابط HTTPS أو اسم ملف موجود في مجلد صور المنتجات.',
        preview: 'معاينة الصورة',
        recipeTitle: 'مكونات الوصفة',
        recipeRequired: 'أضف مكوناً واحداً على الأقل مع كمية صحيحة.',
        recipeCost: 'تكلفة الوصفة المقدّرة',
        quantity: 'الكمية المستخدمة',
        duplicate: 'لا يمكن تكرار نفس المكون في الوصفة.',
      }
    : {
        image: 'Product image URL or path',
        imageHint: 'Use an HTTPS URL or a filename stored in the product uploads folder.',
        preview: 'Image preview',
        recipeTitle: 'Recipe ingredients',
        recipeRequired: 'Add at least one ingredient with a valid quantity.',
        recipeCost: 'Estimated recipe cost',
        quantity: 'Quantity used',
        duplicate: 'The same ingredient cannot be added twice.',
      }

  const handleClose = () => router.push('/inventory/products')
  const tracksInventory = form.type === 'standard' && form.trackStock
  const imageSrc = form.localImageName
    ? form.localImageName.startsWith('http')
      ? form.localImageName
      : `/uploads/products/${form.localImageName}`
    : ''

  const recipeCost = useMemo(() => {
    let total = 0
    for (const row of recipe) {
      const ingredient = ingredients.find(item => item.id === row.ingredientId)
      if (!ingredient || !row.quantityUsed) continue
      try {
        total += toCents(multiplyDecimalMoney(ingredient.costPerUnit, row.quantityUsed))
      } catch {
        // Invalid rows are surfaced during submit; keep the preview stable while typing.
      }
    }
    return `${Math.floor(total / 1000)}.${String(Math.abs(total % 1000)).padStart(3, '0')}`
  }, [ingredients, recipe])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const normalizedRecipe = recipe
      .filter(row => row.ingredientId || row.quantityUsed)
      .map(row => ({ ingredientId: row.ingredientId, quantityUsed: row.quantityUsed }))
    if (form.type === 'recipe') {
      if (!normalizedRecipe.length || normalizedRecipe.some(row => !row.ingredientId || !row.quantityUsed)) {
        setError(copy.recipeRequired)
        return
      }
      if (new Set(normalizedRecipe.map(row => row.ingredientId)).size !== normalizedRecipe.length) {
        setError(copy.duplicate)
        return
      }
    }

    setLoading(true)
    try {
      const formData = new FormData()
      if (editId) formData.set('productId', editId)
      formData.set('name', form.name)
      formData.set('nameAr', form.nameAr)
      formData.set('categoryId', form.categoryId)
      formData.set('type', form.type)
      formData.set('price', form.price)
      formData.set('trackStock', String(form.trackStock))
      formData.set('stockQty', form.stockQty)
      formData.set('lowStockThreshold', form.lowStockThreshold)
      formData.set('costPerUnit', form.costPerUnit)
      formData.set('localImageName', form.localImageName)
      formData.set('recipeIngredients', JSON.stringify(normalizedRecipe))

      const result = editId
        ? await updateProductAction(formData)
        : await createProductAction(formData)
      if ('error' in result && result.error) {
        setError(result.error.replaceAll('_', ' '))
        return
      }

      router.push('/inventory/products')
      router.refresh()
    } catch (actionError) {
      console.error('Product save failed:', actionError)
      setError('SAVE FAILED')
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = categories.map(category => ({
    value: category.id,
    label: locale === 'ar' ? category.nameAr || category.name : category.name,
  }))

  return (
    <Modal
      open
      onClose={handleClose}
      title={editId ? t('edit') : t('add')}
      footer={(
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="product-form" disabled={loading}>
            {loading ? t('loading') : t('save')}
          </Button>
        </>
      )}
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('name')}
            value={form.name}
            onChange={event => setForm({ ...form, name: event.target.value })}
            required
          />
          <Input
            label={t('nameAr')}
            value={form.nameAr}
            onChange={event => setForm({ ...form, nameAr: event.target.value })}
            dir="rtl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('categories')}
            options={categoryOptions}
            value={form.categoryId}
            onChange={event => setForm({ ...form, categoryId: event.target.value })}
            placeholder={t('selectCategory')}
          />
          <Select
            label={t('type')}
            options={[
              { value: 'standard', label: t('standard') },
              { value: 'recipe', label: t('recipe') },
              { value: 'service', label: t('service') },
            ]}
            value={form.type}
            onChange={event => {
              const type = event.target.value as 'standard' | 'recipe' | 'service'
              setForm({
                ...form,
                type,
                trackStock: type === 'standard' ? form.trackStock : false,
              })
            }}
          />
        </div>

        <Input
          label={t('price')}
          type="number"
          min="0.001"
          step="0.001"
          value={form.price}
          onChange={event => setForm({ ...form, price: event.target.value })}
          required
        />

        <section className="space-y-3 rounded-2xl bg-surface-container-low p-4">
          <Input
            label={copy.image}
            value={form.localImageName}
            onChange={event => setForm({ ...form, localImageName: event.target.value })}
            placeholder="https://… or product.jpg"
          />
          <p className="text-xs text-on-surface-variant">{copy.imageHint}</p>
          <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-xl bg-surface-container-lowest">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt={copy.preview} className="max-h-56 w-full object-cover" />
            ) : (
              <div className="grid place-items-center gap-2 p-6 text-center text-on-surface-variant">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">{copy.preview}</span>
              </div>
            )}
          </div>
        </section>

        {form.type === 'standard' && (
          <div className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              id="trackStock"
              className="h-5 w-5"
              checked={form.trackStock}
              onChange={event => setForm({ ...form, trackStock: event.target.checked })}
            />
            <label htmlFor="trackStock" className="text-sm text-on-surface">
              {t('tracked')}
            </label>
          </div>
        )}

        {tracksInventory && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label={t('stock')}
              type="number"
              min="0"
              step="0.001"
              value={form.stockQty}
              onChange={event => setForm({ ...form, stockQty: event.target.value })}
            />
            <Input
              label={t('costPerUnit')}
              type="number"
              min="0"
              step="0.001"
              value={form.costPerUnit}
              onChange={event => setForm({ ...form, costPerUnit: event.target.value })}
              required
            />
            <Input
              label={t('lowThreshold')}
              type="number"
              min="0"
              step="0.001"
              value={form.lowStockThreshold}
              onChange={event => setForm({ ...form, lowStockThreshold: event.target.value })}
            />
          </div>
        )}

        {form.type === 'recipe' && (
          <section className="space-y-4 rounded-2xl bg-surface-container-low p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-on-surface">{copy.recipeTitle}</h3>
                <p className="text-xs text-on-surface-variant">
                  {copy.recipeCost}: {formatCurrency(recipeCost)} IQD
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRecipe(rows => [...rows, { ingredientId: '', quantityUsed: '1' }])}
              >
                <Plus className="h-4 w-4" /> {t('addIngredient')}
              </Button>
            </div>

            {recipe.length === 0 ? (
              <p className="rounded-xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">
                {copy.recipeRequired}
              </p>
            ) : (
              <div className="space-y-3">
                {recipe.map((row, index) => {
                  const selected = ingredients.find(ingredient => ingredient.id === row.ingredientId)
                  let lineCost = '0.000'
                  try {
                    if (selected) lineCost = multiplyDecimalMoney(selected.costPerUnit, row.quantityUsed || '0')
                  } catch {
                    lineCost = '0.000'
                  }
                  return (
                    <div key={`${row.ingredientId}-${index}`} className="grid gap-3 rounded-xl bg-surface-container-lowest p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
                      <label className="grid gap-1 text-sm font-medium text-on-surface">
                        {t('selectIngredient')}
                        <select
                          value={row.ingredientId}
                          onChange={event => setRecipe(rows => rows.map((item, rowIndex) => rowIndex === index
                            ? { ...item, ingredientId: event.target.value }
                            : item))}
                          className="min-h-12 rounded-xl border border-outline-variant bg-surface px-3 text-on-surface"
                        >
                          <option value="">{t('selectIngredient')}</option>
                          {ingredients.map(ingredient => (
                            <option
                              key={ingredient.id}
                              value={ingredient.id}
                              disabled={recipe.some((item, rowIndex) => rowIndex !== index && item.ingredientId === ingredient.id)}
                            >
                              {ingredient.name} · {formatCurrency(ingredient.costPerUnit)}/{ingredient.unitName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Input
                        label={copy.quantity}
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.quantityUsed}
                        onChange={event => setRecipe(rows => rows.map((item, rowIndex) => rowIndex === index
                          ? { ...item, quantityUsed: event.target.value }
                          : item))}
                      />
                      <div className="flex min-h-12 items-center justify-between gap-3 sm:justify-end">
                        <span className="font-mono text-sm font-semibold">{formatCurrency(lineCost)} IQD</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setRecipe(rows => rows.filter((_, rowIndex) => rowIndex !== index))}
                          aria-label={t('removeIngredient')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </form>
    </Modal>
  )
}
