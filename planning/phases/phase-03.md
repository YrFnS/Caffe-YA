# Phase 3: Shift Management

## Goal
Implement shift open/close workflow with blind cash counting, variance tracking, and approval logic.

## What Ships
- Open shift: enter opening float, link to cashier
- Close shift: blind cash count entry, auto-calculated expected cash
- Variance calculation (over/short)
- Manager approval for large variances
- Prevent close if timed resources still active (must stop/transfer)
- Shift history view for audit
- Cash drawer reconciliation per shift

## Steps

### Step 1: Shift Open Flow
- "Open Shift" button on POS header
- Modal: enter opening float amount
- Create shift record with status = open, openedAt = now
- POS disabled until shift is opened

### Step 2: Shift Status Display
- Header shows: current cashier name, shift start time, shift duration
- Only one shift can be open at a time

### Step 3: Shift Close (Blind Count)
- "Close Shift" button triggers full-screen overlay
- Cashier enters physical cash count — NO expected amount shown
- System calculates expected: `openingFloat + cashSales - cashExpenses`
- Display variance: (actual - expected)
- Color code: green for over, red for under

### Step 4: Variance Handling
- If variance > threshold → require manager PIN to approve
- Log variance in audit
- Shift status = closed, closedAt = now

### Step 5: Active Resource Warning
- On close attempt, check for any orders with running timers
- Block close until all timers stopped or transferred
- Show list of active resources with "Stop" or "Transfer" actions

### Step 6: Shift History
- Table of past shifts with: cashier, open/close times, float, variance
- Click row for detail view

## Dependencies
- Phase 2 (orders, transactions, expenses)

## Success Criteria
- [ ] Shift opens with float and enables POS
- [ ] Close shift shows blind count entry (no expected shown)
- [ ] Variance calculated and displayed correctly
- [ ] Manager approval required for large variance
- [ ] Cannot close with active timers (blocks until resolved)
- [ ] Shift history viewable with audit trail