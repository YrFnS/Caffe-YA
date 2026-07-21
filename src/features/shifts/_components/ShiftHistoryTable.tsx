"use client"

import { useTranslations } from 'next-intl'
import type { ShiftSummary } from '../_types'
import { formatCurrency, toCents } from '@/lib/currency'

interface ShiftHistoryTableProps {
  history: ShiftSummary[]
}

export default function ShiftHistoryTable({ history }: ShiftHistoryTableProps) {
  const t = useTranslations('shifts')

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body-lg text-on-surface-variant">{t('noHistory')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-container-low">
            <th className="text-start px-4 py-3 text-label-md text-on-surface-variant">{t('cashier')}</th>
            <th className="text-start px-4 py-3 text-label-md text-on-surface-variant">{t('openedAt')}</th>
            <th className="text-start px-4 py-3 text-label-md text-on-surface-variant">{t('closedAt')}</th>
            <th className="text-end px-4 py-3 text-label-md text-on-surface-variant">{t('float')}</th>
            <th className="text-end px-4 py-3 text-label-md text-on-surface-variant">{t('expectedCash')}</th>
            <th className="text-end px-4 py-3 text-label-md text-on-surface-variant">{t('variance')}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((shift) => {
            const variance = shift.cashVariance ? toCents(shift.cashVariance) : 0
            const isOver = variance > 0
            const isShort = variance < 0
            return (
              <tr
                key={shift.id}
                className="border-b border-outline-variant/15 hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <td className="px-4 py-3.5 text-body-md text-on-surface">{shift.cashierName}</td>
                <td className="px-4 py-3.5 text-body-md text-on-surface">
                  {new Date(shift.openedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-body-md text-on-surface">
                  {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3.5 text-body-md text-end text-on-surface font-mono">
                  {formatCurrency(shift.openingFloat)}
                </td>
                <td className="px-4 py-3.5 text-body-md text-end text-on-surface font-mono">
                  {shift.closingExpectedCash ? formatCurrency(shift.closingExpectedCash) : '—'}
                </td>
                <td className={`px-4 py-3.5 text-body-md text-end font-mono font-semibold ${
                  isOver ? 'text-secondary' : isShort ? 'text-tertiary' : 'text-secondary'
                }`}>
                  {shift.cashVariance !== null && shift.cashVariance !== undefined
                    ? `${isOver ? '+' : ''}${formatCurrency(shift.cashVariance)}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
