import { db } from '@/lib/db'
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { journalEntries, journalEntryLines, chartOfAccounts } from '@/lib/schema'
import type { AccountBalance, PLReport, BalanceSheetReport, AccountType } from '../_types'
import { fromCents, toCents } from '@/lib/currency'

async function getAccountBalances(accountIds: string[], from?: Date, to?: Date): Promise<AccountBalance[]> {
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
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(and(
      inArray(journalEntryLines.accountId, accountIds),
      from ? gte(journalEntries.createdAt, from) : undefined,
      to ? lte(journalEntries.createdAt, to) : undefined,
    ))
    .groupBy(journalEntryLines.accountId, chartOfAccounts.name, chartOfAccounts.code, chartOfAccounts.type)

  return result.map(r => {
    const isDebitNormal = (r.accountType as AccountType) === 'asset' || (r.accountType as AccountType) === 'expense' || (r.accountType as AccountType) === 'cogs'
    const debit = toCents(r.debit)
    const credit = toCents(r.credit)
    const balance = isDebitNormal ? debit - credit : credit - debit
    return {
      accountId: r.accountId,
      accountName: r.accountName,
      accountCode: r.accountCode,
      accountType: r.accountType as AccountType,
      debitTotal: r.debit,
      creditTotal: r.credit,
      balance: fromCents(balance),
    }
  })
}

export async function getPLReport(periodStart: Date, periodEnd: Date): Promise<PLReport> {
  const accounts = await db.query.chartOfAccounts.findMany({ where: eq(chartOfAccounts.isActive, true) })
  const byType = (type: AccountType) => accounts.filter(a => a.type === type).map(a => a.id)

  const [revenue, costOfSales, expenses] = await Promise.all([
    getAccountBalances(byType('revenue'), periodStart, periodEnd),
    getAccountBalances(byType('cogs'), periodStart, periodEnd),
    getAccountBalances(byType('expense'), periodStart, periodEnd),
  ])

  const sum = (balances: AccountBalance[]) =>
    balances.reduce((sum, balance) => sum + toCents(balance.balance), 0)

  const grossProfit = sum(revenue) - sum(costOfSales)
  const netProfit = grossProfit - sum(expenses)

  return {
    periodStart,
    periodEnd,
    revenue,
    costOfSales,
    expenses,
    grossProfit: fromCents(grossProfit),
    netProfit: fromCents(netProfit),
  }
}

export async function getBalanceSheetReport(asOfDate: Date): Promise<BalanceSheetReport> {
  const accounts = await db.query.chartOfAccounts.findMany({ where: eq(chartOfAccounts.isActive, true) })
  const byType = (type: AccountType) => accounts.filter(a => a.type === type).map(a => a.id)

  const [assets, liabilities, equityAccts] = await Promise.all([
    getAccountBalances(byType('asset'), undefined, asOfDate),
    getAccountBalances(byType('liability'), undefined, asOfDate),
    getAccountBalances(byType('equity'), undefined, asOfDate),
  ])

  const sum = (balances: AccountBalance[]) =>
    balances.reduce((sum, balance) => sum + toCents(balance.balance), 0)

  return {
    asOfDate,
    assets,
    liabilities,
    equity: equityAccts,
    totalAssets: fromCents(sum(assets)),
    totalLiabilities: fromCents(sum(liabilities)),
    totalEquity: fromCents(sum(equityAccts)),
  }
}
