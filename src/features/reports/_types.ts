// Dashboard summary types for today's activity

export interface TodaySummary {
  /** Total sales revenue for today (completed/paid orders) */
  salesTotal: string
  /** Number of orders still active (completed but not closed) */
  activeOrders: number
  /** Number of timers currently running (orders with timerStartedAt set, timerEndedAt null) */
  activeTimers: number
  /** Most recent shift status */
  shiftStatus: 'open' | 'closed'
  /** ID of the open shift if any */
  openShiftId: string | null
}

export interface DashboardStats {
  today: TodaySummary
  /** Low-stock ingredients (already provided by page) */
  lowStockItems: Array<{
    id: string
    name: string
    stockQty: string
    unitName: string
  }>
}
