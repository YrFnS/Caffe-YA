'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { PurchaseRow } from '../_types'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'

interface PurchasesListProps {
  purchases: PurchaseRow[]
  onNewPurchase: () => void
  onViewReceipt: (id: string) => void
  onViewDetails: (id: string) => void
  onPay: (id: string) => void
  onDelete: (id: string) => void
  permissions: {
    canCreate: boolean
    canReceive: boolean
    canPay: boolean
    canDelete: boolean
  }
  disabled?: boolean
}

export default function PurchasesList({
  purchases,
  onNewPurchase,
  onViewReceipt,
  onViewDetails,
  onPay,
  onDelete,
  permissions,
  disabled = false,
}: PurchasesListProps) {
  const t = useTranslations('procurement')
  const locale = useLocale()
  const searchLabel = locale === 'ar' ? 'بحث' : 'Search'
  const [filterPaid, setFilterPaid] = useState<boolean | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => purchases.filter(purchase => {
    if (filterPaid !== null && purchase.isPaid !== filterPaid) return false
    const term = search.trim().toLocaleLowerCase(locale)
    if (term && !`${purchase.vendorName ?? ''} ${purchase.id}`.toLocaleLowerCase(locale).includes(term)) return false
    return true
  }), [filterPaid, locale, purchases, search])

  const statusBadge = (purchase: PurchaseRow) => (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${purchase.isPaid ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'}`}>
      {purchase.isPaid ? t('paid') : t('unpaid')}
    </span>
  )

  const actions = (purchase: PurchaseRow) => (
    <div className="flex flex-wrap gap-2">
      {permissions.canReceive && !purchase.receivedAt && (
        <Button variant="secondary" size="sm" onClick={() => onViewReceipt(purchase.id)} disabled={disabled}>
          {t('receiveGoods')}
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => onViewDetails(purchase.id)} disabled={disabled}>
        {t('details')}
      </Button>
      {permissions.canPay && purchase.receivedAt && !purchase.isPaid && (
        <Button size="sm" onClick={() => onPay(purchase.id)} disabled={disabled}>
          {t('markPaid')}
        </Button>
      )}
      {permissions.canDelete && !purchase.receivedAt && !purchase.isPaid && (
        <Button variant="ghost" size="sm" onClick={() => onDelete(purchase.id)} disabled={disabled} className="text-error">
          {t('delete')}
        </Button>
      )}
    </div>
  )

  return (
    <section className="overflow-hidden rounded-2xl bg-surface-container-lowest">
      <div className="grid gap-3 border-b border-outline-variant p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {searchLabel}
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('vendor')}
            className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-on-surface"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {t('status')}
          <select
            value={filterPaid === null ? '' : filterPaid ? 'paid' : 'unpaid'}
            onChange={event => setFilterPaid(event.target.value === '' ? null : event.target.value === 'paid')}
            className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-on-surface"
          >
            <option value="">{t('all')}</option>
            <option value="paid">{t('paid')}</option>
            <option value="unpaid">{t('unpaid')}</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="grid min-h-56 place-items-center gap-3 p-8 text-center text-on-surface-variant">
          <p>{t('noPurchases')}</p>
          {permissions.canCreate && <Button onClick={onNewPurchase}>{t('newPurchase')}</Button>}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-sm text-on-surface-variant">
                  <th className="p-3 text-start">{t('vendor')}</th>
                  <th className="p-3 text-start">{t('total')}</th>
                  <th className="p-3 text-start">{t('status')}</th>
                  <th className="p-3 text-start">{t('date')}</th>
                  <th className="p-3 text-start">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(purchase => (
                  <tr key={purchase.id} className="border-b border-outline-variant/70 last:border-0 hover:bg-surface-container-low/70">
                    <td className="p-3 text-on-surface">
                      <p className="font-medium">{purchase.vendorName ?? '—'}</p>
                      <p className="font-mono text-xs text-on-surface-variant">#{purchase.id.slice(0, 8)}</p>
                    </td>
                    <td className="p-3 font-mono text-on-surface">{formatCurrency(purchase.totalAmount)} IQD</td>
                    <td className="p-3">{statusBadge(purchase)}</td>
                    <td className="p-3 text-sm text-on-surface-variant">{formatDate(purchase.createdAt, locale)}</td>
                    <td className="p-3">{actions(purchase)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {filtered.map(purchase => (
              <article key={purchase.id} className="rounded-2xl bg-surface-container-low p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">{purchase.vendorName ?? '—'}</p>
                    <p className="mt-1 font-mono text-xs text-on-surface-variant">#{purchase.id.slice(0, 8)}</p>
                  </div>
                  {statusBadge(purchase)}
                </div>
                <div className="my-4 flex items-end justify-between gap-3">
                  <p className="text-xs text-on-surface-variant">{formatDate(purchase.createdAt, locale)}</p>
                  <p className="font-mono text-lg font-bold text-on-surface">{formatCurrency(purchase.totalAmount)} IQD</p>
                </div>
                {actions(purchase)}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
