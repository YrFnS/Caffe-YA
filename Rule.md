# Caffe-YA — Development Rules

## I. Code Quality Rules

### 1. File Size Guideline
- Aim for files under ~200 lines.
- If a file approaches this limit, decompose into:
  - **Sub-components:** Break large UIs into smaller, focused pieces.
  - **Custom Hooks:** Move client-side state and effects out of components.
  - **Services/Utils:** Move business logic into pure `.ts` files.
- This is a **guideline for readability**, not a hard cap. A well-structured 250-line file is fine; a confusing 150-line file is not.

### 2. Single Responsibility Principle (SRP)
Each file does ONE thing well.
- A UI component renders UI.
- A Service function handles business logic.
- A Server Action handles the bridge between client and server.
- **Never mix UI rendering and complex database queries in the same file.**

### 3. Strict Typing & Validation (The "No Trust" Rule)
- **Zero `any` types:** TypeScript must be strictly enforced.
- **Zod for Everything:** Use Zod to validate all incoming data — form submissions, API payloads, Server Action inputs, and environment variables.
- **Drizzle-Zod integration:** Use `createInsertSchema` and `createSelectSchema` from `drizzle-zod`. One source of truth — never manually duplicate DB schemas as Zod schemas.

### 4. "Thin" Server Actions
Server Actions are difficult to unit test. They should act only as a bridge.

**Do:**
- Validate input with Zod
- Call a service function
- Return a standardized success/error response

**Don't:**
- Write complex database queries directly inside the Server Action
- Chain Server Actions together — extract logic into service functions instead
- Manage transaction boundaries in Server Actions — that belongs in services

### 5. Server Components by Default
- Assume every component is a Server Component.
- Push `'use client'` down to the absolute lowest "leaf" level.
- **Rule of Thumb:** Never wrap a whole page in `'use client'` just because you need a click handler on one button. Extract the button into a Client Component and import it.

### 6. Data Fetching Proximity
- Fetch data on the server, as close to where it is used as possible.
- Avoid prop-drilling. If a child Server Component needs data, it should fetch it directly.
- Use React `cache()` for database queries so if multiple components call the same function, the database is only hit once.

### 7. Graceful Degradation
- Every major route segment must have its own `loading.tsx` and `error.tsx` files.
- If a database query fails on one page, it should show a localized error state, not crash the entire application layout.
- **For POS:** This is critical. If the inventory page crashes, baristas must keep selling.

---

## II. Architecture & Folder Rules

### 1. Feature-Based Structure (Domain-Driven)
Group code by what it does, not what it is.

```
src/
  ├── app/                  # ROUTES ONLY: tiny files that import features
  ├── features/             # THE CORE: every business module lives here
  │    ├── pos/             # POS, orders, checkout
  │    ├── resources/       # Tables, stations, timers
  │    ├── shifts/          # Shift management
  │    ├── inventory/       # Products, ingredients, stock
  │    ├── procurement/     # Vendors, purchases
  │    ├── expenses/        # Expense tracking
  │    ├── employees/       # Employee management
  │    ├── payroll/         # Payroll processing
  │    ├── accounting/      # CoA, journals, reports
  │    ├── partners/        # Partner equity
  │    └── admin/           # Users, roles, permissions, settings
  ├── components/ui/        # SHADCN: "dumb" reusable primitives (Buttons, Inputs, Dialogs)
  ├── lib/                  # SHARED: DB config, auth, utils
  └── shared/               # Cross-feature utilities, types, constants
```

### 2. Colocation via Private Folders
Next.js App Router allows private folders (prefixed with underscore). If a component is only used on one specific route, keep it next to that route.

```
app/(protected)/pos/_components/OrderSummary.tsx
```

This prevents global folders from becoming a dumping ground for single-use files.

### 3. Global UI vs. Feature Components
- `/components/ui/` — Strictly for "dumb", highly reusable primitive components (Buttons, Inputs, Dialogs, Cards).
- `/features/[name]/components/` — For smart components that contain business logic or domain-specific layouts.

### 4. Route Groups for Layouts
Use Route Groups `(folderName)` to organize app sections and apply shared layouts without changing the URL structure.

```
app/(auth)/login/page.tsx          — No sidebar, auth layout
app/(protected)/dashboard/page.tsx — Sidebar layout, auth required
app/(marketing)/page.tsx           — Public landing page (if any)
```

### 5. The "Contract" Layer
If a feature needs to talk to another feature, it must use a **Service function**, never a direct database call to another feature's table. This makes it possible to extract or replace features later.

---

