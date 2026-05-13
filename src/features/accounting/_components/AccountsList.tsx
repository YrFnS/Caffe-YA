'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createAccountAction, updateAccountAction } from '../_actions/accountingActions'
import type { AccountRow, AccountType } from '../_types'

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense']

interface AccountsListProps {
  accounts: AccountRow[]
}

export default function AccountsList({ accounts }: AccountsListProps) {
  const t = useTranslations('accounting')
  const [showForm, setShowForm] = useState(false)
  const [editAccount, setEditAccount] = useState<AccountRow | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [type, setType] = useState<AccountType>('asset')
  const [parentId, setParentId] = useState('')

  function buildTree(rows: AccountRow[], parentId: string | null = null): AccountRow[] {
    return rows.filter(a => a.parentId === parentId).map(a => ({ ...a, children: buildTree(rows, a.id) }))
  }

  const tree = buildTree(accounts)

  async function handleSubmit() {
    const data = { code, name, nameAr: nameAr || undefined, type, parentId: parentId || undefined }
    if (editAccount) {
      await updateAccountAction(editAccount.id, data)
    } else {
      await createAccountAction(data)
    }
    window.location.reload()
  }

  function renderTree(nodes: AccountRow[], depth = 0) {
    return nodes.map(acc => (
      <tr key={acc.id} className="border-b border-outline-variant hover:bg-surface-container-hover">
        <td className="p-3" style={{ paddingInlineStart: `${1 + depth * 1.5}rem` }}>
          <span className="font-mono text-body-sm text-primary me-2">{acc.code}</span>
          <span className="text-on-surface">{acc.name}</span>
          {acc.nameAr && <span className="text-on-surface-variant ms-2">({acc.nameAr})</span>}
        </td>
        <td className="p-3 text-body-sm">{t(`type.${acc.type}`)}</td>
        <td className="p-3">
          <span className={`px-2 py-1 rounded-full text-body-sm ${acc.isActive ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
            {acc.isActive ? t('active') : t('inactive')}
          </span>
        </td>
        <td className="p-3">
          <div className="flex gap-2">
            <button onClick={() => { setEditAccount(acc); setCode(acc.code); setName(acc.name); setNameAr(acc.nameAr ?? ''); setType(acc.type); setParentId(acc.parentId ?? ''); setShowForm(true) }} className="text-primary text-body-sm hover:underline">{t('edit')}</button>
          </div>
        </td>
        {acc.children && acc.children.length > 0 && renderTree(acc.children, depth + 1)}
      </tr>
    ))
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditAccount(null); setCode(''); setName(''); setNameAr(''); setType('asset'); setParentId(''); setShowForm(true) }} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">
          {t('addAccount')}
        </button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant text-body-sm text-on-surface-variant">
                <th className="text-start p-3">{t('account')}</th>
                <th className="text-start p-3">{t('type')}</th>
                <th className="text-start p-3">{t('status')}</th>
                <th className="text-start p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-on-surface-variant">{t('noAccounts')}</td></tr>
              )}
              {renderTree(tree)}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-headline-sm font-semibold mb-4">{editAccount ? t('editAccount') : t('addAccount')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('code')}</label>
                <input value={code} onChange={e => setCode(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" required />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('name')}</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" required />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('nameAr')}</label>
                <input value={nameAr} onChange={e => setNameAr(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('type')}</label>
                <select value={type} onChange={e => setType(e.target.value as AccountType)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface">
                  {ACCOUNT_TYPES.map(tp => <option key={tp} value={tp}>{t(tp === 'cogs' ? 'type.cogs' : `type.${tp}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('parentAccount')}</label>
                <select value={parentId} onChange={e => setParentId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface">
                  <option value="">—</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
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
