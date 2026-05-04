# Phase 7: Accounting & Partners

## Goal
Build the double-entry accounting system with Chart of Accounts, journal entries, and partner equity tracking for the two owners.

## Status
❌ Scaffold only — schema tables defined, no feature module implemented

## What Ships
- Chart of Accounts: tree structure with account types (asset, liability, equity, revenue, cogs, expense)
- Journal entries: automatic from POS sales, manual entries, linked to source
- Partner management: link users to partners with ownership %
- Equity entries: capital injection, draws, profit/loss distribution
- Partner dashboard: view equity balance, ownership %, recent entries

## Steps

### Step 1: Chart of Accounts
- Create `/accounting/accounts`
- Tree view with expand/collapse
- Account types: asset, liability, equity, revenue, cogs, expense
- Default seed data: Cash, Bank, Accounts Receivable, Accounts Payable, Sales Revenue, Cost of Goods Sold, etc.
- Bilingual names (nameAr)

### Step 2: Journal Entries - Auto-Post
- On order checkout: create journal entry
  - Debit: Cash/Bank (asset)
  - Credit: Sales Revenue (revenue)
- On purchase receipt: create journal entry
  - Debit: Inventory/Ingredients (asset)
  - Credit: Accounts Payable (liability)
- On expense: create journal entry
  - Debit: Expense account
  - Credit: Cash (asset)

### Step 3: Journal Entries - Manual
- Create `/accounting/journal`
- Manual journal entry: description, lines (account, debit/credit, amount)
- Validation: total debits must equal total credits

### Step 4: Partner Setup
- Create `/partners` or `/admin/partners`
- Link system users to partners
- Set ownership percentage (e.g., 50% / 50%)
- Validation: sum must equal 100%

### Step 5: Equity Entries
- Record capital injection: partner adds money to business
- Record draw: partner withdraws money
- Record profit/loss distribution: auto or manual at period end
- Each entry: type, amount, note, createdBy

### Step 6: Partner Dashboard
- Show each partner's current equity balance
- Show ownership percentage
- Recent equity entries table
- Total distributable profit visible

## Dependencies
- Phase 2 (orders create journal entries)
- Phase 6 (expenses, purchases create journal entries)
- Phase 5 (permissions for accounting module)

## Success Criteria
- [ ] Chart of Accounts viewable with tree structure
- [ ] POS sales auto-post to journal
- [ ] Expenses/purchases auto-post to journal
- [ ] Manual journal entries work with balanced validation
- [ ] Partners linked to users with ownership %
- [ ] Equity entries record capital, draws, profit/loss
- [ ] Partner dashboard shows equity status