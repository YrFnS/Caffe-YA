import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getTodaySummary } from '@/features/reports/_services/reportService'
import { db } from '@/lib/db'
import { orders, transactions, users } from '@/lib/schema'
import { desc, eq, inArray } from 'drizzle-orm'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const t = await getTranslations('common')

  const todaySummary = await getTodaySummary()

  // Get recent orders for the table
  const recentOrders = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    limit: 20,
  })

  // Fetch cashier names manually
  const cashierIds = [...new Set(recentOrders.map(o => o.cashierId))]
  const cashierMap: Record<string, string> = {}
  if (cashierIds.length > 0) {
    const cashiers = await db.select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, cashierIds))
    cashiers.forEach(c => { cashierMap[c.id] = c.name })
  }

  // Calculate total revenue from transactions
  const allTxs = await db.query.transactions.findMany({
    where: eq(transactions.isRefund, false),
  })
  const totalRevenue = allTxs.reduce((sum, tx) => sum + Number(tx.amount), 0).toFixed(3)

  return (
    <div className="space-y-6">
      <h1 className="text-headline-lg font-semibold text-on-surface">{t('reports')}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-low p-4 rounded-lg">
          <p className="text-sm text-on-surface-variant">Today's Sales</p>
          <p className="text-2xl font-bold text-on-surface">{todaySummary.salesTotal}</p>
        </div>
        <div className="bg-surface-container-low p-4 rounded-lg">
          <p className="text-sm text-on-surface-variant">Active Orders</p>
          <p className="text-2xl font-bold text-on-surface">{todaySummary.activeOrders}</p>
        </div>
        <div className="bg-surface-container-low p-4 rounded-lg">
          <p className="text-sm text-on-surface-variant">Active Timers</p>
          <p className="text-2xl font-bold text-on-surface">{todaySummary.activeTimers}</p>
        </div>
        <div className="bg-surface-container-low p-4 rounded-lg">
          <p className="text-sm text-on-surface-variant">Total Revenue</p>
          <p className="text-2xl font-bold text-on-surface">{totalRevenue}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="text-title-md font-medium text-on-surface">Recent Orders</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <p>No orders yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">ID</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Cashier</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Status</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Total</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-outline-variant last:border-0">
                  <td className="p-4 text-on-surface font-mono text-sm">{order.id.slice(0, 8)}...</td>
                  <td className="p-4 text-on-surface">{cashierMap[order.cashierId] ?? 'Unknown'}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-surface-container text-on-surface">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-on-surface">{order.totalAmount}</td>
                  <td className="p-4 text-on-surface-variant">{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}