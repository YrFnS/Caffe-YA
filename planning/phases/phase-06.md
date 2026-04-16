# Phase 6: Procurement & Expenses

## Goal
Build vendor management, purchase order tracking, goods receipt, and expense logging with petty cash.

## What Ships
- Vendor CRUD: name, phone, address, isActive
- Purchase orders: create PO, mark as received (GRN)
- Purchase items: link to ingredients or products
- Mark purchases as paid/unpaid
- Expense categories: CRUD with Chart of Accounts link
- Expense logging: amount, description, category, paid from drawer
- Expense limits: config-based threshold requiring approval

## Steps

### Step 1: Vendor Management
- Create `/procurement/vendors`
- CRUD for vendors
- Toggle active/inactive

### Step 2: Purchase Orders
- Create `/procurement/purchases`
- Create new PO: select vendor, add items (ingredient/product, qty, unit cost)
- Total calculated automatically
- Status: pending, received, cancelled
- "Receive" action: creates goods receipt, updates stock

### Step 3: Goods Receipt & Stock Update
- On "Receive": create stock movement (type = purchase)
- Increment ingredient stockQty
- Mark PO as received

### Step 4: Purchase Payments
- Mark PO as paid / unpaid
- Optional: link to accounting (creates journal entry)

### Step 5: Expense Categories
- Create `/expenses/categories`
- CRUD: name, linked Chart of Accounts ID
- Default categories: Rent, Electricity, Supplies, Cleaning, Staff Meals

### Step 6: Expense Logging
- Create `/expenses` or use POS quick action
- Enter: amount, description, category, paid by (user)
- Deduction from shift's expected cash
- Receipt image optional (stored on VPS)

### Step 7: Petty Cash Limits
- Read petty_cash_limit from system settings
- If expense > limit → require manager approval
- Log approval in audit

## Dependencies
- Phase 1 (auth)
- Phase 4 (ingredients, stock)
- Phase 3 (shifts, cash drawer)

## Success Criteria
- [ ] Vendors manageable (CRUD, active toggle)
- [ ] Purchase orders can be created and received
- [ ] Stock updates correctly on goods receipt
- [ ] Expense categories link to Chart of Accounts
- [ ] Expenses logged against active shift
- [ ] Large expenses require manager approval
- [ ] Expenses visible in shift close calculation