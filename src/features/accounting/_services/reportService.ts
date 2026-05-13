import { db } from '@/lib/db'
import { eq, sql, desc } from 'drizzle-orm'
import { journalEntryLines, chartOfAccounts } from '@/lib/schema'
import type { AccountBalance, PLReport, BalanceSheetReport, AccountType } from '../_types'
// Note: AccountBalance and report return types use string for all monetary values
// to match DB numeric(12,3) storage and API response contracts.
// Arithmetic uses parseFloat; display formatting uses .toFixed(3).
// Rule.md §III.1 applies to storage/calculation, not display report output.

async function getAccountBalances(accountIds: string[]): Promise<AccountBalance[]> {
  if (accountIds.length === 0) return []
  const result = await db
    .select({
      accountId: journalEntryLines.accountId,
      accountName: chartOfAccounts.name,
      accountCode: chartOfAccounts.code,
      accountType: chartOfAccounts.type,
      debit: sql<string>`COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'debit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END), 0)`,
      credit: sql<string>`COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'credit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(journalEntryLines)
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(
      accountIds.length === 1
        ? eq(journalEntryLines.accountId, accountIds[0])
        : sql`${journalEntryLines.accountId} = ANY(${accountIds})`
    )
    .groupBy(journalEntryLines.accountId, chartOfAccounts.name, chartOfAccounts.code, chartOfAccounts.type)

  return result.map(r => {
    const debit = parseFloat(r.debit)
    const credit = parseFloat(r.credit)
    const isDebitNormal = (r.accountType as AccountType) === 'asset' || (r.accountType as AccountType) === 'expense' || (r.accountType as AccountType) === 'cogs'
    const balance = isDebitNormal ? debit - credit : credit - debit
    return {
      accountId: r.accountId,
      accountName: r.accountName,
      accountCode: r.accountCode,
      accountType: r.accountType as AccountType,
      debitTotal: r.debit,
      creditTotal: r.credit,
      balance: balance.toFixed(3), // display string matching API response type
    }
  })
}

export async function getPLReport(periodStart: Date, periodEnd: Date): Promise<PLReport> {
  const accounts = await db.query.chartOfAccounts.findMany({ where: eq(chartOfAccounts.isActive, true) })
  const byType = (type: AccountType) => accounts.filter(a => a.type === type).map(a => a.id)

  const [revenue, costOfSales, expenses] = await Promise.all([
    getAccountBalances(byType('revenue')),
    getAccountBalances(byType('cogs')),
    getAccountBalances(byType('expense')),
  ])

  const sum = (balances: AccountBalance[]) =>
    balances.reduce((s, b) => s + parseFloat(b.balance), 0)

  const grossProfit = sum(revenue) - sum(costOfSales)
  const netProfit = grossProfit - sum(expenses)

  return {
    periodStart,
    periodEnd,
    revenue,
    costOfSales,
    expenses,
    grossProfit: grossProfit.toFixed(3), // display string
    netProfit: netProfit.toFixed(3), // display string
  }
}

export async function getBalanceSheetReport(asOfDate: Date): Promise<BalanceSheetReport> {
  const accounts = await db.query.chartOfAccounts.findMany({ where: eq(chartOfAccounts.isActive, true) })
  const byType = (type: AccountType) => accounts.filter(a => a.type === type).map(a => a.id)

  const [assets, liabilities, equityAccts] = await Promise.all([
    getAccountBalances(byType('asset')),
    getAccountBalances(byType('liability')),
    getAccountBalances(byType('equity')),
  ])

  const sum = (balances: AccountBalance[]) =>
    balances.reduce((s, b) => s + parseFloat(b.balance), 0)

  return {
    asOfDate,
    assets,
    liabilities,
    equity: equityAccts,
    totalAssets: sum(assets).toFixed(3), // display string
    totalLiabilities: sum(liabilities).toFixed(3), // display string
    totalEquity: sum(equityAccts).toFixed(3), // display string
  }
}