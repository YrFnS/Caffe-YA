'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createExpenseAction, deleteExpenseAction } from '../_actions/expenseActions'
import type { ExpenseRow, ExpenseCategoryRow } from '../_types'

interface ExpensesListProps {
  expenses: ExpenseRow[]
  categories: ExpenseCategoryRow[]
  currentShiftId: string
}

export default function ExpensesList({ expenses, categories, currentShiftId }: ExpensesListProps) {
  const t = useTranslations('expenses')
  const [showForm, setShowForm] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  const filtered = filterCategory ? expenses.filter(e => e.categoryId === filterCategory) : expenses

  async function handleSubmit() {
    const formData = new FormData()
    formData.set('shiftId', currentShiftId)
    formData.set('categoryId', categoryId)
    formData.set('amount', amount)
    formData.set('description', description)
    const result = await createExpenseAction(formData)
    if (!result.error) window.location.reload()
  }

  async function handleDelete(id: string) {
    if (confirm(t('confirmDelete'))) {
      await deleteExpenseAction(id)
      window.location.reload()
    }
  }

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="p-4 flex gap-4 flex-wrap border-b border-outline-variant">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-low text-on-surface"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="h-10 px-4 rounded-lg bg-primary text-on-primary font-medium text-body-sm">
            {t('addExpense')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant text-body-sm text-on-surface-variant">
                <th className="text-start p-3">{t('category')}</th>
                <th className="text-start p-3">{t('amount')}</th>
                <th className="text-start p-3">{t('description')}</th>
                <th className="text-start p-3">{t('date')}</th>
                <th className="text-start p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t('noExpenses')}</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-outline-variant hover:bg-surface-container-hover">
                  <td className="p-3 text-on-surface">{e.categoryName ?? '—'}</td>
                  <td className="p-3 text-on-surface">{Number(e.amount).toLocaleString()}</td>
                  <td className="p-3 text-on-surface text-body-sm">{e.description ?? '—'}</td>
                  <td className="p-3 text-on-surface-variant text-body-sm">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(e.id)} className="text-error text-body-sm hover:underline">{t('delete')}</button>
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
            <h2 className="text-headline-sm font-semibold mb-4">{t('addExpense')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('category')}</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" required>
                  <option value="">{t('selectCategory')}</option>
                  {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('amount')}</label>
                <input type="number" step="0.001" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" required />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('description')}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
                <button type="button" onClick={handleSubmit} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}