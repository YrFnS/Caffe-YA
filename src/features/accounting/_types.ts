export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'cogs' | 'expense'

export interface AccountRow {
  id: string
  code: string
  name: string
  nameAr: string | null
  type: AccountType
  parentId: string | null
  isActive: boolean
  createdAt: Date
  children?: AccountRow[]
}

export interface JournalEntryRow {
  id: string
  reference: string | null
  description: string | null
  sourceType: string | null
  sourceId: string | null
  createdBy: string | null
  creatorName: string | null
  createdAt: Date
  lines?: JournalLineRow[]
}

export interface JournalLineRow {
  id: string
  journalEntryId: string
  accountId: string
  accountName: string
  accountCode: string
  type: 'debit' | 'credit'
  amount: string
  note: string | null
}

export interface AccountBalance {
  accountId: string
  accountName: string
  accountCode: string
  accountType: AccountType
  debitTotal: string
  creditTotal: string
  balance: string // debit - credit for assets/expenses, credit - debit for liabilities/equity/revenue
}

export interface PLReport {
  periodStart: Date
  periodEnd: Date
  revenue: AccountBalance[]
  costOfSales: AccountBalance[]
  expenses: AccountBalance[]
  grossProfit: string
  netProfit: string
}

export interface BalanceSheetReport {
  asOfDate: Date
  assets: AccountBalance[]
  liabilities: AccountBalance[]
  equity: AccountBalance[]
  totalAssets: string
  totalLiabilities: string
  totalEquity: string
}
