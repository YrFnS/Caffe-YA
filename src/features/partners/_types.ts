export interface PartnerRow {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  ownershipPercent: string
  createdAt: Date
}

export interface PartnerEquityEntryRow {
  id: string
  partnerId: string
  partnerName: string | null
  type: 'capital_injection' | 'draw' | 'profit_share' | 'loss_share'
  amount: string
  note: string | null
  createdBy: string | null
  creatorName: string | null
  createdAt: Date
}

export interface PartnerDashboard {
  partner: PartnerRow
  currentEquity: string
  totalCapitalInjected: string
  totalDistributions: string
  ownershipPercent: string
}
