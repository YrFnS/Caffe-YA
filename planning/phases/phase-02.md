# Phase 2: POS Core & Timed Resources

## Goal
Build the primary POS screen with product grid, cart, checkout flow, and the resource/timer system for gaming stations and timed tables.

## What Ships
- Product grid with categories and items
- Active order summary panel (cart)
- Add/remove items from cart with quantity
- Checkout with cash, card, split payment
- Resource (table/station) grid showing availability
- Timer start/stop/pause logic with billing calculation
- Order creation linked to active shift
- Order status: open, closed, cancelled, transferred
- Void items before checkout
- Refunds after checkout

## Steps

### Step 1: Product & Category UI Components
- Create `ProductGrid` component with category tabs
- Create `ProductCard` with price, image fallback, quick-add
- Create `CategoryTabs` horizontal scrollable pills
- Implement filter by category
- Connect to DB via service functions

### Step 2: Cart / Order Summary Panel
- Create `OrderSummary` component (always white, per DESIGN.md)
- Add/remove items, adjust quantities
- Calculate subtotal, timer charge, total
- Persist active order in DB (draft/active state)

### Step 3: Checkout Flow
- Create checkout modal with payment method selector
- Support: cash, card, mobile_wallet, split
- Handle split payments (multiple transactions per order)
- Generate receipt (simple print-friendly view)
- Close order: mark status = closed, create transaction(s)

### Step 4: Resource Grid
- Create `ResourceGrid` showing all resources by category
- Status indicators: available (green glow), occupied (red halo), maintenance (grey)
- Click available → start new order with that resource
- Click occupied → open existing order

### Step 5: Timer Logic
- Timer starts when resource is assigned to an order
- Display running timer in order summary (HH:MM:SS)
- Calculate charge: `(elapsedMinutes / 60) * hourlyRate`
- Apply minimumMinutes and graceMinutes rules
- Timer stops on checkout or manual stop
- Timer charge added as line item to order

### Step 6: Order Transfers
- Transfer order from one resource to another
- Stop timer on source, start on destination (if timed)
- Log transfer in audit

### Step 7: Void & Refund
- Void item before checkout: mark voided, keep row
- Refund after checkout: create new transaction with isRefund

## Dependencies
- Phase 1 (auth, DB, layout)
- Internal: inventory service (products available at checkout)

## Success Criteria
- [ ] Barista can browse products by category and add to cart
- [ ] Cart persists and calculates totals correctly
- [ ] Checkout creates order + transaction(s) in DB
- [ ] Resource grid shows live availability status
- [ ] Timer runs, calculates charge, adds to order total
- [ ] Transfer moves order to new resource with timer handling
- [ ] Void and refund create proper audit trail