## III. Financial & Concurrency Rules

### 1. No Floating Point for Money
- **Never use JavaScript `number` for currency amounts.**
- Database: use `numeric` columns (handled by Drizzle as strings).
- Application: keep amounts as strings from DB → calculate with **Dinero.js** → display formatted.
- **One currency for now (IQD), but the architecture must support multi-currency later.**

### 2. Optimistic Locking for Shared Resources
- Any write to `resources.status` must use a **database transaction with a row-level lock** (`FOR UPDATE`) to prevent double-assignment.
- If two cashiers try to start a timer on the same resource simultaneously, the second must get a clear "resource already in use" error.
- Use a `version` column or explicit `FOR UPDATE` queries on contested tables.

### 3. Transaction Boundaries in Service Layer
- If an operation touches more than one table (e.g., close shift → update shift + write journal entry + reconcile stock), it must happen inside a **single Drizzle transaction** in a service file.
- **Server Actions never manage transaction boundaries directly.**

### 4. Void/Refund Integrity
- **Voids never delete rows.** They set `voidedAt`, `voidedBy`, `voidReason`.
- **Refunds after checkout create a new transaction row** with `isRefund = true`, not a deletion of the original.
- Every void and refund must be logged in `auditLogs`.

---

## IV. Security & Permission Rules

### 1. Backend Permission Enforcement
- Frontend hiding is **not security**.
- Every Server Action and API route must check permissions before executing sensitive operations.
- Pattern: `await requirePermission(session, 'pos.void_item')`

### 2. Field-Level Permission Gates
- Every sensitive field needs a `<PermissionGate>` wrapper on the frontend.
- The backend must independently validate field-level permissions before writing.
- Example: if `data.costPrice` is being updated, check `products.cost_price.write` permission.

### 3. Audit Logging
- Every sensitive action writes to `auditLogs`: user, action, target, old value, new value.
- Use Next.js `after()` for non-critical audit writes (don't block the response).
- Partners must be able to search and filter the audit log.

### 4. Environment Variable Validation
- Create `src/lib/env.ts` that validates all required env vars with Zod on startup.
- A missing variable throws immediately — **never silently undefined in production.**
- Required vars at minimum: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

---

## V. Next.js App Router Specific Rules

### 1. Server Components by Default
(See Section I, Rule 5)

### 2. Data Fetching Proximity
(See Section I, Rule 6)

### 3. Graceful Degradation
(See Section I, Rule 7)

### 4. Image Handling
- Product/resource images stored on VPS at `/uploads/` path.
- Database stores only the relative path (e.g., `/uploads/products/latte.jpg`).
- Fallback: generic icon placeholder if image is missing.
- Never store image blobs in the database.

---

## VI. i18n & RTL Rules

### 1. next-intl for Translations
- All user-facing text goes through `next-intl` message files.
- Never hardcode display strings in components.
- URL structure: `/en/...` and `/ar/...`

### 2. Tailwind Logical Properties
- **Never use `left`/`right`** in Tailwind classes.
- Always use `start`/`end`:
  - `ms-4` (margin-start), `me-4` (margin-end)
  - `ps-4` (padding-start), `pe-4` (padding-end)
  - `start-0`, `end-0` for positioning
- This ensures the UI mirrors correctly in Arabic RTL without writing CSS twice.

### 3. Arabic Typography
- Arabic text uses **IBM Plex Sans Arabic** (body) and **Cairo** (headlines).
- Numbers for prices and timers: always Western numerals (0-9).
- Test every screen in both languages before considering it "done."

---

## VII. Git & Workflow Rules

### 1. Atomic Commits
- One logical change per commit.
- Commit messages follow conventional format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

### 2. No Dead Code
- Don't comment out code — delete it. Git has history.
- Don't leave `console.log` in production code.

### 3. LSP Diagnostics Clean
- Run `lsp_diagnostics` on changed files before marking any task complete.
- Zero type errors allowed. Zero `@ts-ignore` or `as any` allowed.

### 4. Build Must Pass
- Before claiming any task is complete, verify the build passes.
- No exceptions.

---

## VIII. What We Explicitly Deferred

These are **NOT** in scope for the initial build:
- Offline mode / PWA sync
- PDF generation (receipts, reports) — use `@media print` for now
- Email notifications
- IoT / smart plug integration
- AI features (invoice scanning, voice inventory)
- Customer loyalty program
- Multi-currency support
- Kitchen Display System

They are acknowledged and planned for future phases. Do not build infrastructure for them now — just keep module boundaries clean so they can be added later.
