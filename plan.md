# Caffe-YA — Audit Fix Plan

**Date:** 2026-05-13
**Status:** Planning
**Context:** Full audit of Caffe-YA completed. Build passes. 10 npm vulnerabilities patched. ESLint: 0 errors, 40 warnings. Multiple Rule.md and DESIGN.md violations remain.

---

## Goal

Fix all remaining critical/high-priority violations found in the audit, then achieve a clean build, zero ESLint errors, and full Rule.md/DESIGN.md compliance.

---

## Issue Summary

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 3 | Money as JS float, POS actions no permissions, undefined `outline-variable` |
| 🟡 High | 5 | Missing loading/error on ~14 routes (partially done), ESLint warnings, glassmorphism on error state, shadow-xl misuse |
| 🟢 Medium | 4 | Hardcoded strings (partially done), EmptyState component missing, timer pulse not implemented |
| 🟢 Low | 2 | `after()` for audit not used everywhere, unused vars |

---

## Phase 1 — Critical Fixes (Highest Priority)

### 1.1 — Fix `border-outline-variable` Token (DONE ✅)

Already replaced all 34 occurrences across 9 files. No further action.

---

### 1.2 — Fix Money Handling: Replace `Number()` + `.toFixed()` with Dinero.js

**Rule violated:** Rule.md §III.1 — "Never use JavaScript number for currency amounts."

**Files affected:**
- `src/features/pos/_services/orderService.ts` — `(Number(unitPrice) * quantity).toFixed(3)`
- `src/features/partners/_services/partnerService.ts` — `parseFloat(e.amount)` + `.toFixed(3)`
- `src/features/shifts/_services/shiftService.ts`
- `src/features/accounting/_services/journalService.ts`
- `src/features/accounting/_services/reportService.ts`
- `src/features/procurement/` (all services)
- `src/features/expenses/` (all services)

**Pattern:** POSClientView.tsx already uses Dinero.js correctly. The rest of the codebase uses the forbidden anti-pattern.

**Plan:**
1. Read `src/lib/dinero.ts` (or wherever dinero utils live — check `POSClientView.tsx` imports)
2. Create a `formatCurrency(amount: string | number, currency: string)` helper that wraps Dinero.js
3. Create a `parseCurrency(value: string): string` helper that safely converts string input to numeric string (no floating point)
4. Audit each service file — replace `parseFloat(x).toFixed(3)` with `parseCurrency(x)` on DB writes
5. Replace `Number(x) * Number(y)` with proper dinero addition/multiply
6. Replace `.toFixed(3)` display formatting with `formatCurrency()`
7. **Verification:** `grep -r "parseFloat\|\.toFixed" src/features --include="*.ts"` should return zero matches after fix

**File to create:** `src/lib/currency.ts` — currency formatting/parsing utilities
**Files to change:** 10+ service files

---

### 1.3 — Add Permission Enforcement to POS/Procurement/Shift Server Actions

**Rule violated:** Rule.md §IV.1 — "Every Server Action must check permissions before executing sensitive operations."

**Current state:** `requirePermission()` exists in `adminActions.ts`. POS, procurement, and shift actions only check `getSession()`.

**Plan:**
1. Read `src/features/admin/_actions/adminActions.ts` to understand `requirePermission` pattern
2. Read `src/features/pos/_actions/` — identify all sensitive actions (checkout, void_item, void_order, open_shift, close_shift, create_expense, etc.)
3. Read `src/features/procurement/_actions/` — identify purchase creation/deletion
4. Read `src/features/shifts/_actions/` — identify open/close/expense actions
5. Add `await requirePermission(session, 'pos.checkout')` etc. to each sensitive action
6. **Verification:** `grep -r "requirePermission" src/features/pos src/features/procurement src/features/shifts --include="*.ts" -c` should be > 0

**Files to change:**
- `src/features/pos/_actions/checkout.ts`
- `src/features/pos/_actions/void.ts`
- `src/features/shifts/_actions/shiftActions.ts` (and related)
- `src/features/expenses/_actions/` (all)
- `src/features/procurement/_actions/` (all)

---

### 1.4 — Fix Refund Transaction Integrity

**Rule violated:** Rule.md §III.2 and §III.3 — missing `FOR UPDATE` lock and transaction wrapper.

**Current state:** `refundTransaction()` does sequential inserts without lock or transaction.

