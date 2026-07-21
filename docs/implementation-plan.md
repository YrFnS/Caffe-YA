# Caffe YA completion plan

Status: Release verification

## 1. Security and financial integrity

- [x] Require authenticated, permission-checked access for every sensitive Server Action and accounting API.
- [x] Keep all money calculations in integer millimes and test shift variance arithmetic.
- [x] Make shift close, journal creation, goods receipt, checkout, and refund writes atomic.
- [x] Prevent closing shifts with active draft/open timed orders and prevent duplicate refunds.

Acceptance: unauthenticated financial APIs return 401; unauthorized roles cannot mutate protected modules; integrity tests pass.

## 2. Operational workflows

- [x] Wire POS resource assignment, timer start/stop, transfer, and timer charges into orders.
- [x] Implement purchase receiving with inventory updates and accounting journal posting.
- [x] Automatically post checkout, expense, purchase receipt, and payroll financial events.
- [x] Fix role creation and permission editing; make module toggles affect navigation and access.

Acceptance: each workflow completes against Neon without partial records and is visible in its downstream module.

## 3. Reporting and role UX

- [x] Apply report date/as-of filters and fix the balance-sheet query.
- [x] Complete operational reports and audit-log filtering.
- [x] Render navigation from role permissions and enabled modules.
- [x] Add missing loading, error, and reusable empty states; remove remaining shell/report localization gaps.

Acceptance: Admin, Manager, Cashier, and Accountant see only allowed modules; English and Arabic workflows render correctly.

## 4. Verification and release

- [x] Replace stale browser tests and credentials with reliable role-based production-safe checks.
- [x] Pass lint with zero warnings, TypeScript, production build, dependency audit, and focused integrity tests.
- [ ] Browser-test every role and core workflow on the deployed Vercel application.
- [ ] Commit and push the verified implementation to `main`.

Acceptance: clean repository, green local gates, successful Vercel deployment, and recorded browser evidence.
