import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { db } from '../../../lib/db.ts'
import {
  auditLogs,
  chartOfAccounts,
  expenses,
  journalEntries,
  journalEntryLines,
  orderItems,
  orders,
  products,
  transactions,
  users,
} from '../../../lib/schema.ts'
import { fromCents, toCents } from '../../../lib/currency.ts'
import { getBaghdadReportRange } from '../reportDateRange.ts'

export interface OperationalReportFilters {
  from?: string
  to?: string
  action?: string
}

export interface OperationalReport {
  range: {
    from: Date
    to: Date
    fromInput: string
    toInput: string
  }
  summary: {
    netSales: string
    costOfGoods: string
    grossProfit: string
    expenses: string
    netResult: string
    closedOrders: number
    averageOrder: string
  }
  paymentTotals: Array<{
    method: string
    amount: string
  }>
  topProducts: Array<{
    id: string
    name: string
    nameAr: string | null
    quantity: string
    revenue: string
  }>
  recentOrders: Array<{
    id: string
    cashierName: string
    totalAmount: string
    closedAt: Date
  }>
  auditRows: Array<{
    id: string
    createdAt: Date
    userName: string | null
    action: string
    targetTable: string | null
    targetId: string | null
  }>
  actions: string[]
}

export async function getOperationalReport(filters: OperationalReportFilters): Promise<OperationalReport> {
  const range = getBaghdadReportRange(filters)
  const auditDateFilter = and(
    gte(auditLogs.createdAt, range.from),
    lte(auditLogs.createdAt, range.to),
  )

  const [
    closedOrderRows,
    paymentRows,
    expenseRows,
    cogsRows,
    topProducts,
    recentOrders,
    auditRows,
    actionRows,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(
        eq(orders.status, 'closed'),
        gte(orders.closedAt, range.from),
        lte(orders.closedAt, range.to),
      )),
    db.select({
      method: transactions.paymentMethod,
      amount: sql<string>`coalesce(sum(case when ${transactions.isRefund} then -${transactions.amount}::numeric else ${transactions.amount}::numeric end), 0)::text`,
    })
      .from(transactions)
      .where(and(
        gte(transactions.createdAt, range.from),
        lte(transactions.createdAt, range.to),
      ))
      .groupBy(transactions.paymentMethod),
    db.select({ amount: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)::text` })
      .from(expenses)
      .where(and(
        gte(expenses.createdAt, range.from),
        lte(expenses.createdAt, range.to),
      )),
    db.select({
      amount: sql<string>`coalesce(sum(case when ${journalEntryLines.type} = 'debit' then ${journalEntryLines.amount}::numeric else -${journalEntryLines.amount}::numeric end), 0)::text`,
    })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(chartOfAccounts.code, '5001'),
        gte(journalEntries.createdAt, range.from),
        lte(journalEntries.createdAt, range.to),
      )),
    db.select({
      id: products.id,
      name: products.name,
      nameAr: products.nameAr,
      quantity: sql<string>`coalesce(sum(${orderItems.quantity}::numeric), 0)::text`,
      revenue: sql<string>`coalesce(sum(${orderItems.totalPrice}::numeric), 0)::text`,
    })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        eq(orders.status, 'closed'),
        isNull(orderItems.voidedAt),
        gte(orders.closedAt, range.from),
        lte(orders.closedAt, range.to),
      ))
      .groupBy(products.id, products.name, products.nameAr)
      .orderBy(desc(sql`sum(${orderItems.quantity}::numeric)`))
      .limit(8),
    db.select({
      id: orders.id,
      cashierName: users.name,
      totalAmount: orders.totalAmount,
      closedAt: orders.closedAt,
    })
      .from(orders)
      .innerJoin(users, eq(orders.cashierId, users.id))
      .where(and(
        eq(orders.status, 'closed'),
        gte(orders.closedAt, range.from),
        lte(orders.closedAt, range.to),
      ))
      .orderBy(desc(orders.closedAt))
      .limit(50),
    db.select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      userName: users.name,
      action: auditLogs.action,
      targetTable: auditLogs.targetTable,
      targetId: auditLogs.targetId,
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(
        auditDateFilter,
        filters.action ? eq(auditLogs.action, filters.action) : undefined,
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50),
    db.selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(auditDateFilter)
      .orderBy(auditLogs.action),
  ])

  const paymentTotals = paymentRows
    .map(row => ({ method: row.method, amount: fromCents(toCents(row.amount)) }))
    .filter(row => toCents(row.amount) !== 0)
  const netSales = paymentTotals.reduce((sum, row) => sum + toCents(row.amount), 0)
  const expensesTotal = toCents(expenseRows[0]?.amount ?? '0')
  const costOfGoods = toCents(cogsRows[0]?.amount ?? '0')
  const grossProfit = netSales - costOfGoods
  const closedOrders = closedOrderRows[0]?.count ?? 0

  return {
    range,
    summary: {
      netSales: fromCents(netSales),
      costOfGoods: fromCents(costOfGoods),
      grossProfit: fromCents(grossProfit),
      expenses: fromCents(expensesTotal),
      netResult: fromCents(grossProfit - expensesTotal),
      closedOrders,
      averageOrder: closedOrders ? fromCents(Math.round(netSales / closedOrders)) : '0.000',
    },
    paymentTotals,
    topProducts,
    recentOrders: recentOrders.flatMap(order => order.closedAt ? [{ ...order, closedAt: order.closedAt }] : []),
    auditRows,
    actions: actionRows.map(row => row.action),
  }
}
