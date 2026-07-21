import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { hasPermission } from '@/features/admin/_actions/adminActions'
import { db } from '@/lib/db'
import { auditLogs, expenses, orderItems, orders, products, transactions, users } from '@/lib/schema'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { formatCurrency, fromCents, toCents } from '@/lib/currency'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileText } from 'lucide-react'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; action?: string }> }) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  if (!await hasPermission(session.user.id, 'reports.view')) redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const from = params.from ? new Date(`${params.from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = params.to ? new Date(`${params.to}T23:59:59.999`) : now
  const t = await getTranslations('reports')
  const dateConditions = [gte(orders.createdAt, from), lte(orders.createdAt, to)]

  const [periodOrders, periodTransactions, periodExpenses, auditRows, topProducts] = await Promise.all([
    db.query.orders.findMany({ where: and(...dateConditions), orderBy: [desc(orders.createdAt)], limit: 50 }),
    db.query.transactions.findMany({ where: and(gte(transactions.createdAt, from), lte(transactions.createdAt, to)) }),
    db.query.expenses.findMany({ where: and(gte(expenses.createdAt, from), lte(expenses.createdAt, to)) }),
    db.query.auditLogs.findMany({
      where: and(gte(auditLogs.createdAt, from), lte(auditLogs.createdAt, to), params.action ? eq(auditLogs.action, params.action) : undefined),
      orderBy: [desc(auditLogs.createdAt)],
      limit: 50,
    }),
    db.select({ name: products.name, quantity: sql<string>`SUM(${orderItems.quantity}::numeric)` })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.status, 'closed'), gte(orders.closedAt, from), lte(orders.closedAt, to)))
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`SUM(${orderItems.quantity}::numeric)`))
      .limit(5),
  ])

  const userIds = [...new Set([...periodOrders.map(order => order.cashierId), ...auditRows.map(log => log.userId).filter(Boolean) as string[]])]
  const userRows = userIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : []
  const userNames = new Map(userRows.map(user => [user.id, user.name]))
  const netSales = periodTransactions.reduce((sum, transaction) => sum + (transaction.isRefund ? -toCents(transaction.amount) : toCents(transaction.amount)), 0)
  const expenseTotal = periodExpenses.reduce((sum, expense) => sum + toCents(expense.amount), 0)
  const paymentTotals = periodTransactions.reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.paymentMethod] = (totals[transaction.paymentMethod] ?? 0) + (transaction.isRefund ? -toCents(transaction.amount) : toCents(transaction.amount))
    return totals
  }, {})
  const actions = [...new Set(auditRows.map(log => log.action))].sort()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">{t('from')}<input name="from" type="date" defaultValue={params.from} className="ms-2 rounded-lg border border-outline bg-surface p-2" /></label>
          <label className="text-sm">{t('to')}<input name="to" type="date" defaultValue={params.to} className="ms-2 rounded-lg border border-outline bg-surface p-2" /></label>
          <label className="text-sm">{t('action')}<select name="action" defaultValue={params.action ?? ''} className="ms-2 rounded-lg border border-outline bg-surface p-2"><option value="">{t('all')}</option>{actions.map(action => <option key={action}>{action}</option>)}</select></label>
          <button className="rounded-lg bg-primary px-4 py-2 text-on-primary">{t('apply')}</button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[[t('netSales'), formatCurrency(fromCents(netSales))], [t('expenses'), formatCurrency(fromCents(expenseTotal))], [t('net'), formatCurrency(fromCents(netSales - expenseTotal))], [t('orders'), String(periodOrders.length)]].map(([label, value]) => <div key={label} className="rounded-xl bg-surface-container-low p-4"><p className="text-sm text-on-surface-variant">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-surface-container-low p-4"><h2 className="mb-3 text-title-md font-medium">{t('paymentBreakdown')}</h2>{Object.keys(paymentTotals).length ? Object.entries(paymentTotals).map(([method, amount]) => <div key={method} className="flex justify-between py-2"><span>{method}</span><span>{formatCurrency(fromCents(amount))} IQD</span></div>) : <EmptyState icon={FileText} title={t('noData')} />}</section>
        <section className="rounded-xl bg-surface-container-low p-4"><h2 className="mb-3 text-title-md font-medium">{t('topProducts')}</h2>{topProducts.length ? topProducts.map(product => <div key={product.name} className="flex justify-between py-2"><span>{product.name}</span><span>{product.quantity}</span></div>) : <EmptyState icon={FileText} title={t('noData')} />}</section>
      </div>

      <section className="overflow-x-auto rounded-xl bg-surface-container-low"><h2 className="p-4 text-title-md font-medium">{t('recentOrders')}</h2>{periodOrders.length ? <table className="w-full"><thead><tr><th className="p-3 text-start">{t('id')}</th><th className="p-3 text-start">{t('cashier')}</th><th className="p-3 text-start">{t('status')}</th><th className="p-3 text-start">{t('total')}</th><th className="p-3 text-start">{t('date')}</th></tr></thead><tbody>{periodOrders.map(order => <tr key={order.id} className="border-t border-outline-variant"><td className="p-3 font-mono">{order.id.slice(0, 8)}</td><td className="p-3">{userNames.get(order.cashierId) ?? '—'}</td><td className="p-3">{order.status}</td><td className="p-3">{formatCurrency(order.totalAmount)}</td><td className="p-3">{order.createdAt.toLocaleString()}</td></tr>)}</tbody></table> : <EmptyState icon={FileText} title={t('noData')} />}</section>

      <section className="overflow-x-auto rounded-xl bg-surface-container-low"><h2 className="p-4 text-title-md font-medium">{t('auditLog')}</h2>{auditRows.length ? <table className="w-full"><thead><tr><th className="p-3 text-start">{t('date')}</th><th className="p-3 text-start">{t('user')}</th><th className="p-3 text-start">{t('action')}</th><th className="p-3 text-start">{t('target')}</th></tr></thead><tbody>{auditRows.map(log => <tr key={log.id} className="border-t border-outline-variant"><td className="p-3">{log.createdAt.toLocaleString()}</td><td className="p-3">{log.userId ? userNames.get(log.userId) ?? '—' : '—'}</td><td className="p-3 font-mono text-sm">{log.action}</td><td className="p-3">{log.targetTable ?? '—'} {log.targetId?.slice(0, 8) ?? ''}</td></tr>)}</tbody></table> : <EmptyState icon={FileText} title={t('noAudit')} />}</section>
    </div>
  )
}