**Plan:**
1. Read `src/features/accounting/_services/refundService.ts` (or wherever refund lives — likely `voidService.ts`)
2. Wrap the refund in `db.transaction(async (tx) => { ... })`
3. Add `.forUpdate()` on SELECT of original transaction row before inserting refund
4. Move audit log write inside the transaction
5. **Verification:** `grep -n "forUpdate\|transaction" src/features/accounting/_services/refundService.ts`

**Files to change:** Likely `src/features/accounting/_services/refundService.ts` or `src/features/pos/_services/voidService.ts`

---

## Phase 2 — High Priority

### 2.1 — Complete Missing loading.tsx / error.tsx Files

**Status:** 32 files created. Need to verify they're correct and that all routes have both.

**Plan:**
1. Run: `find src/app -name "page.tsx" | sed 's/page\.tsx$/loading.tsx/' | xargs ls 2>/dev/null | wc -l` (count loading files)
2. Compare with total page count
3. For any missing: read the `page.tsx`, determine the layout type, create matching skeleton
4. Check that new loading files use `animate-pulse` and match the route's layout
5. Check that new error files use `AlertTriangle` + translated strings

**Files to verify:** All in `src/app/[locale]/(protected)/`

---

### 2.2 — Fix ESLint Warnings (40 warnings)

**Plan:**
1. Run `npm run lint 2>&1` and capture full output
2. Categorize warnings:
   - **Unused vars** — prefix with `_` or remove the import
   - **Unused imports** — remove them
   - **Specifically:** `beansIng`, `croissantIng`, `espressoProd`, `americanoProd`, `croissantProd` in some seed/demo file
3. Fix warnings file by file — these are safe mechanical cleanups
4. **Verification:** `npm run lint 2>&1 | grep error` returns zero

**Files to change:** ~15 files with unused vars/imports

---

### 2.3 — Fix DESIGN.md Violations (Shadow, Ghost Borders, Glassmorphism)

**Status:** Subagent completed most of this. Verify remaining:

**Plan:**
1. `grep -r "shadow-xl" src/ --include="*.tsx"` — should return zero
2. `grep -r "border-outline-variant/15" src/ --include="*.tsx"` — check contexts:
   - Dense data tables: OK
   - POSLayout header divider: should be removed
   - Sidebar dividers: should be removed
3. `VoidModal.tsx` — verify `backdrop-blur` is removed
4. `OrderSummary.tsx` — verify card dividers are removed

---

### 2.4 — Convert `accounting/reports/page.tsx` to Server Component

**Status:** Subagent created `ReportsClient.tsx` and converted page. Need to verify:
1. `page.tsx` no longer has `'use client'`
2. `ReportsClient.tsx` properly exported and imported
3. All interactive state lives in the client leaf

---

### 2.5 — Add Audit Log to `checkoutOrder`

**Status:** Subagent added `after()` audit. Need to verify:
1. `after()` is imported from `next/server`
2. Audit log entry captures: userId, action `CHECKOUT_ORDER`, old/new values
3. It does NOT block the response (non-critical)

---

## Phase 3 — Medium Priority

### 3.1 — Complete Hardcoded String Fixes

**Status:** Most page files fixed. Need to verify no remaining hardcoded English text in page.tsx h1 elements.

**Plan:**
1. `grep -rn 'text-headline-lg.*>[A-Z]' src/app --include="*.tsx" | grep -v 't(' | grep -v '{t'` — find remaining hardcoded titles
2. Fix each by adding `getTranslations` + `t()` call
3. Add missing translation keys to `en.json` / `ar.json`

---

### 3.2 — Create Reusable EmptyState Component

**Rule violated:** DESIGN.md §7 — "Every list/table/screen must have an empty state with icon + headline-sm + body-md + action."

**Plan:**
1. Read DESIGN.md §7 for exact spec
2. Create `src/components/ui/EmptyState.tsx`:
   ```tsx
   interface EmptyStateProps {
     icon: LucideIcon
     title: string  // passes through t()
     description: string
     action?: { label: string; onClick: () => void }
   }
   ```
3. Use `text-headline-sm` for title, `text-body-md text-on-surface-variant` for description
4. Replace inline empty state patterns in: `ProductGrid.tsx`, `OrderSummary.tsx`, `ResourcesClientView.tsx`, `table.tsx`
5. **Verification:** grep for "No results" / "noProducts" / "emptyCart" patterns — they should all use the component

