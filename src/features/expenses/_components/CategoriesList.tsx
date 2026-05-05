'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from '../_actions/expenseActions'
import type { ExpenseCategoryRow } from '../_types'

interface CategoriesListProps {
  categories: ExpenseCategoryRow[]
}

export default function CategoriesList({ categories }: CategoriesListProps) {
  const t = useTranslations('expenses')
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState<ExpenseCategoryRow | null>(null)
  const [name, setName] = useState('')

  async function handleSubmit() {
    const formData = new FormData()
    formData.set('name', name)
    if (editCategory) {
      await updateCategoryAction(editCategory.id, formData)
    } else {
      await createCategoryAction(formData)
    }
    window.location.reload()
  }

  async function handleDelete(id: string) {
    if (confirm(t('confirmDelete'))) {
      await deleteCategoryAction(id)
      window.location.reload()
    }
  }

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant text-body-sm text-on-surface-variant">
                <th className="text-start p-3">{t('name')}</th>
                <th className="text-start p-3">{t('status')}</th>
                <th className="text-start p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-on-surface-variant">{t('noCategories')}</td></tr>
              )}
              {categories.map(c => (
                <tr key={c.id} className="border-b border-outline-variant hover:bg-surface-container-hover">
                  <td className="p-3 text-on-surface font-medium">{c.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-body-sm ${c.isActive ? 'bg-green-10 text-green-30' : 'bg-error/10 text-error'}`}>
                      {c.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditCategory(c); setName(c.name); setShowForm(true) }} className="text-primary text-body-sm hover:underline">{t('edit')}</button>
                      <button onClick={() => handleDelete(c.id)} className="text-error text-body-sm hover:underline">{t('delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-headline-sm font-semibold mb-4">{editCategory ? t('editCategory') : t('addCategory')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('name')}</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditCategory(null); setName('') }} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
                <button type="button" onClick={handleSubmit} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}