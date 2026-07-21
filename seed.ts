import 'dotenv/config'
import { hashPassword } from '@better-auth/utils/password'
import { drizzle } from 'drizzle-orm/node-postgres'
import { inArray } from 'drizzle-orm'
import { Pool } from 'pg'
import * as schema from './src/lib/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })

const ids = {
  admin: 'demo-admin', manager: 'demo-manager', cashier: 'demo-cashier', accountant: 'demo-accountant',
  superAdmin: '10000000-0000-4000-8000-000000000001', managerRole: '10000000-0000-4000-8000-000000000002', cashierRole: '10000000-0000-4000-8000-000000000003', accountantRole: '10000000-0000-4000-8000-000000000004',
  partnerAdmin: '20000000-0000-4000-8000-000000000001', partnerManager: '20000000-0000-4000-8000-000000000002',
  resourceCategory: '30000000-0000-4000-8000-000000000001', ps5: '30000000-0000-4000-8000-000000000002', pc: '30000000-0000-4000-8000-000000000003', vip: '30000000-0000-4000-8000-000000000004',
  shift: '40000000-0000-4000-8000-000000000001', gram: '40000000-0000-4000-8000-000000000002', ml: '40000000-0000-4000-8000-000000000003', piece: '40000000-0000-4000-8000-000000000004',
  beans: '50000000-0000-4000-8000-000000000001', milk: '50000000-0000-4000-8000-000000000002', sugar: '50000000-0000-4000-8000-000000000003', cups: '50000000-0000-4000-8000-000000000004',
  hot: '60000000-0000-4000-8000-000000000001', cold: '60000000-0000-4000-8000-000000000002', food: '60000000-0000-4000-8000-000000000003',
  espresso: '70000000-0000-4000-8000-000000000001', cappuccino: '70000000-0000-4000-8000-000000000002', latte: '70000000-0000-4000-8000-000000000003', croissant: '70000000-0000-4000-8000-000000000004',
  orderClosed: '80000000-0000-4000-8000-000000000001', orderOpen: '80000000-0000-4000-8000-000000000002', vendor: '80000000-0000-4000-8000-000000000003', purchase: '80000000-0000-4000-8000-000000000004',
  expenseCategory: '90000000-0000-4000-8000-000000000001', expense: '90000000-0000-4000-8000-000000000002', employeeCashier: '90000000-0000-4000-8000-000000000003', employeeManager: '90000000-0000-4000-8000-000000000004',
  cashAccount: 'a0000000-0000-4000-8000-000000000001', inventoryAccount: 'a0000000-0000-4000-8000-000000000002', salesAccount: 'a0000000-0000-4000-8000-000000000003', expenseAccount: 'a0000000-0000-4000-8000-000000000004', journal: 'a0000000-0000-4000-8000-000000000005',
}

const productImages = {
  espresso: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=900&q=80',
  cappuccino: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=80',
  latte: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
  croissant: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80',
}

