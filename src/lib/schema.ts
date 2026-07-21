import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const resourceStatusEnum = pgEnum('resource_status', [
  'available',
  'occupied',
  'maintenance',
])

export const orderStatusEnum = pgEnum('order_status', [
  'open',
  'closed',
  'cancelled',
  'transferred',
  'draft',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'card',
  'mobile_wallet',
  'split',
])

// standard  = physical product with optional qty tracking (e.g. Pepsi can)
// recipe    = made from ingredients, no direct stock (e.g. Cappuccino)
// service   = non-physical (reserved for future use; timed billing lives on resources)
export const productTypeEnum = pgEnum('product_type', [
  'standard',
  'recipe',
  'service',
])

export const shiftStatusEnum = pgEnum('shift_status', ['open', 'closed'])

export const equityEntryTypeEnum = pgEnum('equity_entry_type', [
  'capital_injection',
  'draw',
  'profit_share',
  'loss_share',
])

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'purchase',
  'sale_deduction',
  'wastage',
  'adjustment',
  'opening_balance',
])

export const accountTypeEnum = pgEnum('account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'cogs',
  'expense',
])

export const journalLineTypeEnum = pgEnum('journal_line_type', ['debit', 'credit'])

// ─────────────────────────────────────────────────────────────────────────────
// USERS & RBAC
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:           text('id').primaryKey(),
  name:         text('name').notNull(),
  email:        text('email').notNull().unique(),
  passwordHash: text('password_hash'),  // nullable — better-auth stores credentials in accounts table
  emailVerified: boolean('email_verified').notNull().default(false),
  isActive:     boolean('is_active').notNull().default(true),
  isDisabled:   boolean('is_disabled').notNull().default(false),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

// Better Auth: sessions table
export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Better Auth: accounts table (OAuth accounts)
export const accounts = pgTable('accounts', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId:        text('account_id').notNull(),
  providerId:       text('provider_id').notNull(),
  accessToken:      text('access_token'),
  refreshToken:     text('refresh_token'),
  idToken:          text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:            text('scope'),
  password:         text('password'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
})

// Better Auth: verification tokens (email verification, etc.)
export const verifications = pgTable('verifications', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

// Roles are created by admins at runtime — nothing hardcoded
export const roles = pgTable('roles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull().unique(),   // e.g. "Cashier", "Accountant"
  description: text('description'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})

// Every possible action in the system lives here as a string key.
// e.g. "pos.view", "pos.void_item", "accounting.view", "settings.manage"
export const permissions = pgTable('permissions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  key:         text('key').notNull().unique(),
  description: text('description'),
  module:      text('module').notNull(), // e.g. "pos", "accounting", "inventory"
})

// Which permissions belong to which role
export const rolePermissions = pgTable('role_permissions', {
  roleId:       uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
})

// Which roles are assigned to which user
export const userRoles = pgTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
})

// ─────────────────────────────────────────────────────────────────────────────
// PARTNERS (MULTI-OWNER EQUITY)
// ─────────────────────────────────────────────────────────────────────────────

export const partners = pgTable('partners', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           text('user_id').notNull().references(() => users.id),
  ownershipPercent: numeric('ownership_percent', { precision: 5, scale: 2 }).notNull(), // e.g. 50.00
  createdAt:        timestamp('created_at').notNull().defaultNow(),
})

