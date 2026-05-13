'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PurchaseRow } from '../_types'

interface PurchasesListProps {
  purchases: PurchaseRow[]
  onNewPurchase: () => void
  onViewReceipt: (id: string) => void
}

export default function PurchasesList({ purchases, onNewPurchase, onViewReceipt }: PurchasesListProps) {
  void onNewPurchase // provided for parent use
  void onViewReceipt // provided for parent use
  const t = useTranslations('procurement')
  const [filterPaid, setFilterPaid] = useState<boolean | null>(null)
  const [filterVendor] = useState<string>('')

  const filtered = purchases.filter(p => {
    if (filterPaid !== null && p.isPaid !== filterPaid) return false
    if (filterVendor && p.vendorId !== filterVendor) return false
    return true
  })

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
      <div className="p-4 flex gap-4 flex-wrap border-b border-outline-variant">
        <select
          value={filterPaid === null ? '' : filterPaid ? 'paid' : 'unpaid'}
          onChange={e => setFilterPaid(e.target.value === '' ? null : e.target.value === 'paid')}
          className="px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-surface"
        >
          <option value="">{t('all')}</option>
          <option value="paid">{t('paid')}</option>
          <option value="unpaid">{t('unpaid')}</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant text-body-sm text-on-surface-variant">
              <th className="text-start p-3">{t('vendor')}</th>
              <th className="text-start p-3">{t('total')}</th>
              <th className="text-start p-3">{t('status')}</th>
              <th className="text-start p-3">{t('date')}</th>
              <th className="text-start p-3">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t('noPurchases')}</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container-hover">
                <td className="p-3 text-on-surface">{p.vendorName ?? '—'}</td>
                <td className="p-3 text-on-surface">{Number(p.totalAmount).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-body-sm ${p.isPaid ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'}`}>
                    {p.isPaid ? t('paid') : t('unpaid')}
                  </span>
                </td>
                <td className="p-3 text-on-surface-variant text-body-sm">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {!p.isPaid && (
                      <button onClick={() => onViewReceipt(p.id)} className="text-primary text-body-sm hover:underline">
                        {t('receiveGoods')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}