const permissionRows = [
  ['admin.view', 'admin'], ['admin.manage_users', 'admin'], ['admin.manage_roles', 'admin'], ['admin.manage_permissions', 'admin'], ['admin.manage_settings', 'admin'], ['admin.manage_modules', 'admin'],
  ['pos.view', 'pos'], ['pos.checkout', 'pos'], ['pos.void_item', 'pos'], ['pos.void_order', 'pos'], ['pos.open_shift', 'pos'], ['pos.close_shift', 'pos'],
  ['shifts.view', 'shifts'], ['shifts.open', 'shifts'], ['shifts.close', 'shifts'], ['shifts.approve', 'shifts'],
  ['inventory.view', 'inventory'], ['inventory.manage_products', 'inventory'], ['inventory.manage_ingredients', 'inventory'], ['inventory.manage_categories', 'inventory'], ['inventory.stock_movement', 'inventory'],
  ['procurement.view', 'procurement'], ['procurement.create_po', 'procurement'], ['procurement.delete_po', 'procurement'], ['procurement.receive_goods', 'procurement'], ['procurement.approve_invoice', 'procurement'],
  ['expenses.view', 'expenses'], ['expenses.create', 'expenses'], ['expenses.update', 'expenses'], ['expenses.delete', 'expenses'], ['expenses.approve', 'expenses'],
  ['accounting.view', 'accounting'], ['reports.view', 'reports'],
].map(([key, module], index) => ({ id: `b0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, key, module, description: key.replaceAll('.', ' ') }))

async function syncPermissionMatrix() {
  let currentPermissions = await db.select().from(schema.permissions)
  for (const permission of permissionRows) {
    const matches = currentPermissions.filter((current) => current.key === permission.key)
    if (matches.length === 0) {
      await db.insert(schema.permissions).values({ key: permission.key, module: permission.module, description: permission.description })
    } else if (matches.length > 1) {
      const duplicateIds = matches.slice(1).map((match) => match.id)
      await db.delete(schema.rolePermissions).where(inArray(schema.rolePermissions.permissionId, duplicateIds))
      await db.delete(schema.permissions).where(inArray(schema.permissions.id, duplicateIds))
    }
  }

  const demoRoleIds = [ids.superAdmin, ids.managerRole, ids.cashierRole, ids.accountantRole]
  await db.delete(schema.rolePermissions).where(inArray(schema.rolePermissions.roleId, demoRoleIds))
  currentPermissions = await db.select().from(schema.permissions)
  const managedPermissions = currentPermissions.filter((permission) => permissionRows.some((row) => row.key === permission.key))
  await db.insert(schema.rolePermissions).values(managedPermissions.map((permission) => ({ roleId: ids.superAdmin, permissionId: permission.id })))
  await db.insert(schema.rolePermissions).values(managedPermissions.filter((p) => p.module !== 'admin').map((permission) => ({ roleId: ids.managerRole, permissionId: permission.id })))
  await db.insert(schema.rolePermissions).values(managedPermissions.filter((p) => p.module === 'pos' || p.module === 'shifts').map((p) => ({ roleId: ids.cashierRole, permissionId: p.id })))
  await db.insert(schema.rolePermissions).values(managedPermissions.filter((p) => ['accounting', 'expenses', 'reports'].includes(p.module)).map((p) => ({ roleId: ids.accountantRole, permissionId: p.id })))
}

async function seed() {
  const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1)
  if (existing.length) {
    await syncPermissionMatrix()
    console.log('Demo data already exists; permission matrix synchronized.')
    return
  }

  const password = await hashPassword('CaffeDemo2026!')
  const now = new Date()
  const yesterday = new Date(now.getTime() - 86_400_000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  await db.transaction(async (tx) => {
    const demoUsers = [
      { id: ids.admin, name: 'Yara Hassan', email: 'admin@caffe.ya' },
      { id: ids.manager, name: 'Omar Kareem', email: 'manager@caffe.ya' },
      { id: ids.cashier, name: 'Sara Ali', email: 'cashier@caffe.ya' },
      { id: ids.accountant, name: 'Noor Ahmed', email: 'accountant@caffe.ya' },
    ]
    await tx.insert(schema.users).values(demoUsers.map((user) => ({ ...user, passwordHash: password, emailVerified: true })))
    await tx.insert(schema.accounts).values(demoUsers.map((user) => ({ id: `account-${user.id}`, userId: user.id, accountId: user.email, providerId: 'credential', password })))

    const roleRows = [
      { id: ids.superAdmin, name: 'Super Admin', description: 'Full system access' },
      { id: ids.managerRole, name: 'Manager', description: 'Operations and reporting' },
      { id: ids.cashierRole, name: 'Cashier', description: 'POS and shift operations' },
      { id: ids.accountantRole, name: 'Accountant', description: 'Accounting, expenses, and payroll' },
    ]
    await tx.insert(schema.roles).values(roleRows)
    await tx.insert(schema.permissions).values(permissionRows)
    await tx.insert(schema.rolePermissions).values(permissionRows.map((permission) => ({ roleId: ids.superAdmin, permissionId: permission.id })))
    await tx.insert(schema.rolePermissions).values(permissionRows.filter((p) => p.module !== 'admin').map((permission) => ({ roleId: ids.managerRole, permissionId: permission.id })))
    await tx.insert(schema.rolePermissions).values(permissionRows.filter((p) => p.module === 'pos' || p.module === 'shifts').map((p) => ({ roleId: ids.cashierRole, permissionId: p.id })))
    await tx.insert(schema.rolePermissions).values(permissionRows.filter((p) => ['accounting', 'expenses', 'reports'].includes(p.module)).map((p) => ({ roleId: ids.accountantRole, permissionId: p.id })))
    await tx.insert(schema.userRoles).values([
      { userId: ids.admin, roleId: ids.superAdmin }, { userId: ids.manager, roleId: ids.managerRole },
      { userId: ids.cashier, roleId: ids.cashierRole }, { userId: ids.accountant, roleId: ids.accountantRole },
    ])

    await tx.insert(schema.partners).values([
      { id: ids.partnerAdmin, userId: ids.admin, ownershipPercent: '60.00' },
      { id: ids.partnerManager, userId: ids.manager, ownershipPercent: '40.00' },
    ])
    await tx.insert(schema.partnerEquityEntries).values([
      { partnerId: ids.partnerAdmin, type: 'capital_injection', amount: '15000000', note: 'Opening capital', createdBy: ids.admin },
      { partnerId: ids.partnerManager, type: 'capital_injection', amount: '10000000', note: 'Opening capital', createdBy: ids.admin },
    ])

    await tx.insert(schema.resourceCategories).values({ id: ids.resourceCategory, name: 'Gaming Stations', isTimed: true, hourlyRate: '5000', minimumMinutes: 30, graceMinutes: 5 })
    await tx.insert(schema.resources).values([
      { id: ids.ps5, categoryId: ids.resourceCategory, name: 'PS5 Lounge 01', status: 'occupied', localImageName: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1000&q=80' },
      { id: ids.pc, categoryId: ids.resourceCategory, name: 'Gaming PC 01', status: 'available', localImageName: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1000&q=80' },
      { id: ids.vip, categoryId: ids.resourceCategory, name: 'VIP Booth', status: 'available', localImageName: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80' },
    ])
    await tx.insert(schema.shifts).values({ id: ids.shift, cashierId: ids.cashier, status: 'open', openingFloat: '250000', openedAt: new Date(now.getTime() - 4 * 3_600_000), notes: 'Client demo shift' })

    await tx.insert(schema.units).values([
      { id: ids.gram, name: 'gram', abbreviation: 'g' }, { id: ids.ml, name: 'milliliter', abbreviation: 'ml' }, { id: ids.piece, name: 'piece', abbreviation: 'pc' },
    ])
    await tx.insert(schema.ingredients).values([
      { id: ids.beans, name: 'House Coffee Beans', unitId: ids.gram, stockQty: '8200', lowStockThreshold: '1200', costPerUnit: '18' },
      { id: ids.milk, name: 'Fresh Milk', unitId: ids.ml, stockQty: '24000', lowStockThreshold: '5000', costPerUnit: '3' },
      { id: ids.sugar, name: 'Brown Sugar', unitId: ids.gram, stockQty: '900', lowStockThreshold: '1500', costPerUnit: '2' },
      { id: ids.cups, name: 'Takeaway Cups', unitId: ids.piece, stockQty: '180', lowStockThreshold: '50', costPerUnit: '250' },
    ])
    await tx.insert(schema.productCategories).values([
      { id: ids.hot, name: 'Signature Coffee', nameAr: 'قهوة مميزة' }, { id: ids.cold, name: 'Cold Bar', nameAr: 'مشروبات باردة' }, { id: ids.food, name: 'Bakery', nameAr: 'مخبوزات' },
    ])
    await tx.insert(schema.products).values([
      { id: ids.espresso, categoryId: ids.hot, name: 'Double Espresso', nameAr: 'إسبريسو مزدوج', type: 'recipe', price: '4500', localImageName: productImages.espresso },
      { id: ids.cappuccino, categoryId: ids.hot, name: 'Cappuccino', nameAr: 'كابتشينو', type: 'recipe', price: '6500', localImageName: productImages.cappuccino },
      { id: ids.latte, categoryId: ids.cold, name: 'Iced Spanish Latte', nameAr: 'سبانش لاتيه مثلج', type: 'recipe', price: '8000', localImageName: productImages.latte },
      { id: ids.croissant, categoryId: ids.food, name: 'Butter Croissant', nameAr: 'كرواسون بالزبدة', type: 'standard', price: '5000', trackStock: true, stockQty: '24', lowStockThreshold: '6', localImageName: productImages.croissant },
    ])
    await tx.insert(schema.productIngredients).values([
      { productId: ids.espresso, ingredientId: ids.beans, quantityUsed: '18' },
      { productId: ids.cappuccino, ingredientId: ids.beans, quantityUsed: '18' }, { productId: ids.cappuccino, ingredientId: ids.milk, quantityUsed: '160' },
      { productId: ids.latte, ingredientId: ids.beans, quantityUsed: '18' }, { productId: ids.latte, ingredientId: ids.milk, quantityUsed: '220' }, { productId: ids.latte, ingredientId: ids.sugar, quantityUsed: '15' },
    ])

    await tx.insert(schema.orders).values([
      { id: ids.orderClosed, shiftId: ids.shift, cashierId: ids.cashier, status: 'closed', subtotal: '16000', totalAmount: '16000', closedAt: new Date(now.getTime() - 45 * 60_000), note: 'Counter order' },
      { id: ids.orderOpen, shiftId: ids.shift, resourceId: ids.ps5, cashierId: ids.cashier, status: 'open', timerStartedAt: new Date(now.getTime() - 38 * 60_000), subtotal: '6500', totalAmount: '6500', note: 'Gaming lounge order' },
    ])
    await tx.insert(schema.orderItems).values([
      { orderId: ids.orderClosed, productId: ids.latte, quantity: '2', unitPrice: '8000', totalPrice: '16000' },
      { orderId: ids.orderOpen, productId: ids.cappuccino, quantity: '1', unitPrice: '6500', totalPrice: '6500' },
    ])
    await tx.insert(schema.transactions).values({ orderId: ids.orderClosed, shiftId: ids.shift, paymentMethod: 'card', amount: '16000', reference: 'DEMO-POS-1042' })
    await tx.insert(schema.stockMovements).values([
      { ingredientId: ids.beans, type: 'opening_balance', quantity: '8500', note: 'Demo opening stock', createdBy: ids.manager },
      { ingredientId: ids.beans, type: 'sale_deduction', quantity: '-36', note: 'Demo sales usage', orderId: ids.orderClosed, createdBy: ids.cashier },
    ])

    await tx.insert(schema.chartOfAccounts).values([
      { id: ids.cashAccount, code: '1001', name: 'Cash and Card Clearing', nameAr: 'النقد وتسوية البطاقات', type: 'asset' },
      { id: ids.inventoryAccount, code: '1201', name: 'Inventory', nameAr: 'المخزون', type: 'asset' },
      { id: ids.salesAccount, code: '4001', name: 'Cafe Sales', nameAr: 'مبيعات المقهى', type: 'revenue' },
      { id: ids.expenseAccount, code: '6101', name: 'Utilities Expense', nameAr: 'مصروف الخدمات', type: 'expense' },
    ])
    await tx.insert(schema.expenseCategories).values({ id: ids.expenseCategory, name: 'Utilities', accountId: ids.expenseAccount })
    await tx.insert(schema.expenses).values({ id: ids.expense, shiftId: ids.shift, categoryId: ids.expenseCategory, amount: '85000', description: 'Internet and gaming network', paidBy: ids.manager })
    await tx.insert(schema.vendors).values({ id: ids.vendor, name: 'Baghdad Coffee Supply', phone: '+964 770 555 0142', address: 'Karrada, Baghdad' })
    await tx.insert(schema.purchases).values({ id: ids.purchase, vendorId: ids.vendor, totalAmount: '480000', isPaid: true, paidAt: yesterday, note: 'Weekly coffee and dairy delivery', createdBy: ids.manager })
    await tx.insert(schema.purchaseItems).values([
      { purchaseId: ids.purchase, ingredientId: ids.beans, quantity: '5000', unitCost: '72', totalCost: '360000' },
      { purchaseId: ids.purchase, ingredientId: ids.milk, quantity: '40000', unitCost: '3', totalCost: '120000' },
    ])
    await tx.insert(schema.employees).values([
      { id: ids.employeeCashier, userId: ids.cashier, name: 'Sara Ali', phone: '+964 750 200 1001', salaryType: 'fixed', salaryAmount: '850000', hiredAt: new Date('2025-09-15') },
      { id: ids.employeeManager, userId: ids.manager, name: 'Omar Kareem', phone: '+964 750 200 1002', salaryType: 'fixed', salaryAmount: '1400000', hiredAt: new Date('2025-06-01') },
    ])
    await tx.insert(schema.payrollEntries).values([
      { employeeId: ids.employeeCashier, periodStart: monthStart, periodEnd: now, baseSalary: '850000', bonuses: '50000', deductions: '0', netAmount: '900000', isPaid: false, note: 'Current month', createdBy: ids.accountant },
      { employeeId: ids.employeeManager, periodStart: monthStart, periodEnd: now, baseSalary: '1400000', bonuses: '100000', deductions: '25000', netAmount: '1475000', isPaid: false, note: 'Current month', createdBy: ids.accountant },
    ])
    await tx.insert(schema.journalEntries).values({ id: ids.journal, reference: 'ORDER-DEMO-1042', description: 'Demo card sale', sourceType: 'order', sourceId: ids.orderClosed, createdBy: ids.accountant })
    await tx.insert(schema.journalEntryLines).values([
      { journalEntryId: ids.journal, accountId: ids.cashAccount, type: 'debit', amount: '16000', note: 'Card clearing' },
      { journalEntryId: ids.journal, accountId: ids.salesAccount, type: 'credit', amount: '16000', note: 'Cafe revenue' },
    ])
    await tx.insert(schema.systemSettings).values([
      { key: 'shop_name', value: 'Caffe YA Baghdad', updatedBy: ids.admin },
      { key: 'currency', value: 'IQD', updatedBy: ids.admin },
      { key: 'receipt_footer', value: 'Thank you — شكراً لزيارتكم', updatedBy: ids.admin },
    ])
    await tx.insert(schema.systemModules).values(['pos', 'inventory', 'resources', 'procurement', 'expenses', 'employees', 'payroll', 'accounting', 'partners', 'reports'].map((module) => ({ module, isActive: true, updatedBy: ids.admin })))
    await tx.insert(schema.auditLogs).values({ userId: ids.admin, action: 'DEMO_SEED_CREATED', targetTable: 'orders', targetId: ids.orderClosed, newValue: { environment: 'client-demo', tables: 33 } })
  })

  console.log('Seed complete: all 33 demo-domain tables populated.')
  console.log('Demo password for all users: CaffeDemo2026!')
}

seed().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => pool.end())