// Every capital injection, draw, profit split, or loss allocation is a row here.
// Running sum = current equity balance for that partner.
export const partnerEquityEntries = pgTable('partner_equity_entries', {
  id:        uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').notNull().references(() => partners.id),
  type:      equityEntryTypeEnum('type').notNull(),
  amount:    numeric('amount', { precision: 14, scale: 3 }).notNull(),
  note:      text('note'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE CATEGORIES & RESOURCES  (no "PS5" hardcoding anywhere)
// ─────────────────────────────────────────────────────────────────────────────

// Admin creates categories like "Cafe Table", "Gaming Station", "VIP Room"
export const resourceCategories = pgTable('resource_categories', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           text('name').notNull(),
  isTimed:        boolean('is_timed').notNull().default(false),
  hourlyRate:     numeric('hourly_rate', { precision: 12, scale: 3 }).default('0'),
  minimumMinutes: integer('minimum_minutes').default(0),  // minimum billable time
  graceMinutes:   integer('grace_minutes').default(0),    // free buffer before charging more
  isActive:       boolean('is_active').notNull().default(true),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
})

// Individual units: "Station 01", "Table 03", "VIP Room A"
export const resources = pgTable('resources', {
  id:             uuid('id').primaryKey().defaultRandom(),
  categoryId:     uuid('category_id').notNull().references(() => resourceCategories.id),
  name:           text('name').notNull(),
  status:         resourceStatusEnum('status').notNull().default('available'),
  localImageName: text('local_image_name'), // filename only — file lives on Railway disk
  isActive:       boolean('is_active').notNull().default(true),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// SHIFTS
// ─────────────────────────────────────────────────────────────────────────────

export const shifts = pgTable('shifts', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  cashierId:            text('cashier_id').notNull().references(() => users.id),
  status:               shiftStatusEnum('status').notNull().default('open'),
  openedAt:             timestamp('opened_at').notNull().defaultNow(),
  closedAt:             timestamp('closed_at'),

  // Opening float = cash already in drawer when shift starts
  openingFloat:         numeric('opening_float', { precision: 12, scale: 3 }).notNull(),

  // Set at close time
  closingCountedCash:   numeric('closing_counted_cash',   { precision: 12, scale: 3 }),
  closingExpectedCash:  numeric('closing_expected_cash',  { precision: 12, scale: 3 }),
  // Positive = overage, Negative = shortage
  cashVariance:         numeric('cash_variance',          { precision: 12, scale: 3 }),

  notes:      text('notes'),
  approvedBy: text('approved_by').references(() => users.id),
})

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY — UNITS, INGREDIENTS, PRODUCTS, RECIPES
// ─────────────────────────────────────────────────────────────────────────────

export const units = pgTable('units', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull().unique(),         // e.g. "gram"
  abbreviation: text('abbreviation').notNull(),          // e.g. "g"
})

// Raw materials tracked in stock (beans, milk, cups, etc.)
export const ingredients = pgTable('ingredients', {
  id:                uuid('id').primaryKey().defaultRandom(),
  name:              text('name').notNull(),
  unitId:            uuid('unit_id').notNull().references(() => units.id),
  stockQty:          numeric('stock_qty',           { precision: 12, scale: 3 }).notNull().default('0'),
  lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }).default('0'),
  costPerUnit:       numeric('cost_per_unit',        { precision: 12, scale: 3 }).default('0'),
  isActive:          boolean('is_active').notNull().default(true),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
})

export const productCategories = pgTable('product_categories', {
  id:       uuid('id').primaryKey().defaultRandom(),
  name:     text('name').notNull(),
  nameAr:   text('name_ar'),
  parentId: uuid('parent_id'),   // self-reference for nested categories
  isActive: boolean('is_active').notNull().default(true),
})

export const products = pgTable('products', {
  id:                uuid('id').primaryKey().defaultRandom(),
  categoryId:        uuid('category_id').references(() => productCategories.id),
  name:              text('name').notNull(),
  nameAr:            text('name_ar'),
  type:              productTypeEnum('type').notNull(),

  price:             numeric('price', { precision: 12, scale: 3 }).notNull(),

  // trackStock only relevant for type = "standard"
  trackStock:        boolean('track_stock').notNull().default(false),
  stockQty:          numeric('stock_qty',           { precision: 12, scale: 3 }).default('0'),
  lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }).default('0'),

  localImageName:    text('local_image_name'),
  isActive:          boolean('is_active').notNull().default(true),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
})

// Recipe: what ingredients get deducted when this product is sold
export const productIngredients = pgTable('product_ingredients', {
  id:           uuid('id').primaryKey().defaultRandom(),
  productId:    uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id),
  quantityUsed: numeric('quantity_used', { precision: 10, scale: 3 }).notNull(),
})

