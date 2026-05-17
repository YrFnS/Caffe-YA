import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { hashPassword } from '@better-auth/utils/password'
import { v4 as uuid } from 'uuid'
import * as schema from './src/lib/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/caffe_ya' })
const db = drizzle(pool, { schema })

async function seed() {
  console.log('Seeding database...')

  // 1. Create user
  const userId = uuid()
  const passwordHash = await hashPassword('admin123')
  await db.insert(schema.users).values({
    id: userId,
    name: 'Admin User',
    email: 'admin@caffe.ya',
    passwordHash,
    isActive: true,
  }).onConflictDoNothing()
  await db.insert(schema.accounts).values({
    id: `acc_${uuid().replace(/-/g, '').slice(0, 16)}`,
    userId: userId,
    accountId: 'admin@caffe.ya',
    providerId: 'credential',
    password: passwordHash,
  }).onConflictDoNothing()
  console.log('Created user:', userId)

  // 2. Create units
  const units = [
    { id: uuid(), name: 'gram', abbreviation: 'g' },
    { id: uuid(), name: 'kilogram', abbreviation: 'kg' },
    { id: uuid(), name: 'piece', abbreviation: 'pc' },
    { id: uuid(), name: 'milliliter', abbreviation: 'ml' },
    { id: uuid(), name: 'liter', abbreviation: 'L' },
  ]
  for (const u of units) {
    await db.insert(schema.units).values(u).onConflictDoNothing()
  }
  console.log('Created units')
  const [gUnit, , pcUnit, mlUnit] = units

  // 3. Create ingredients
  const ingredients = [
    { id: uuid(), name: 'Coffee Beans', nameAr: 'حبوب البن', unitId: gUnit.id, stockQty: '5000.000', costPerUnit: '0.500', lowStockThreshold: '1000.000' },
    { id: uuid(), name: 'Milk', nameAr: 'حليب', unitId: mlUnit.id, stockQty: '20000.000', costPerUnit: '0.150', lowStockThreshold: '5000.000' },
    { id: uuid(), name: 'Sugar', nameAr: 'سكر', unitId: gUnit.id, stockQty: '8000.000', costPerUnit: '0.100', lowStockThreshold: '2000.000' },
    { id: uuid(), name: 'Croissant', nameAr: 'كرواسون', unitId: pcUnit.id, stockQty: '50.000', costPerUnit: '1.500', lowStockThreshold: '10.000' },
    { id: uuid(), name: 'Espresso Beans', nameAr: 'بذور إسبريسو', unitId: gUnit.id, stockQty: '300.000', costPerUnit: '1.200', lowStockThreshold: '500.000' },
  ]
  for (const ing of ingredients) {
    await db.insert(schema.ingredients).values({ ...ing, isActive: true }).onConflictDoNothing()
  }
  console.log('Created ingredients')
  const [beansIng, milkIng, sugarIng, croissantIng, espressoIng] = ingredients

  // 4. Create product categories
  const categories = [
    { id: uuid(), name: 'Hot Drinks', nameAr: 'مشروبات ساخنة' },
    { id: uuid(), name: 'Cold Drinks', nameAr: 'مشروبات باردة' },
    { id: uuid(), name: 'Pastries', nameAr: 'معجنات' },
  ]
  for (const cat of categories) {
    await db.insert(schema.productCategories).values({ ...cat, isActive: true }).onConflictDoNothing()
  }
  console.log('Created categories')
  const [hotCat, coldCat, pastryCat] = categories

  // 5. Create products
  const products: Array<{ id: string; name: string; nameAr: string; categoryId: string; type: 'standard' | 'recipe' | 'service'; price: string; trackStock: boolean; stockQty: string; lowStockThreshold: string }> = [
    { id: uuid(), name: 'Espresso', nameAr: 'إسبريسو', categoryId: hotCat.id, type: 'standard', price: '1.500', trackStock: true, stockQty: '0', lowStockThreshold: '0' },
    { id: uuid(), name: 'Cappuccino', nameAr: 'كابتشينو', categoryId: hotCat.id, type: 'recipe', price: '3.000', trackStock: false, stockQty: '0', lowStockThreshold: '0' },
    { id: uuid(), name: 'Americano', nameAr: 'أمريكانو', categoryId: hotCat.id, type: 'standard', price: '2.000', trackStock: true, stockQty: '0', lowStockThreshold: '0' },
    { id: uuid(), name: 'Iced Latte', nameAr: 'لاتيه مثلج', categoryId: coldCat.id, type: 'recipe', price: '3.500', trackStock: false, stockQty: '0', lowStockThreshold: '0' },
    { id: uuid(), name: 'Croissant', nameAr: 'كرواسون', categoryId: pastryCat.id, type: 'standard', price: '2.000', trackStock: true, stockQty: '20.000', lowStockThreshold: '5.000' },
  ]
  for (const prod of products) {
    await db.insert(schema.products).values({ ...prod, isActive: true }).onConflictDoNothing()
  }
  console.log('Created products')
  const [espressoProd, cappuccinoProd, americanoProd, icedLatteProd, croissantProd] = products

  // 6. Recipe mappings for cappuccino
  await db.insert(schema.productIngredients).values([
    { id: uuid(), productId: cappuccinoProd.id, ingredientId: espressoIng.id, quantityUsed: '18.000' },
    { id: uuid(), productId: cappuccinoProd.id, ingredientId: milkIng.id, quantityUsed: '200.000' },
    { id: uuid(), productId: cappuccinoProd.id, ingredientId: sugarIng.id, quantityUsed: '5.000' },
  ]).onConflictDoNothing()

  // Recipe mappings for iced latte
  await db.insert(schema.productIngredients).values([
    { id: uuid(), productId: icedLatteProd.id, ingredientId: espressoIng.id, quantityUsed: '18.000' },
    { id: uuid(), productId: icedLatteProd.id, ingredientId: milkIng.id, quantityUsed: '250.000' },
  ]).onConflictDoNothing()

  console.log('Created recipe mappings')

  // 7. Resource categories
  const resCatId = uuid()
  await db.insert(schema.resourceCategories).values({
    id: resCatId,
    name: 'Gaming Stations',
    isTimed: true,
    hourlyRate: '2.000',
    minimumMinutes: 60,
    graceMinutes: 15,
  }).onConflictDoNothing()

  // 8. Resources (PS5/PC stations)
  const stations = [
    { id: uuid(), categoryId: resCatId, name: 'PS5 Station 1' },
    { id: uuid(), categoryId: resCatId, name: 'PS5 Station 2' },
    { id: uuid(), categoryId: resCatId, name: 'PC Station 1' },
  ]
  for (const s of stations) {
    await db.insert(schema.resources).values({ ...s, status: 'available' }).onConflictDoNothing()
  }
  console.log('Created resources')

  // 9. Expense categories
  const expCatId = uuid()
  await db.insert(schema.expenseCategories).values({
    id: expCatId,
    name: 'Utilities',
  }).onConflictDoNothing()
  console.log('Created expense categories')

  // 10. Create permissions
  const permissions = [
    { id: uuid(), key: 'admin.view', description: 'View admin panel', module: 'admin' },
    { id: uuid(), key: 'admin.manage_users', description: 'Manage users', module: 'admin' },
    { id: uuid(), key: 'admin.manage_roles', description: 'Manage roles', module: 'admin' },
    { id: uuid(), key: 'admin.settings', description: 'Manage settings', module: 'admin' },
  ]
  for (const perm of permissions) {
    await db.insert(schema.permissions).values(perm).onConflictDoNothing()
  }
  console.log('Created permissions')

  // 11. Create Super Admin role
  const superAdminRoleId = uuid()
  await db.insert(schema.roles).values({
    id: superAdminRoleId,
    name: 'Super Admin',
    description: 'Full access to all features',
  }).onConflictDoNothing()
  console.log('Created Super Admin role')

  // 12. Assign all permissions to Super Admin role
  for (const perm of permissions) {
    await db.insert(schema.rolePermissions).values({
      roleId: superAdminRoleId,
      permissionId: perm.id,
    }).onConflictDoNothing()
  }
  console.log('Assigned permissions to Super Admin role')

  // 13. Assign Super Admin role to admin user
  await db.insert(schema.userRoles).values({
    userId: userId,
    roleId: superAdminRoleId,
  }).onConflictDoNothing()
  console.log('Assigned Super Admin role to admin user')

  console.log('Seed complete!')
  await pool.end()
}

seed().catch(e => { console.error(e); process.exit(1) })
