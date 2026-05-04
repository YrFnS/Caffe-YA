# Phase 8: Reports & Polish

## Goal
Build the dashboard, operational reports, and perform final UI polish to complete the initial release.

## Status
❌ Not started

## What Ships
- Dashboard: today's sales, order count, active timers, shift status
- Low stock alerts banner
- Quick action links (POS, Table Grid, Shift Close)
- Daily summary report (revenue, expenses, net)
- Shift reports: per-shift performance with variance
- Audit log viewer with filtering
- Final UI polish: empty states, loading states, error handling, responsive refinements

## Steps

### Step 1: Dashboard
- Create `/dashboard` or `/`
- Summary cards:
  - Today's total sales (amount)
  - Order count
  - Active timed resources count
  - Shift status (open/closed, who)
- Low stock alert banner (if any items below threshold)
- Quick links row

### Step 2: Daily Summary Report
- Date range selector (default: today)
- Revenue breakdown by payment method
- Expense total
- Net profit/loss
- Top selling products

### Step 3: Shift Reports
- List of shifts with: cashier, open/close times, opening float, closing cash, variance
- Click row for detail: all orders in shift, all expenses, all transactions

### Step 4: Audit Log Viewer
- Create `/audit` or `/admin/audit`
- Table with: user, action, target table, target ID, old/new values, timestamp
- Filter by: user, action type, date range, target table

### Step 5: Final UI Polish
- Ensure every screen has empty state (per DESIGN.md)
- Ensure every async action shows loading state
- Ensure every error shows localized message (not full crash)
- Responsive: verify tablet and mobile views work
- Arabic: verify every screen in RTL
- Touch targets: verify 48px minimum on all interactive elements

### Step 6: Build & Deploy Prep
- Run full build — zero errors
- Lighthouse audit (if applicable) — no critical issues
- Verify all env vars documented
- Deployment checklist for VPS

## Dependencies
- All previous phases (dashboard pulls from all modules)
- DESIGN.md compliance check

## Success Criteria
- [ ] Dashboard loads with live data
- [ ] Daily summary shows correct totals
- [ ] Shift report shows variance per shift
- [ ] Audit log filterable and searchable
- [ ] Empty states exist on every list/screen
- [ ] Loading states shown during data fetch
- [ ] Error states handle gracefully (localized, not crashing)
- [ ] Responsive works on tablet and mobile
- [ ] Arabic RTL verified on all screens
- [ ] Build passes with zero type errors