// Full history of every stock change — purchases, sales, wastage, corrections
export const stockMovements = pgTable('stock_movements', {
  id:           uuid('id').primaryKey().defaultRandom(),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id),
  productId:    uuid('product_id').references(() => products.id),
  type:         stockMovementTypeEnum('type').notNull(),
  // Positive = stock in, Negative = stock out
  quantity:     numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  note:         text('note'),
  orderId:      uuid('order_id'),    // set if triggered by a sale
  purchaseId:   uuid('purchase_id'), // set if triggered by a purchase receipt
  createdBy:    text('created_by').references(() => users.id),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  ingredientIdx: index('sm_ingredient_idx').on(t.ingredientId),
  orderIdx:      index('sm_order_idx').on(t.orderId),
}))

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS, ORDER ITEMS, TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const orders = pgTable('orders', {
  id:               uuid('id').primaryKey().defaultRandom(),
  shiftId:          uuid('shift_id').notNull().references(() => shifts.id),
  // null = takeaway / no assigned table
  resourceId:       uuid('resource_id').references(() => resources.id),
  cashierId:        text('cashier_id').notNull().references(() => users.id),
  status:           orderStatusEnum('status').notNull().default('open'),

  // Timer fields — only populated when resource is timed
  timerStartedAt:     timestamp('timer_started_at'),
  timerEndedAt:       timestamp('timer_ended_at'),
  // Calculated server-side at stop time, then frozen as a line item
  timerChargeAmount:  numeric('timer_charge_amount', { precision: 12, scale: 3 }).default('0'),

  subtotal:     numeric('subtotal',      { precision: 12, scale: 3 }).notNull().default('0'),
  totalAmount:  numeric('total_amount',  { precision: 12, scale: 3 }).notNull().default('0'),

  note:       text('note'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  closedAt:   timestamp('closed_at'),
}, (t) => ({
  shiftIdx:    index('orders_shift_idx').on(t.shiftId),
  resourceIdx: index('orders_resource_idx').on(t.resourceId),
}))

export const orderItems = pgTable('order_items', {
  id:         uuid('id').primaryKey().defaultRandom(),
  orderId:    uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId:  uuid('product_id').notNull().references(() => products.id),
  quantity:   numeric('quantity',   { precision: 10, scale: 3 }).notNull(),
  // Price is captured at time of sale — never recalculated if product price changes later
  unitPrice:  numeric('unit_price',  { precision: 12, scale: 3 }).notNull(),
  totalPrice: numeric('total_price', { precision: 12, scale: 3 }).notNull(),
  note:       text('note'),

  // Void fields — voids before checkout don't delete the row, they mark it
  voidedAt:   timestamp('voided_at'),
  voidedBy:   text('voided_by').references(() => users.id),
  voidReason: text('void_reason'),
})

// One order can have multiple transactions (e.g. split payment: half cash, half card)
export const transactions = pgTable('transactions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  orderId:       uuid('order_id').notNull().references(() => orders.id),
  shiftId:       uuid('shift_id').notNull().references(() => shifts.id),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  amount:        numeric('amount', { precision: 12, scale: 3 }).notNull(),
  // External reference — card terminal ID, ZainCash transaction ID, etc.
  reference:     text('reference'),

  // Refund fields — refunds after checkout create a new row with isRefund = true
  isRefund:     boolean('is_refund').notNull().default(false),
  refundReason: text('refund_reason'),
  refundedBy:   text('refunded_by').references(() => users.id),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  shiftIdx: index('tx_shift_idx').on(t.shiftId),
  orderIdx: index('tx_order_idx').on(t.orderId),
}))

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

export const expenseCategories = pgTable('expense_categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  accountId: uuid('account_id'), // links to chart_of_accounts
  isActive:  boolean('is_active').notNull().default(true),
})

