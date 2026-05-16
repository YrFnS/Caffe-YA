# Plan: Add Missing CRUD UI — Admin Users, Employees, Payroll

## Context

The app has placeholder buttons that don't work:
- **Admin → Users**: No "Add User" button — can't create new users through UI
- **Employees**: "Add Employee" button does nothing
- **Payroll**: "Add Payroll Entry" button does nothing

The RBAC infrastructure exists (users table, roles, permissions, Edit Roles UI), but the create user flow and employees/payroll service layers are missing. Pages do direct DB queries instead of using the standard service/action pattern.

---

## Pattern to Follow

Every working feature (inventory, expenses, shifts) uses this stack:

| Layer | Purpose |
|-------|---------|
| **Page** | Server component, reads `searchParams` for `modal`/`editId`, conditionally renders Modal |
| **Table** | Client component, "Add" button calls `router.push('?modal=add')` |
| **Modal** | Client component, local `useState` for form, `FormData` + action, `router.refresh()` on success |
| **Actions** (`_actions/*.ts`) | `'use server'`, session guard, service call, `revalidatePath` |
| **Service** (`_services/*.ts`) | Drizzle queries |

---

## Phase 1: Admin Users — Add User (Smallest)

**No new service needed** — use `auth.api.createUser` (better-auth) to create users.

### Files to Create
- `src/features/admin/_components/UserModal.tsx` — modal with name, email, password fields

### Files to Modify
- `src/features/admin/_actions/adminActions.ts` — add `createUserAction`
- `src/app/[locale]/(protected)/admin/users/page.tsx` — add `searchParams` + conditionally render `UserModal`
- `src/app/[locale]/(protected)/admin/users/_components/UsersClientView.tsx` — add "Add User" button

### What Phase 1 Enables
- "Add User" button on Users page
- Modal form for name, email, password
- New user created via better-auth (includes `accounts` table for credentials)
- Roles assigned via existing "Edit Roles" flow

---

## Phase 2: Employees — Full CRUD

**New infrastructure required** — service, actions, modal, table, schema relations.

### Files to Create
- `src/features/employees/_services/employeeService.ts` — `getAllEmployees`, `createEmployee`, `updateEmployee`, `deleteEmployee`
- `src/features/employees/_actions/employeeActions.ts` — server actions wrapping the service
- `src/features/employees/_components/EmployeeTable.tsx` — table with "Add Employee" + edit buttons
- `src/features/employees/_components/EmployeeModal.tsx` — form: name, phone, salaryType (hourly/fixed), salaryAmount, hiredAt, userId (optional)

### Files to Modify
- `src/lib/schema.ts` — add `employeesRelations` (needed for Drizzle joins)

### What Phase 2 Enables
- Add/Edit/Delete employees
- Form fields: name, phone, salary type + amount, hire date, optional user link

---

## Phase 3: Payroll — Full CRUD

**Same pattern as Phase 2** — depends on Employees (needs employee dropdown).

### Files to Create
- `src/features/payroll/_services/payrollService.ts` — `getAllPayrollEntries`, `createPayrollEntry`, `updatePayrollEntry`, `markPayrollPaid`
- `src/features/payroll/_actions/payrollActions.ts` — server actions wrapping the service
- `src/features/payroll/_components/PayrollEntryTable.tsx` — table with "Add Payroll Entry" + edit buttons
- `src/features/payroll/_components/PayrollEntryModal.tsx` — form: employeeId (dropdown), periodStart, periodEnd, baseSalary, bonuses, deductions

### Files to Modify
- `src/lib/schema.ts` — add `payrollEntriesRelations` (needed for Drizzle joins)

### What Phase 3 Enables
- Add/Edit payroll entries
- Employee dropdown, period dates, base/bonus/deduction fields
- Mark entry as paid

---

## Key Reference Files

| Purpose | File |
|---------|------|
| Modal pattern to copy | `src/features/inventory/_components/IngredientModal.tsx` |
| Page with `searchParams` modal handling | `src/features/inventory/ingredients/page.tsx` |
| Admin actions (add `createUserAction`) | `src/features/admin/_actions/adminActions.ts` |
| Better-auth user creation | `src/lib/auth.ts` |
| Schema (add relations here) | `src/lib/schema.ts` |

---

## Verification Per Phase

1. Open the page, click "Add" button → modal appears
2. Fill form and submit → data persists after page reload
3. Edit existing row → modal pre-fills correctly
4. Delete a row → row disappears