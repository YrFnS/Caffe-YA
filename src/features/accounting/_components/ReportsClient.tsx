'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { PLReport, BalanceSheetReport } from '@/features/accounting/_types'

interface ReportsClientProps {
  initialPlData?: PLReport | null
  initialBsData?: BalanceSheetReport | null
}

export default function ReportsClient({ initialPlData, initialBsData }: ReportsClientProps) {
  const t = useTranslations('accounting')
  const [reportType, setReportType] = useState<'pl' | 'bs'>('pl')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [plData, setPlData] = useState<PLReport | null>(initialPlData ?? null)
  const [bsData, setBsData] = useState<BalanceSheetReport | null>(initialBsData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      if (reportType === 'pl') {
        if (!periodStart || !periodEnd) { setError('Period dates required'); return }
        const res = await fetch(`/api/accounting/reports/pl?periodStart=${periodStart}&periodEnd=${periodEnd}`)
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch P&L report')
        const data = await res.json()
        setPlData(data)
        setBsData(null)
      } else {
        const res = await fetch(`/api/accounting/reports/balance-sheet?asOfDate=${asOfDate}`)
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch balance sheet')
        const data = await res.json()
        setBsData(data)
        setPlData(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">Financial Reports</h1>

      <div className="bg-surface-container-lowest rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-body-sm text-on-surface-variant mb-1">Report</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as 'pl' | 'bs')}
              className="px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-surface"
            >
              <option value="pl">{t('profitAndLoss')}</option>
              <option value="bs">{t('balanceSheet')}</option>
            </select>
          </div>

          {reportType === 'pl' ? (
            <>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('periodStart')}</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-surface" />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('periodEnd')}</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-surface" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-body-sm text-on-surface-variant mb-1">{t('asOfDate')}</label>
              <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-outline bg-surface-container-low text-on-surface" />
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50"
          >
            {loading ? t('generateReport') + '…' : t('generateReport')}
          </button>
        </div>
        {error && <p className="mt-2 text-error text-body-sm">{error}</p>}
      </div>

      {plData && (
        <div className="bg-surface-container-lowest rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-sm font-semibold">{t('profitAndLoss')}</h2>
            <span className="text-body-sm text-on-surface-variant">
              {new Date(plData.periodStart).toLocaleDateString()} — {new Date(plData.periodEnd).toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-4">
            {plData.revenue.length > 0 && (
              <div>
                <h3 className="text-title-medium font-semibold text-on-surface mb-2">{t('type.revenue')}</h3>
                <table className="w-full">
                  <tbody>
                    {plData.revenue.map(r => (
                      <tr key={r.accountId} className="border-b border-outline-variant">
                        <td className="p-2 text-on-surface">{r.accountName}</td>
                        <td className="p-2 text-end font-mono text-on-surface">{parseFloat(r.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {plData.costOfSales.length > 0 && (
              <div>
                <h3 className="text-title-medium font-semibold text-on-surface mb-2">{t('type.cost_of_sales')}</h3>
                <table className="w-full">
                  <tbody>
                    {plData.costOfSales.map(r => (
                      <tr key={r.accountId} className="border-b border-outline-variant">
                        <td className="p-2 text-on-surface">{r.accountName}</td>
                        <td className="p-2 text-end font-mono text-on-surface">{parseFloat(r.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {plData.expenses.length > 0 && (
              <div>
                <h3 className="text-title-medium font-semibold text-on-surface mb-2">{t('type.expense')}</h3>
                <table className="w-full">
                  <tbody>
                    {plData.expenses.map(r => (
                      <tr key={r.accountId} className="border-b border-outline-variant">
                        <td className="p-2 text-on-surface">{r.accountName}</td>
                        <td className="p-2 text-end font-mono text-on-surface">{parseFloat(r.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-8 border-t border-outline pt-4">
            <div><span className="text-on-surface-variant me-4">{t('grossProfit')}:</span><span className="font-mono font-semibold text-on-surface">{parseFloat(plData.grossProfit).toLocaleString()}</span></div>
            <div><span className="text-on-surface-variant me-4">{t('netProfit')}:</span><span className="font-mono font-semibold text-primary">{parseFloat(plData.netProfit).toLocaleString()}</span></div>
          </div>
        </div>
      )}

      {bsData && (
        <div className="bg-surface-container-lowest rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-sm font-semibold">{t('balanceSheet')}</h2>
            <span className="text-body-sm text-on-surface-variant">{t('asOfDate')}: {new Date(bsData.asOfDate).toLocaleDateString()}</span>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              { title: t('type.asset'), label: t('totalAssets'), accounts: bsData.assets, total: bsData.totalAssets },
              { title: t('type.liability'), label: t('totalLiabilities'), accounts: bsData.liabilities, total: bsData.totalLiabilities },
              { title: t('type.equity'), label: t('totalEquity'), accounts: bsData.equity, total: bsData.totalEquity },
            ].map(col => (
              <div key={col.title}>
                <h3 className="text-title-medium font-semibold text-on-surface mb-2">{col.title}</h3>
                <table className="w-full">
                  <tbody>
                    {col.accounts.map(a => (
                      <tr key={a.accountId} className="border-b border-outline-variant">
                        <td className="p-2 text-on-surface text-body-sm">{a.accountName}</td>
                        <td className="p-2 text-end font-mono text-on-surface text-body-sm">{parseFloat(a.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-outline font-semibold">
                      <td className="p-2 text-on-surface">{col.label}</td>
                      <td className="p-2 text-end font-mono text-on-surface">{parseFloat(col.total).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}