export const expenses = pgTable('expenses', {
  id:               uuid('id').primaryKey().defaultRandom(),
  shiftId:          uuid('shift_id').notNull().references(() => shifts.id),
  categoryId:       uuid('category_id').notNull().references(() => expenseCategories.id),
  amount:           numeric('amount', { precision: 12, scale: 3 }).notNull(),
  description:      text('description'),
  paidBy:           text('paid_by').references(() => users.id),
  receiptImageName: text('receipt_image_name'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// PROCUREMENT (PURCHASES FROM VENDORS)
// ─────────────────────────────────────────────────────────────────────────────

export const vendors = pgTable('vendors', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  phone:     text('phone'),
  address:   text('address'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const purchases = pgTable('purchases', {
  id:               uuid('id').primaryKey().defaultRandom(),
  vendorId:         uuid('vendor_id').references(() => vendors.id),
  totalAmount:      numeric('total_amount', { precision: 12, scale: 3 }).notNull(),
  isPaid:           boolean('is_paid').notNull().default(false),
  paidAt:           timestamp('paid_at'),
  receiptImageName: text('receipt_image_name'),
  note:             text('note'),
  createdBy:        text('created_by').references(() => users.id),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
})

export const purchaseItems = pgTable('purchase_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  purchaseId:   uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id),
  // If buying a finished product for resale (e.g. packaged drinks)
  productId:    uuid('product_id').references(() => products.id),
  quantity:     numeric('quantity',   { precision: 12, scale: 3 }).notNull(),
  unitCost:     numeric('unit_cost',  { precision: 12, scale: 3 }).notNull(),
  totalCost:    numeric('total_cost', { precision: 12, scale: 3 }).notNull(),
})

export const goodsReceipts = pgTable('goods_receipts', {
  id:         uuid('id').primaryKey().defaultRandom(),
  purchaseId: uuid('purchase_id').notNull().unique().references(() => purchases.id),
  receivedBy: text('received_by').references(() => users.id),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  note:       text('note'),
})

export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  goodsReceiptId: uuid('goods_receipt_id').notNull().references(() => goodsReceipts.id, { onDelete: 'cascade' }),
  ingredientId:   uuid('ingredient_id').references(() => ingredients.id),
  productId:      uuid('product_id').references(() => products.id),
  quantity:       numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost:       numeric('unit_cost', { precision: 12, scale: 3 }).notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEES & PAYROLL
// ─────────────────────────────────────────────────────────────────────────────

export const employees = pgTable('employees', {
  id:           uuid('id').primaryKey().defaultRandom(),
  // userId is optional — not every employee needs a system login
  userId:       text('user_id').references(() => users.id),
  name:         text('name').notNull(),
  phone:        text('phone'),
  salaryType:   text('salary_type').notNull(), // "hourly" | "fixed"
  salaryAmount: numeric('salary_amount', { precision: 12, scale: 3 }).notNull(),
  hiredAt:      timestamp('hired_at'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export const payrollEntries = pgTable('payroll_entries', {
  id:          uuid('id').primaryKey().defaultRandom(),
  employeeId:  uuid('employee_id').notNull().references(() => employees.id),
  periodStart: timestamp('period_start').notNull(),
  periodEnd:   timestamp('period_end').notNull(),
  baseSalary:  numeric('base_salary', { precision: 12, scale: 3 }).notNull(),
  bonuses:     numeric('bonuses',     { precision: 12, scale: 3 }).default('0'),
  deductions:  numeric('deductions',  { precision: 12, scale: 3 }).default('0'),
  netAmount:   numeric('net_amount',  { precision: 12, scale: 3 }).notNull(),
  isPaid:      boolean('is_paid').notNull().default(false),
  paidAt:      timestamp('paid_at'),
  note:        text('note'),
  createdBy:   text('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTING — CHART OF ACCOUNTS & DOUBLE-ENTRY JOURNAL
// ─────────────────────────────────────────────────────────────────────────────

// Admin builds this tree. Default rows seeded on first install.
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id:       uuid('id').primaryKey().defaultRandom(),
  // Standard accounting code — e.g. "1001" (Cash), "4001" (Sales Revenue)
  code:     text('code').notNull().unique(),
  name:     text('name').notNull(),
  nameAr:   text('name_ar'),
  type:     accountTypeEnum('type').notNull(),
  parentId: uuid('parent_id'), // self-reference for tree structure
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Every financial event creates one journal entry with 2+ lines (debit + credit)
export const journalEntries = pgTable('journal_entries', {
  id:          uuid('id').primaryKey().defaultRandom(),
  // "ORDER-abc123", "PAYROLL-2026-04", "EXPENSE-xyz"
  reference:   text('reference'),
  description: text('description'),
  // Which module created this automatically
  sourceType:  text('source_type'), // "order" | "purchase" | "payroll" | "expense" | "manual"
  sourceId:    uuid('source_id'),
  createdBy:   text('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
})

export const journalEntryLines = pgTable('journal_entry_lines', {
  id:             uuid('id').primaryKey().defaultRandom(),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId:      uuid('account_id').notNull().references(() => chartOfAccounts.id),
  type:           journalLineTypeEnum('type').notNull(),
  amount:         numeric('amount', { precision: 14, scale: 3 }).notNull(),
  note:           text('note'),
})

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS & MODULE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

// Key-value store for all admin-configurable settings.
// value is JSONB so any shape can be stored without migrations.
// Examples:
//   { key: "shop_name",          value: "\"Al-Noor Cafe\"" }
//   { key: "currency_rounding",  value: "250" }
//   { key: "petty_cash_limit",   value: "50000" }
export const systemSettings = pgTable('system_settings', {
  key:       text('key').primaryKey(),
  value:     jsonb('value').notNull(),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Feature toggles — admins flip these on/off per module without code changes.
// Examples: "payroll", "loyalty_points", "kitchen_display", "supplier_po_emails"
export const systemModules = pgTable('system_modules', {
  module:    text('module').primaryKey(),
  isActive:  boolean('is_active').notNull().default(false),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

// Every sensitive action writes here. Partners can review who did what and when.
// Examples: "VOID_ITEM", "CLOSE_SHIFT", "UPDATE_PRICE", "CHANGE_PERMISSION"
export const auditLogs = pgTable('audit_logs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      text('user_id').references(() => users.id),
  action:      text('action').notNull(),
  targetTable: text('target_table'),
  targetId:    uuid('target_id'),
  oldValue:    jsonb('old_value'),
  newValue:    jsonb('new_value'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx:      index('audit_user_idx').on(t.userId),
  createdAtIdx: index('audit_created_at_idx').on(t.createdAt),
}))

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS  (Drizzle query builder uses these for joins)
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  userRoles:   many(userRoles),
  shifts:      many(shifts),
  auditLogs:   many(auditLogs),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles:       many(userRoles),
  rolePermissions: many(rolePermissions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role:       one(roles,       { fields: [rolePermissions.roleId],       references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}))

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user:          one(users, { fields: [partners.userId], references: [users.id] }),
  equityEntries: many(partnerEquityEntries),
}))

export const resourceCategoriesRelations = relations(resourceCategories, ({ many }) => ({
  resources: many(resources),
}))

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  category: one(resourceCategories, { fields: [resources.categoryId], references: [resourceCategories.id] }),
  orders:   many(orders),
}))

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  cashier:      one(users, { fields: [shifts.cashierId],   references: [users.id] }),
  approvedBy:   one(users, { fields: [shifts.approvedBy],  references: [users.id] }),
  orders:       many(orders),
  transactions: many(transactions),
  expenses:     many(expenses),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category:    one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  ingredients: many(productIngredients),
  orderItems:  many(orderItems),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  shift:        one(shifts,    { fields: [orders.shiftId],    references: [shifts.id] }),
  resource:     one(resources, { fields: [orders.resourceId], references: [resources.id] }),
  cashier:      one(users,     { fields: [orders.cashierId],  references: [users.id] }),
  items:        many(orderItems),
  transactions: many(transactions),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order:   one(orders,   { fields: [orderItems.orderId],   references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
  shift: one(shifts, { fields: [transactions.shiftId], references: [shifts.id] }),
}))

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  vendor: one(vendors, { fields: [purchases.vendorId], references: [vendors.id] }),
  items:  many(purchaseItems),
}))

export const goodsReceiptsRelations = relations(goodsReceipts, ({ one, many }) => ({
  purchase: one(purchases, { fields: [goodsReceipts.purchaseId], references: [purchases.id] }),
  receiver: one(users, { fields: [goodsReceipts.receivedBy], references: [users.id] }),
  items: many(goodsReceiptItems),
}))

export const goodsReceiptItemsRelations = relations(goodsReceiptItems, ({ one }) => ({
  receipt: one(goodsReceipts, { fields: [goodsReceiptItems.goodsReceiptId], references: [goodsReceipts.id] }),
  ingredient: one(ingredients, { fields: [goodsReceiptItems.ingredientId], references: [ingredients.id] }),
  product: one(products, { fields: [goodsReceiptItems.productId], references: [products.id] }),
}))

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalEntryLines),
}))

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  entry:   one(journalEntries,  { fields: [journalEntryLines.journalEntryId], references: [journalEntries.id] }),
  account: one(chartOfAccounts, { fields: [journalEntryLines.accountId],      references: [chartOfAccounts.id] }),
}))

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  payrollEntries: many(payrollEntries),
}))

export const payrollEntriesRelations = relations(payrollEntries, ({ one }) => ({
  employee: one(employees, { fields: [payrollEntries.employeeId], references: [employees.id] }),
  createdByUser: one(users, { fields: [payrollEntries.createdBy], references: [users.id] }),
}))
