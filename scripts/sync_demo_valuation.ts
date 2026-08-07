import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { and, eq } from 'drizzle-orm'
import { db, dbPool } from '../src/lib/db.ts'
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  stockMovements,
} from '../src/lib/schema.ts'
import { productInventoryCosts, stockMovementCosts } from '../src/lib/valuationSchema.ts'

const ids = {
  croissant: '70000000-0000-4000-8000-000000000004',
  latte: '70000000-0000-4000-8000-000000000003',
  orderClosed: '80000000-0000-4000-8000-000000000001',
  beans: '50000000-0000-4000-8000-000000000001',
  milk: '50000000-0000-4000-8000-000000000002',
  sugar: '50000000-0000-4000-8000-000000000003',
  inventoryAccount: 'a0000000-0000-4000-8000-000000000002',
  journal: 'a0000000-0000-4000-8000-000000000005',
  cogsAccount: 'a0000000-0000-4000-8000-000000000010',
  movementOpening: '81000000-0000-4000-8000-000000000001',
  movementPurchase: '81000000-0000-4000-8000-000000000003',
  movementWastage: '81000000-0000-4000-8000-000000000004',
  movementAdjustment: '81000000-0000-4000-8000-000000000005',
  cashier: 'demo-cashier',
}

async function ensureMovementCost(
  ingredientId: string,
  quantity: string,
  unitCost: string,
  totalCost: string,
) {
  let [movement] = await db.select().from(stockMovements).where(and(
    eq(stockMovements.orderId, ids.orderClosed),
    eq(stockMovements.type, 'sale_deduction'),
    eq(stockMovements.ingredientId, ingredientId),
  )).limit(1)

  if (!movement) {
    [movement] = await db.insert(stockMovements).values({
      ingredientId,
      productId: ids.latte,
      type: 'sale_deduction',
      quantity,
      note: 'Demo sales usage',
      orderId: ids.orderClosed,
      createdBy: ids.cashier,
    }).returning()
  }

  await db.insert(stockMovementCosts).values({
    movementId: movement.id,
    unitCost,
    totalCost,
  }).onConflictDoUpdate({
    target: stockMovementCosts.movementId,
    set: { unitCost, totalCost },
  })
}

async function syncDemoValuation() {
  const [cogsAccount] = await db.insert(chartOfAccounts).values({
    id: ids.cogsAccount,
    code: '5001',
    name: 'Cost of Goods Sold',
    nameAr: 'تكلفة البضاعة المباعة',
    type: 'cogs',
  }).onConflictDoUpdate({
    target: chartOfAccounts.code,
    set: {
      name: 'Cost of Goods Sold',
      nameAr: 'تكلفة البضاعة المباعة',
      type: 'cogs',
    },
  }).returning({ id: chartOfAccounts.id })

  await db.insert(productInventoryCosts).values({
    productId: ids.croissant,
    unitCost: '2500',
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: productInventoryCosts.productId,
    set: { unitCost: '2500', updatedAt: new Date() },
  })

  await ensureMovementCost(ids.beans, '-36', '18', '648')
  await ensureMovementCost(ids.milk, '-440', '3', '1320')
  await ensureMovementCost(ids.sugar, '-30', '2', '60')
  await db.insert(stockMovementCosts).values([
    { movementId: ids.movementOpening, unitCost: '18', totalCost: '153000' },
    { movementId: ids.movementPurchase, unitCost: '72', totalCost: '360000' },
    { movementId: ids.movementWastage, unitCost: '3', totalCost: '750' },
    { movementId: ids.movementAdjustment, unitCost: '2', totalCost: '200' },
  ]).onConflictDoNothing()

  const [journal] = await db.select().from(journalEntries)
    .where(eq(journalEntries.id, ids.journal))
  if (journal) {
    const [cogsLine] = await db.select().from(journalEntryLines).where(and(
      eq(journalEntryLines.journalEntryId, journal.id),
      eq(journalEntryLines.accountId, cogsAccount.id),
      eq(journalEntryLines.type, 'debit'),
    )).limit(1)
    if (!cogsLine) {
      await db.insert(journalEntryLines).values({
        journalEntryId: journal.id,
        accountId: cogsAccount.id,
        type: 'debit',
        amount: '2028',
        note: 'Demo COGS',
      })
    }

    const [inventoryLine] = await db.select().from(journalEntryLines).where(and(
      eq(journalEntryLines.journalEntryId, journal.id),
      eq(journalEntryLines.accountId, ids.inventoryAccount),
      eq(journalEntryLines.type, 'credit'),
    )).limit(1)
    if (!inventoryLine) {
      await db.insert(journalEntryLines).values({
        journalEntryId: journal.id,
        accountId: ids.inventoryAccount,
        type: 'credit',
        amount: '2028',
        note: 'Demo inventory issued',
      })
    }
  }

  console.log('Demo valuation synchronized: COGS, resale cost, movement snapshots, and journals are ready.')
}

syncDemoValuation().catch(error => {
  console.error(error)
  process.exitCode = 1
}).finally(() => dbPool.end())
