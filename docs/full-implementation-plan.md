# RoastGrid full implementation plan

Status: Implemented and production-verified; presentation-device check remains an owner action

This is the authoritative plan for closing the remaining product gaps after
`docs/implementation-plan.md`. The older phase documents remain historical
references; their unchecked boxes are not a second active backlog.

## Definition of done

RoastGrid is complete when every workflow below is reachable through the UI,
authorized by role, atomic in Neon, bilingual in English and Arabic, covered by
automated tests, and verified in the deployed Vercel application.

## Phase 1 — POS voids, refunds, and order lifecycle

- [x] Connect item void, order void, and completed-order refund actions to the POS UI.
- [x] Require a reason, confirmation, and the correct permission for each operation.
- [x] Show completed orders eligible for refund and prevent duplicate refunds.
- [x] Keep order, payment, resource, inventory, journal, and audit updates atomic.
- [x] Replace the unused `VoidModal` and any dead POS actions with the final connected flow.

Acceptance:

- Cashier can void permitted draft items/orders but cannot refund without permission.
- Manager can refund a completed order once; the refund and audit entry are visible.
- Failed operations leave no partial financial, stock, or resource changes.

## Phase 2 — Split payments

- [x] Let checkout contain two or more payment lines using cash, card, or mobile wallet.
- [x] Calculate and validate payment totals with integer millimes only.
- [x] Require references for non-cash lines and reject unsupported payment methods.
- [x] Insert every payment line and close the order in one transaction.
- [x] Keep single-payment checkout as the one-line default case.

Acceptance:

- A mixed cash/card checkout succeeds only when payment lines equal the order total.
- Underpayment, overpayment, duplicate submission, or invalid methods close nothing.
- Shift totals and reports include every payment line exactly once.

## Phase 3 — Complete procurement lifecycle

- [x] Expose purchase mark-paid and safe cancel/delete controls in the purchases UI.
- [x] Add receipt-detail viewing and visible received/paid lifecycle states.
- [x] Post unpaid receipts to accounts payable and later payment to cash atomically.
- [x] Make payment idempotent and block destructive deletion after receipt or posting.
- [x] Replace raw ingredient/product ID inputs with existing searchable selections.

Acceptance:

- Manager can create, receive, inspect, and pay a purchase entirely through the UI.
- Receipt updates stock once; payment clears the payable once.
- Received or posted purchases cannot be silently deleted.

## Phase 4 — Complete bilingual UX

- [x] Move remaining user-facing English strings and placeholders into `en.json` and `ar.json`.
- [x] Cover sign-in marketing text, dashboard copy, admin, employees, payroll, accounting,
  inventory selectors, procurement, checkout, and void/refund dialogs.
- [x] Use deterministic Baghdad-localized date/time formatting on server and client.
- [x] Add a translation-key parity check so missing English or Arabic keys fail CI.
- [x] Verify keyboard use, labels, focus states, dialogs, responsive layout, LTR, and RTL.

Acceptance:

- No missing-message or hydration errors appear in either locale.
- Every supported page and dialog is usable without unintended English in Arabic mode.
- Desktop and mobile-width pages have no blocking clipping or inaccessible controls.

## Phase 5 — Live multi-user operations

- [x] Refresh dashboard, resource availability, active orders, and shift state every five seconds.
- [x] Pause refresh when the page is hidden and refresh immediately when it becomes visible.
- [x] Preserve in-progress form and checkout state during background refreshes.
- [x] Avoid new realtime infrastructure; authenticated polling is sufficient for this Vercel demo.

Acceptance:

- Changes made in one signed-in browser appear in another within five seconds.
- Polling never exposes unauthorized data or interrupts active data entry.

## Phase 6 — Full automated workflow matrix

- [x] Add unit tests for split totals, refund limits, shift variance, payroll, and journal balance.
- [x] Add database-backed tests for transaction rollback, idempotency, stock, and accounting posts.
- [x] Add role tests for Admin, Manager, Cashier, and Accountant, including forbidden access.
- [x] Add automated role browser smoke tests and production browser journeys for POS, transfer, split checkout, void/refund, shift close,
  inventory/recipe, procurement, expenses, employees/payroll, accounting, roles/modules,
  reports, sign-out, and English/Arabic rendering.
- [x] Use unique records for mutable production journeys and isolated Neon branches for rollback/idempotency tests without altering seed fixtures.

Acceptance:

- Every feature has at least one success path and one important failure/permission path.
- Lint, TypeScript, unit, database, and browser suites pass from a clean checkout.
- Production smoke tests remain safe to rerun against the demo database.

## Phase 7 — Release and plan reconciliation

- [x] Recheck all success criteria in both historical phase plans and record evidence here.
- [x] Update `docs/launch-checklist.md` with the completed production browser journey.
- [ ] Run the final client-device check on the actual presentation device.
- [x] Seed or repair demo data, deploy to Vercel, and verify all four roles in production.
- [x] Run dependency audit, secret scan, migration verification, and Neon table/integrity checks.
- [x] Commit and push the verified release to `main` and confirm GitHub matches local HEAD.

Acceptance:

- No active implementation checklist remains elsewhere in `docs/`.
- The repository is clean, the canonical URL is Ready, and all release gates are green.

## Explicitly outside this implementation

These require an owner decision after the demo and are not code-completion blockers:

- Custom domain and billing ownership.
- Production monitoring and backup-retention policy.
- Rotation from shared demo users to named employee accounts.
- Payment gateway, email provider, analytics, object storage, or external AI integrations.

## Release evidence — 2026-07-26

- Production: `https://roastgrid.vercel.app` reached Vercel Ready after a clean Next.js build.
- Browser: all four roles signed in through the deployed UI. Cashier restrictions, item void,
  cash/card split payment, manager shift opening and one-time refund, procurement create/receive/pay,
  accountant finance routes, sign-out, Arabic RTL, and a 390×844 layout were exercised.
- Automated browser: the seven-test production Playwright suite passed for unauthenticated finance
  APIs, all four role entry points, cashier restrictions, and Arabic RTL.
- Data: database tests passed on an isolated expiring Neon branch; all 37 production tables are
  populated, role grants are present, and no unbalanced journal entries were found.
- Gates: unit tests, translation parity, TypeScript, ESLint, production build, Drizzle validation,
  `npm audit` (zero vulnerabilities), diff integrity, and the final Codex review passed.
- Remaining external action: open the final URL once on the actual presentation device.
