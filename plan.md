# Caffe-YA — Project Plan

## 1. Project Overview

**Caffe-YA** is a hybrid coffee shop + gaming center POS and management system. It combines point-of-sale, resource timing (PS5/PC stations), inventory management, shift handling, accounting, and partner equity in one application.

### Core Value Propositions
- **Speed-first POS** — optimized for fast checkout during peak hours
- **Timed resource billing** — built-in support for gaming stations, hourly tables, and rental units
- **Cash-heavy operations** — blind shift counting, variance tracking, audit trails
- **Multi-owner transparency** — partner equity tracking, dual-admin permissions, audit logging
- **Bilingual-native** — Arabic RTL and English LTR support from the ground up
- **Extensible** — module-based architecture for future features (payroll, accounting, loyalty)

---

## 2. Chosen Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 16 (App Router) | Full-stack, server components, SEO-ready landing if needed |
| Language | TypeScript | Strict typing, compile-time safety |
| Database | PostgreSQL | ACID compliance critical for financial data |
| ORM | Drizzle + drizzle-zod | Type-safe SQL, lightweight, edge-ready |
| Auth | Better Auth | Credentials auth, sessions, RBAC support, PostgreSQL adapter |
| i18n | next-intl | App Router-native, Arabic RTL support |
| Styling | Tailwind CSS v4 + shadcn/ui | Design system, component library |
| Real-time | SSE (Server-Sent Events) | Timer sync across devices, simpler than WebSockets for 5 users |
| Background Jobs | pg-boss | PostgreSQL-backed job queue for payroll, reports |
| Currency Handling | Dinero.js | Precise financial math, multi-currency ready |
| Deployment | Hetzner VPS + Coolify | Self-hosted, persistent storage for images, predictable cost |

### Why This Stack?
- **Drizzle over Prisma:** Schema is plain TypeScript, no code gen step, SQL-near for audit/debugging
- **Better Auth over Auth.js:** Built-in credentials, RBAC, and admin plugin fit our internal-app model
- **SSE over WebSockets:** Only 5 users — SSE is simpler, sufficient, and avoids complexity
- **VPS over Vercel:** Persistent image storage, self-hosted DB, lower long-term cost, no vendor lock-in

---

## 3. What We Explicitly Deferred

These features are acknowledged but **not in scope for the initial build**. They are planned for future phases but will not influence the initial architecture beyond keeping boundaries clean.

- **Offline mode / PWA sync** — online-only for now
- **PDF generation** — use `@media print` for receipts/reports for now
- **Email notifications** — not critical day one
- **IoT / smart plug integration** — speculative, requires hardware
- **AI features** — invoice scanning, voice inventory, predictive scheduling
- **Customer loyalty program** — can be added as a module later
- **Multi-currency support** — build for IQD first, architecture supports extension
- **Kitchen Display System (KDS)** — separate module, not in phase 1

---

## 4. Module Map

```
src/features/
├── auth/                # Better Auth setup, session management
├── pos/                 # Product grid, categories, cart, checkout
├── resources/           # Gaming stations, tables, timers, resource categories
├── shifts/              # Open shift, close shift, variance tracking
├── inventory/           # Products, ingredients, stock movements, recipes
├── procurement/         # Vendors, purchase orders, goods receipt
├── expenses/            # Expense categories, petty cash tracking
├── employees/           # Employee records (non-system users)
├── payroll/             # Payroll entries, salary calculation
├── accounting/         # Chart of accounts, journal entries, P&L, balance sheet
├── partners/            # Partner equity, capital injections, profit sharing
├── admin/               # Users, roles, permissions, system settings, modules
├── audit/               # Audit log viewing (query interface)
└── reports/             # Dashboard, daily summary, low stock alerts
```

Each feature folder follows a consistent internal structure:

```
[feature]/
├── _components/         # Feature-specific UI components (client + server)
├── _services/           # Business logic, DB queries, transaction handling
├── _actions/            # Server Actions (thin, validation + service call)
├── _hooks/              # Custom React hooks (if needed)
├── _types.ts            # Feature-specific TypeScript types
└── index.ts             # Public API re-export for the feature
```

---

## 5. Phase Overview

| Phase | Focus | Key Deliverables | Status |
|-------|-------|-------------------|--------|
| **Phase 1** | Project Setup & Foundation | Next.js app, DB, auth, base layout, i18n | ✅ Complete — commit `c026dd5` |
| **Phase 2** | POS Core & Timed Resources | Product grid, cart, checkout, resource grid, timer logic | ✅ Complete — commits `2e69fd4`–`71ec82d` |
| **Phase 3** | Shift Management | Open/close shift, variance tracking, cash handling | ✅ Complete — commit `a48f6f3` |
| **Phase 4** | Inventory & Products | Product CRUD, ingredients, stock, low-stock alerts | ✅ Complete — commit `71ec82d` |
| **Phase 5** | Admin & Permissions | User management, roles, permissions, settings | ✅ Complete — `admin/` feature module with `userService`, `permissionService`, `settingsService`, `PermissionGate` |
| **Phase 6** | Procurement & Expenses | Vendors, purchases, expense tracking | ✅ Complete — `procurement/` + `expenses/` feature modules |
| **Phase 7** | Accounting & Partners | Chart of accounts, journals, partner equity | ✅ Complete — commit `2356173` |
| **Phase 8** | Reports & Polish | Dashboard, summaries, final UI polish | ❌ Not started |

---

## 6. Current State

- **Phases 1–6**: ✅ Complete (foundation, POS, shifts, inventory, admin, procurement/expenses)
- **Phase 7**: ✅ Complete — accounting + partners pages, services, and actions
- **Phase 8**: ❌ Not started
- **DESIGN.md** — updated with detailed UI/UX specs, responsive layouts, Arabic RTL rules
- **Rule.md** — complete with code quality, architecture, financial, security, i18n, and workflow rules

## 7. Next Steps

1. **Phase 7** — Implement accounting + partners feature modules (chart of accounts, journal entries, partner equity)
2. **Phase 8** — Reports & Polish (dashboard, summaries, final UI polish)

After Phase 8 is complete, the app will have:
- Full accounting with chart of accounts and journal entries
- Partner equity tracking and profit sharing
- Complete reports and dashboard