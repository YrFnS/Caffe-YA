export interface ShiftSummary {
  id: string
  cashierId: string
  cashierName: string
  status: 'open' | 'closed'
  openedAt: Date
  closedAt: Date | null
  openingFloat: string
  closingCountedCash: string | null
  closingExpectedCash: string | null
  cashVariance: string | null
  approvedBy: string | null
  notes: string | null
}

export interface OpenShiftInput {
  openingFloat: string // numeric string, e.g. "150000.000"
}

export interface CloseShiftInput {
  shiftId: string
  countedCash: string
  notes?: string
}

export interface ShiftViewState {
  activeShift: ShiftSummary | null
  history: ShiftSummary[]
  cashSales: string
  cashExpenses: string
  expectedCash: string
  variance: string
  activeResources: Array<{ id: string; name: string; orderId: string }>
}
