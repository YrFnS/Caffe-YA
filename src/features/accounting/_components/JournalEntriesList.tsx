'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createJournalEntryAction } from '../_actions/accountingActions'
import type { JournalEntryRow, AccountRow } from '../_types'

interface JournalEntriesListProps {
  entries: JournalEntryRow[]
  accounts: AccountRow[]
}

interface LineInput { accountId: string; type: 'debit' | 'credit'; amount: string; note: string; journalEntryId?: string }

export default function JournalEntriesList({ entries, accounts }: JournalEntriesListProps) {
  const t = useTranslations('accounting')
  const [showForm, setShowForm] = useState(false)
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<LineInput[]>([
    { accountId: '', type: 'debit', amount: '', note: '' },
    { accountId: '', type: 'credit', amount: '', note: '' },
  ])

  function addLine() {
    setLines(prev => [...prev, { accountId: '', type: 'debit', amount: '', note: '' }])
  }

  function removeLine(i: number) {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, field: keyof LineInput, value: string) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  async function handleSubmit() {
    const validLines = lines.filter(l => l.accountId && l.amount)
    await createJournalEntryAction({ reference: reference || undefined, description: description || undefined, lines: validLines })
    window.location.reload()
  }

  const totalDebit = lines.filter(l => l.type === 'debit').reduce((s, l) => s + parseFloat(l.amount || '0'), 0)
  const totalCredit = lines.filter(l => l.type === 'credit').reduce((s, l) => s + parseFloat(l.amount || '0'), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">
          {t('newEntry')}
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant text-body-sm text-on-surface-variant">
                <th className="text-start p-3">{t('date')}</th>
                <th className="text-start p-3">{t('reference')}</th>
                <th className="text-start p-3">{t('description')}</th>
                <th className="text-start p-3">{t('source')}</th>
                <th className="text-start p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t('noEntries')}</td></tr>
              )}
              {entries.map(e => (
                <tr key={e.id} className="border-b border-outline-variant hover:bg-surface-container-hover">
                  <td className="p-3 text-body-sm text-on-surface">{e.createdAt.toLocaleDateString()}</td>
                  <td className="p-3 font-mono text-body-sm text-primary">{e.reference ?? '—'}</td>
                  <td className="p-3 text-body-sm text-on-surface">{e.description ?? '—'}</td>
                  <td className="p-3 text-body-sm text-on-surface-variant">{e.sourceType ?? 'manual'}</td>
                  <td className="p-3"><button className="text-primary text-body-sm hover:underline">{t('view')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-headline-sm font-semibold mb-4">{t('newEntry')}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm text-on-surface-variant mb-1">{t('reference')}</label>
                  <input value={reference} onChange={e => setReference(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" />
                </div>
                <div>
                  <label className="block text-body-sm text-on-surface-variant mb-1">{t('description')}</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-body-sm text-on-surface-variant">{t('lines')}</label>
                  <button onClick={addLine} className="text-primary text-body-sm hover:underline">+ {t('addLine')}</button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={line.type} onChange={e => updateLine(i, 'type', e.target.value as 'debit' | 'credit')} className="px-2 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface text-body-sm">
                        <option value="debit">{t('debit')}</option>
                        <option value="credit">{t('credit')}</option>
                      </select>
                      <select value={line.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)} className="flex-1 px-2 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface text-body-sm">
                        <option value="">— {t('selectAccount')} —</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                      <input type="number" value={line.amount} onChange={e => updateLine(i, 'amount', e.target.value)} placeholder="0.000" step="0.001" className="w-32 px-2 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface text-body-sm" />
                      <input value={line.note} onChange={e => updateLine(i, 'note', e.target.value)} placeholder={t('note')} className="w-24 px-2 py-2 rounded-lg border border-outline-variable bg-surface-container-lowest text-on-surface text-body-sm" />
                      {lines.length > 2 && <button onClick={() => removeLine(i)} className="text-error text-body-sm">×</button>}
                    </div>
                  ))}
                </div>
                <div className={`mt-2 text-body-sm font-medium ${isBalanced ? 'text-green-30' : 'text-error'}`}>
                  {t('debit')}: {totalDebit.toFixed(3)} &nbsp; {t('credit')}: {totalCredit.toFixed(3)}
                  {!isBalanced && <span className="ms-2">⚠ {t('notBalanced')}</span>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
                <button type="button" onClick={handleSubmit} disabled={!isBalanced} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
