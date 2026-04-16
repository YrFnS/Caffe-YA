# Phase 5: Admin & Permissions

## Goal
Build the admin control panel: user management, role creation, permission configuration, and system settings.

## What Ships
- User CRUD: create, edit, delete users (no public signup — admin-only)
- Role CRUD: create roles, assign permissions
- Permission system: module-level, action-level, field-level
- Permission assignment UI: checkboxes grouped by module
- System settings: key-value store with form UI
- Module toggles: enable/disable features without code
- User sessions view (active sessions, force logout)

## Steps

### Step 1: User Management
- Create `/admin/users`
- Admin creates users with: name, email, password (initial)
- Assign roles to users
- Deactivate user (soft delete) — don't hard delete
- Password reset flow (admin-initiated)

### Step 2: Role Management
- Create `/admin/roles`
- Create/edit roles with name and description
- Assign permissions to role via checkboxes

### Step 3: Permission System
- Define permission keys: `module.action` (e.g., `pos.view`, `pos.void_item`, `inventory.edit`)
- Store in `permissions` table
- Assign to roles via `rolePermissions`
- Assign roles to users via `userRoles`

### Step 4: Permission UI
- Group permissions by module (pos, inventory, accounting, admin)
- Three levels:
  1. Page access: toggle for entire module
  2. Action: toggle for specific actions within module
  3. Field: expand to see field-level Read/Write
- Visual hierarchy: module → page → action → field

### Step 5: System Settings
- Create `/admin/settings`
- Key-value settings: shop name, currency rounding, petty cash limit
- Settings stored in JSONB — admin sees form, not raw JSON

### Step 6: Module Toggles
- Create `/admin/modules`
- Toggle switches for: payroll, loyalty, kitchen_display, etc.
- Stored in `systemModules` — toggles features globally

### Step 7: Frontend Permission Gates
- Create `<PermissionGate>` component that hides/shows UI based on permissions
- Server-side validation in every Server Action

## Dependencies
- Phase 1 (auth, layout)
- Phase 4 (products/inventory — need to protect those routes)

## Success Criteria
- [ ] Admin can create/edit/deactivate users
- [ ] Admin can create roles and assign permissions
- [ ] Permission UI works: three-level checkbox tree
- [ ] System settings editable via form UI
- [ ] Module toggles work — disabled modules hidden from UI
- [ ] Frontend hides elements based on permissions
- [ ] Backend enforces permissions on all sensitive actions