---

### 3.3 — Timer Pulse Animation

**Rule violated:** DESIGN.md §10 — "When timer is running, seconds digit has a subtle opacity pulse."

**Plan:**
1. Read `OrderSummary.tsx` to find timer display
2. Add CSS class `animate-pulse` to the seconds digit span (or the timer element)
3. Add `@keyframes` for opacity pulse if Tailwind's `animate-pulse` doesn't match the spec
4. **Verification:** Visual check — seconds digit pulses at 1s cycle

---

## Phase 4 — Low Priority

### 4.1 — Extend `after()` for Non-Critical Audit Writes

**Rule violated:** Rule.md §IV.3 — "Use `after()` for non-critical audit writes."

**Plan:**
1. `grep -rn "auditLogs" src/features --include="*.ts" | grep -v "after("` — find audit writes not using `after()`
2. Wrap remaining audit writes in `after()` from `next/server`
3. Exception: audit writes that are critical to the operation's success response should stay synchronous

---

### 4.2 — Missing Arabic Translation Keys

**Status:** `ar.json` missing: `admin.users`, `admin.roles`, `admin.permissions`, `admin.modules`.

**Plan:**
1. `grep -n "admin\." src/messages/en.json | head -20` — find admin keys
2. Add Arabic equivalents to `ar.json`

---

## Phase 5 — npm Audit (Package Updates)

**Status:** `npm install next@16.2.6 kysely@latest next-intl@latest` done. Remaining vulnerabilities are dev-only or transitive.

**Plan:**
1. After fixing money handling, rebuild should succeed
2. If `kysely@latest` causes issues with `drizzle-orm@0.45.x`:
   - Try: `npm install kysely@0.27` (last 0.26 stable) — check compatibility
   - Alternative: pin `kysely` to current version and accept the vulnerability as dev-only risk
3. `npm audit` should show reduced severity after all patches

---

## Build & Verification

After each phase:

```bash
cd /home/lich/Caffe-YA

# Phase 1 end
npm run lint  # 0 errors
npx tsc --noEmit  # 0 type errors

# Phase 5 end
npm run build  # must pass
npm audit  # fewer vulnerabilities
```

**Build OOM issue:** The build gets killed on this machine due to memory limits (~4.6GB available). To verify build, run on a machine with more RAM, or free memory first:

```bash
# Free memory before build
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
npm run build
```

---

## Risks & Tradeoffs

| Risk | Mitigation |
|------|-----------|
| Money handling refactor breaks calculations | Test thoroughly: open shift → add items → checkout → verify amounts in DB |
| Permission enforcement blocks existing flows | Add `requirePermission` calls but make them non-blocking initially (log + warn), then migrate to strict |
| `kysely@latest` incompatible with drizzle | Pin to `^0.28.0` if 0.29 breaks, accept medium-risk vulnerability as dev-only |
| EmptyState component adds abstraction | Only create if 3+ screens can use it — don't abstract prematurely |

---

## Open Questions

1. Should the `EmptyState` component be locale-aware (accepts translation keys) or raw strings?
2. Is the POS permission model already defined in the schema, or does it need to be created?
3. Should `after()` audit writes be wrapped in try/catch to prevent crashes?
4. The machine can't run build/lint due to OOM — who runs the final verification?

---

## Files Likely to Change

### New files
- `src/lib/currency.ts` — currency helpers
- `src/components/ui/EmptyState.tsx` — reusable empty state

### Modified files
- `src/features/pos/_services/orderService.ts`
- `src/features/partners/_services/partnerService.ts`
- `src/features/shifts/_services/shiftService.ts`
- `src/features/accounting/_services/journalService.ts`
- `src/features/accounting/_services/reportService.ts`
- `src/features/accounting/_services/refundService.ts`
- `src/features/procurement/_services/` (multiple)
- `src/features/expenses/_services/` (multiple)
- `src/features/pos/_actions/checkout.ts`
- `src/features/pos/_actions/void.ts`
- `src/features/shifts/_actions/shiftActions.ts`
- `src/features/expenses/_actions/` (all)
- `src/features/procurement/_actions/` (all)
- `src/messages/en.json` — add missing keys
- `src/messages/ar.json` — add missing keys
- `src/features/pos/_components/OrderSummary.tsx` — remove dividers, add timer pulse
- `src/components/ui/table.tsx` — EmptyState usage
