"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setRecipeAction } from '@/features/inventory/_actions/productActions'

interface IngredientWithUnitName {
  id: string
  name: string
  unitName: string
}

interface RecipeEditorProps {
  productId: string
  ingredients: IngredientWithUnitName[]
  currentRecipe: Array<{ ingredientId: string; quantityUsed: string }>
  onClose: () => void
  onSaved: () => void
}

export default function RecipeEditor({
  productId,
  ingredients,
  currentRecipe,
  onClose,
  onSaved,
}: RecipeEditorProps) {
  const t = useTranslations('inventory')
  const [recipe, setRecipe] = useState(currentRecipe)
  const [loading, setLoading] = useState(false)

  const handleAddIngredient = () => {
    setRecipe([...recipe, { ingredientId: '', quantityUsed: '' }])
  }

  const handleRemoveIngredient = (index: number) => {
    setRecipe(recipe.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, field: 'ingredientId' | 'quantityUsed', value: string) => {
    const updated = [...recipe]
    updated[index] = { ...updated[index], [field]: value }
    setRecipe(updated)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set('productId', productId)
      formData.set('ingredients', JSON.stringify(recipe))
      await setRecipeAction(formData)
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  const ingredientOptions = ingredients.map((ing) => ({
    value: ing.id,
    label: `${ing.name} (${ing.unitName})`,
  }))

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t('recipe')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? t('loading') : t('save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {recipe.map((item, index) => (
          <div key={index} className="flex gap-2 items-end">
            <Select
              label={t('ingredients')}
              options={ingredientOptions}
              value={item.ingredientId}
              onChange={(e) => handleIngredientChange(index, 'ingredientId', e.target.value)}
              placeholder="Select ingredient"
            />
            <Input
              label={t('quantity')}
              type="number"
              step="0.001"
              value={item.quantityUsed}
              onChange={(e) => handleIngredientChange(index, 'quantityUsed', e.target.value)}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleRemoveIngredient(index)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={handleAddIngredient}>
          <Plus className="w-4 h-4" />
          Add Ingredient
        </Button>
      </div>
    </Modal>
  )
}