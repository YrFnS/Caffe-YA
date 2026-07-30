import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { hasPermission } from '@/features/admin/_actions/adminActions'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/currency'
import { formatDateTime } from '@/lib/format'
import {
  getOperationalReport,
  type OperationalReportFilters,
} from '@/features/reports/_services/operationalReportService'

interface ReportsPageProps {
  searchParams: Promise<OperationalReportFilters>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  if (!await hasPermission(session.user.id, 'reports.view')) redirect('/dashboard')

  const params = await searchParams
  const [report, t, locale] = await Promise.all([
    getOperationalReport(params),
    getTranslations('reports'),
    getLocale(),
  ])

  const paymentLabel = (method: string) => {
    if (method === 'cash') return t('cash')
    if (method === 'card') return t('card')
    if (method === 'mobile_wallet') return t('mobileWallet')
    return method.replaceAll('_', ' ')
  }

  const summaryCards = [
    { label: t('netSales'), value: report.summary.netSales },
    { label: t('costOfGoods'), value: report.summary.costOfGoods },
    { label: t('grossProfit'), value: report.summary.grossProfit },
    { label: t('expenses'), value: report.summary.expenses },
    { label: t('net'), value: report.summary.netResult },
    { label: t('averageOrder'), value: report.summary.averageOrder },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('baghdadRange', { from: report.range.fromInput, to: report.range.toInput })}
          </p>
        </div>

        <form className="grid gap-3 rounded-2xl bg-surface-container-low p-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(10rem,1fr))_auto]">
          <label className="grid gap-1 text-sm font-medium text-on-surface">
            {t('from')}
            <input
              name="from"
              type="date"
              defaultValue={report.range.fromInput}
              className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-on-surface">
            {t('to')}
            <input
              name="to"
              type="date"
              defaultValue={report.range.toInput}
              className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-on-surface">
            {t('action')}
            <select
              name="action"
              defaultValue={params.action ?? ''}
              className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface"
            >
              <option value="">{t('all')}</option>
              {report.actions.map(action => <option key={action} value={action}>{action}</option>)}
            </select>
          </label>
          <button className="min-h-12 self-end rounded-xl bg-primary px-5 font-semibold text-on-primary">
            {t('apply')}
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map(card => (
          <section key={card.label} className="rounded-2xl bg-surface-container-low p-5">
            <p className="text-sm text-on-surface-variant">{card.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-on-surface">
              {formatCurrency(card.value)} <span className="text-sm font-medium">IQD</span>
            </p>
          </section>
        ))}
        <section className="rounded-2xl bg-surface-container-low p-5 sm:col-span-2 xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-on-surface-variant">{t('orders')}</p>
            <p className="font-mono text-2xl font-bold text-on-surface">{report.summary.closedOrders}</p>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-surface-container-low p-5">
          <h2 className="mb-4 text-title-md font-semibold text-on-surface">{t('paymentBreakdown')}</h2>
          {report.paymentTotals.length ? (
            <div className="space-y-2">
              {report.paymentTotals.map(payment => (
                <div key={payment.method} className="flex min-h-12 items-center justify-between gap-4 rounded-xl bg-surface-container-lowest px-4">
                  <span className="font-medium text-on-surface">{paymentLabel(payment.method)}</span>
                  <span className="font-mono font-semibold text-on-surface">
                    {formatCurrency(payment.amount)} IQD
                  </span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={FileText} title={t('noData')} />}
        </section>

        <section className="rounded-2xl bg-surface-container-low p-5">
          <h2 className="mb-4 text-title-md font-semibold text-on-surface">{t('topProducts')}</h2>
          {report.topProducts.length ? (
            <div className="space-y-2">
              {report.topProducts.map(product => (
                <div key={product.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl bg-surface-container-lowest px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">
                      {locale === 'ar' ? product.nameAr || product.name : product.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {t('productRevenue')}: {formatCurrency(product.revenue)} IQD
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-on-surface">
                    {t('unitsSold', { count: product.quantity })}
                  </span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={FileText} title={t('noData')} />}
        </section>
      </div>

      <section className="rounded-2xl bg-surface-container-low p-4 sm:p-5">
        <h2 className="mb-4 text-title-md font-semibold text-on-surface">{t('recentOrders')}</h2>
        {report.recentOrders.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-sm text-on-surface-variant">
                    <th className="p-3 text-start">{t('id')}</th>
                    <th className="p-3 text-start">{t('cashier')}</th>
                    <th className="p-3 text-start">{t('status')}</th>
                    <th className="p-3 text-start">{t('total')}</th>
                    <th className="p-3 text-start">{t('date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-outline-variant/70 last:border-0">
                      <td className="p-3 font-mono">{order.id.slice(0, 8)}</td>
                      <td className="p-3">{order.cashierName}</td>
                      <td className="p-3"><span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">{t('closed')}</span></td>
                      <td className="p-3 font-mono">{formatCurrency(order.totalAmount)} IQD</td>
                      <td className="p-3 text-on-surface-variant">{formatDateTime(order.closedAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {report.recentOrders.map(order => (
                <article key={order.id} className="rounded-xl bg-surface-container-lowest p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">{order.cashierName}</p>
                    </div>
                    <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs font-semibold text-secondary">{t('closed')}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-xs text-on-surface-variant">{formatDateTime(order.closedAt, locale)}</p>
                    <p className="font-mono font-bold">{formatCurrency(order.totalAmount)} IQD</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : <EmptyState icon={FileText} title={t('noData')} />}
      </section>

      <section className="rounded-2xl bg-surface-container-low p-4 sm:p-5">
        <h2 className="mb-4 text-title-md font-semibold text-on-surface">{t('auditLog')}</h2>
        {report.auditRows.length ? (
          <div className="grid gap-3">
            {report.auditRows.map(log => (
              <article key={log.id} className="grid gap-2 rounded-xl bg-surface-container-lowest p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="break-words font-mono text-sm font-semibold text-on-surface">{log.action}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {log.userName ?? '—'} · {log.targetTable ?? '—'} {log.targetId?.slice(0, 8) ?? ''}
                  </p>
                </div>
                <time className="text-xs text-on-surface-variant">{formatDateTime(log.createdAt, locale)}</time>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={FileText} title={t('noAudit')} />}
      </section>
    </div>
  )
}
