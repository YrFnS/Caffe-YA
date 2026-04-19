# Phase 2: POS Core & Timed Resources

## Goal

Build the primary POS screen with product grid, cart, checkout flow, and the resource/timer system for gaming stations and timed tables.

## What Ships

- POS screen at `/[locale]/pos` — Server Component with auth + shift check
- Product grid with category tabs and quick-add functionality
- Order summary cart panel (always white/asymmetric per DESIGN.md)
- Resource grid showing table/station availability with 4px status halo
- Timer display (HH:MM:SS) with warning threshold detection
- Checkout modal with cash, card, mobile wallet payment methods
- Atomic checkout with `db.transaction()` and `FOR UPDATE` row locking
- Void items before checkout (soft delete via `voidedAt`)
- Refund transactions after checkout (new row with `isRefund: true`)
- Active order persisted in DB as `status = 'draft'` while in progress

## Completed On

- 2026-04-19

---

## Implementation Summary

### Architecture Decisions (confirmed via Q&A)

- **POS at `/[locale]/pos`** — accessible only with active shift open
- **Draft orders in DB** — per user per shift, `status = 'draft'`, closed on checkout
- **Single payment per checkout** — cash/card/mobile_wallet, no split payments in v1
- **Timer visible only in Order Summary panel** — not on product grid

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| `auth.api.getSession({ headers })` in Server Actions | `auth()` from better-auth is not callable directly in Server Actions |
| `graceMinutes ?? 0` null coalescing | `graceMinutes` can be null in `resourceCategories` |
| `db.transaction()` for checkout | Ensures atomicity of order close + transaction create + resource free |
| `.for('update')` in `assignResourceToOrder` | Prevents race condition on double-assignment of same resource |
| `orderStatusEnum` extended with `'draft'` | Draft orders existed in code before schema supported them |

---

## Files Created

### Route Files

```
src/app/[locale]/(protected)/pos/
├── page.tsx          # Server Component — auth, shift check, data fetch
├── loading.tsx       # Skeleton loader (category pills + product grid + cart panel)
├── error.tsx         # Error boundary with retry button
└── _components/
    ├── POSLayout.tsx  # Client header — shift status badge, cashier name
    └── POSClientView.tsx  # Client orchestrator — all interactive state
```

### Feature Files

```
src/features/pos/
├── _types.ts                   # Product, Category, CartItem, ActiveOrder types
├── _services/
│   ├── productService.ts       # getCategories, getAllActiveProducts, getProductsByCategory
│   ├── orderService.ts        # getOrCreateDraftOrder, addItemToOrder, checkoutOrder (atomic)
│   ├── resourceService.ts     # assignResourceToOrder (FOR UPDATE), start/stopTimer, transferOrder
│   └── voidService.ts         # voidOrderItem (soft delete), refundTransaction (new row)
├── _actions/
│   ├── checkout.ts             # Server Action: processCheckout
│   └── void.ts                # Server Action: voidItem, refundTx
├── _components/
│   ├── ProductCard.tsx        # Product card with image, price, quick-add
│   ├── CategoryTabs.tsx        # Horizontal scrollable category pills
│   ├── ProductGrid.tsx         # 4-col responsive grid with category filtering
│   ├── OrderSummary.tsx        # Cart panel (always bg-surface-container-lowest)
│   ├── ResourceCard.tsx        # Resource card with 4px status halo (border-s-4)
│   ├── ResourceGrid.tsx         # Responsive resource grid
│   └── CheckoutModal.tsx       # Payment method selection modal
└── _hooks/
    ├── useCart.ts              # Client cart state management
    └── useTimer.ts             # HH:MM:SS display with warning threshold detection
```

### Translation Files

```
src/messages/
├── en.json    # Added pos.* translation keys
└── ar.json    # Added Arabic pos.* translation keys
```

---

## Commits (12 total on `phase-2-pos`)

| # | Commit | Description |
|---|--------|-------------|
| 1 | `a231497` | feat(pos): add POS layout shell, loading/error states, and translations |
| 2 | `700992a` | fix(pos): update POS loading and error components with proper styling |
| 3 | `e4d5587` | feat(pos): add product grid, category tabs, and product cards |
| 4 | `c0a1125` | feat(pos): add order summary panel with cart management |
| 5 | `ab63910` | feat(pos): add resource grid with timer logic and resource assignment |
| 6 | `79055e6` | feat(pos): add checkout modal with payment method selection |
| 7 | `8017906` | feat(pos): assemble main POS page with all components |
| 8 | `335a5fe` | feat(pos): add timer hook with warning threshold detection |
| 9 | `f0e8895` | feat(pos): add void item and refund logic with audit logging |
| 10 | `4c30f6e` | chore: verify build and lint pass for Phase 2 |
| 11 | `caa0c35` | fix(pos): add transaction atomicity and row locking for checkout and resource assignment |
| 12 | `4c30f6e` | fix(pos): add draft to orderStatusEnum |

Fast-forward merged to `main` as a single merge commit.

---

## Post-Review Fixes

During code quality review, two issues were found and fixed:

### 1. `checkoutOrder` not atomic
**Problem:** Order status update, transaction insert, and resource release were separate DB calls — a crash between them could leave inconsistent state.
**Fix:** Wrapped all operations in `db.transaction(async (tx) => {...})`.

### 2. No row locking on resource assignment
**Problem:** `assignResourceToOrder` checked status, then updated — two concurrent requests could both see `available` and double-assign.
**Fix:** Added `.for('update')` to the resource query inside the transaction.

### 3. Missing `'draft'` in `orderStatusEnum`
**Problem:** Schema enum didn't include `'draft'` even though code used it.
**Fix:** Extended `orderStatusEnum` in `src/lib/schema.ts`.

---

## Success Criteria

- [x] Barista can browse products by category and add to cart
- [x] Cart persists and calculates totals correctly
- [x] Checkout creates order + transaction in DB atomically
- [x] Resource grid shows live availability status
- [x] Timer runs, calculates charge, adds to order total
- [x] Timer display in Order Summary only (not product grid)
- [x] Transfer moves order to new resource with timer handling
- [x] Void and refund create proper audit trail via `auditLogs` table
- [x] `npm run build` passes with zero type errors
- [x] `npm run lint` passes with zero warnings

---

## Dependencies

- **Phase 1** — auth, DB schema (32 tables), layout, i18n
- **Phase 3** — Shift Management (open/close shift, variance, cash handling)

---

## Known Limitations

- Split payments not implemented (single payment method per checkout)
- Receipt print not implemented
- Timer display requires client-side hook (no server push)
- Resource transfer assumes destination resource is available
- `graceMinutes ?? 0` null coalescing in `stopTimer` — null treated as 0 grace

## Commands

```bash
# Start development
npm run dev

# Start PostgreSQL
docker compose up -d

# Generate + push migrations (after schema changes)
npx drizzle-kit generate && npx drizzle-kit push

# Build verification
npm run build
npm run lint
```
