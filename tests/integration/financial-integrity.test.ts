import assert from 'node:assert/strict'
import test from 'node:test'
import { and, eq } from 'drizzle-orm'
import { db, dbPool } from '../../src/lib/db.ts'
import {
  chartOfAccounts,
  goodsReceipts,
  journalEntries,
  journalEntryLines,
  orderItems,
  orders,
  products,
  purchaseItems,
  purchases,
  resourceCategories,
  resources,
  shifts,
  stockMovements,
  transactions,
  users,
} from '../../src/lib/schema.ts'
import { productInventoryCosts, stockMovementCosts } from '../../src/lib/valuationSchema.ts'
import {
  isJournalBalanced,
  multiplyDecimalMoney,
  weightedAverageUnitCost,
} from '../../src/lib/currency.ts'
import { receivePurchase } from '../../src/features/procurement/_services/goodsReceiptService.ts'
import { checkoutOrder } from '../../src/features/pos/_services/orderService.ts'
import { refundOrder } from '../../src/features/pos/_services/voidService.ts'

async function resetDatabase() {
  await dbPool.query(`
    DO $$
    DECLARE tables text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
      INTO tables
      FROM pg_tables
      WHERE schemaname = 'public';

      IF tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
      END IF;
    END
    $$;
  `)
}

async function createPurchase(
  productId: string,
  quantity: string,
  unitCost: string,
  userId: string,
) {
  const totalCost = multiplyDecimalMoney(unitCost, quantity)
  const [purchase] = await db.insert(purchases).values({
    totalAmount: totalCost,
    isPaid: true,
    createdBy: userId,
  }).returning()
  await db.insert(purchaseItems).values({
    purchaseId: purchase.id,
    productId,
    quantity,
    unitCost,
    totalCost,
  })
  await receivePurchase(purchase.id, userId)
  return purchase
}

async function getJournalLines(sourceType: string, sourceId: string) {
  return db.select({
    journalId: journalEntries.id,
    code: chartOfAccounts.code,
    type: journalEntryLines.type,
    amount: journalEntryLines.amount,
  })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(and(
      eq(journalEntries.sourceType, sourceType),
      eq(journalEntries.sourceId, sourceId),
    ))
}

test.before(resetDatabase)
test.after(async () => {
  await resetDatabase()
  await dbPool.end()
})

test('sale and refund preserve exact valuation after later replenishment', async () => {
  const primaryUser = 'financial-integrity-cashier'
  const secondaryUser = 'financial-integrity-secondary'
  const thirdUser = 'financial-integrity-third'
  await db.insert(users).values([
    { id: primaryUser, name: 'Primary Cashier', email: 'fi-primary@example.test', emailVerified: true },
    { id: secondaryUser, name: 'Secondary Cashier', email: 'fi-secondary@example.test', emailVerified: true },
    { id: thirdUser, name: 'Third Cashier', email: 'fi-third@example.test', emailVerified: true },
  ])

  await db.insert(chartOfAccounts).values([
    { code: '1001', name: 'Cash', type: 'asset' },
    { code: '1010', name: 'Card Clearing', type: 'asset' },
    { code: '1020', name: 'Wallet Clearing', type: 'asset' },
    { code: '1201', name: 'Inventory', type: 'asset' },
    { code: '2001', name: 'Accounts Payable', type: 'liability' },
    { code: '4001', name: 'Sales', type: 'revenue' },
    { code: '5001', name: 'Cost of Goods Sold', type: 'cogs' },
  ])

  const [shift] = await db.insert(shifts).values({
    cashierId: primaryUser,
    openingFloat: '0',
  }).returning()
  await assert.rejects(async () => {
    await db.insert(shifts).values({ cashierId: primaryUser, openingFloat: '0' })
  })

  const [product] = await db.insert(products).values({
    name: 'Weighted Cost Product',
    type: 'standard',
    price: '5000',
    trackStock: true,
    stockQty: '1',
  }).returning()
  await db.insert(productInventoryCosts).values({ productId: product.id, unitCost: '1000' })

  const [constraintPurchase] = await db.insert(purchases).values({
    totalAmount: '1',
    isPaid: true,
    createdBy: primaryUser,
  }).returning()
  await assert.rejects(async () => {
    await db.insert(purchaseItems).values({
      purchaseId: constraintPurchase.id,
      quantity: '1',
      unitCost: '1',
      totalCost: '1',
    })
  })

  await createPurchase(product.id, '10', '2000', primaryUser)
  const firstAverage = weightedAverageUnitCost('1', '1000', '10', '2000')
  assert.equal(firstAverage, '1909.091')
  const afterFirstReceipt = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  const firstValuation = await db.select().from(productInventoryCosts)
    .where(eq(productInventoryCosts.productId, product.id))
  assert.equal(afterFirstReceipt?.stockQty, '11.000')
  assert.equal(firstValuation[0]?.unitCost, firstAverage)

  const [order] = await db.insert(orders).values({
    shiftId: shift.id,
    cashierId: primaryUser,
    status: 'draft',
    subtotal: '10000',
    totalAmount: '10000',
  }).returning()
  await assert.rejects(async () => {
    await db.insert(orders).values({
      shiftId: shift.id,
      cashierId: primaryUser,
      status: 'draft',
      subtotal: '0',
      totalAmount: '0',
    })
  })
  await db.insert(orderItems).values({
    orderId: order.id,
    productId: product.id,
    quantity: '2',
    unitPrice: '5000',
    totalPrice: '10000',
  })

  const [resourceCategory] = await db.insert(resourceCategories).values({
    name: 'Constraint Test',
    isTimed: false,
  }).returning()
  const [resource] = await db.insert(resources).values({
    categoryId: resourceCategory.id,
    name: 'Unique Resource',
  }).returning()
  const [secondaryShift] = await db.insert(shifts).values({
    cashierId: secondaryUser,
    openingFloat: '0',
  }).returning()
  const [thirdShift] = await db.insert(shifts).values({
    cashierId: thirdUser,
    openingFloat: '0',
  }).returning()
  await db.insert(orders).values({
    shiftId: secondaryShift.id,
    cashierId: secondaryUser,
    resourceId: resource.id,
    status: 'open',
    subtotal: '0',
    totalAmount: '0',
  })
  await assert.rejects(async () => {
    await db.insert(orders).values({
      shiftId: thirdShift.id,
      cashierId: thirdUser,
      resourceId: resource.id,
      status: 'open',
      subtotal: '0',
      totalAmount: '0',
    })
  })

  await checkoutOrder(order.id, [{ method: 'cash', amount: '10000' }], primaryUser)
  const afterSale = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  assert.equal(afterSale?.stockQty, '9.000')

  const saleMovements = await db.select({
    movementId: stockMovements.id,
    unitCost: stockMovementCosts.unitCost,
    totalCost: stockMovementCosts.totalCost,
  }).from(stockMovements)
    .innerJoin(stockMovementCosts, eq(stockMovementCosts.movementId, stockMovements.id))
    .where(and(
      eq(stockMovements.orderId, order.id),
      eq(stockMovements.type, 'sale_deduction'),
    ))
  assert.equal(saleMovements.length, 1)
  assert.equal(saleMovements[0]?.unitCost, firstAverage)
  assert.equal(saleMovements[0]?.totalCost, '3818.182')

  const saleJournal = await getJournalLines('order', order.id)
  const saleByCode = new Map(saleJournal.map(line => [line.code, line]))
  assert.equal(saleByCode.get('1001')?.amount, '10000.000')
  assert.equal(saleByCode.get('4001')?.amount, '10000.000')
  assert.equal(saleByCode.get('5001')?.amount, '3818.182')
  assert.equal(saleByCode.get('1201')?.amount, '3818.182')
  assert.ok(isJournalBalanced(saleJournal.map(line => ({ type: line.type, amount: line.amount }))))

  await createPurchase(product.id, '10', '3000', primaryUser)
  const secondAverage = weightedAverageUnitCost('9', firstAverage, '10', '3000')
  const afterSecondReceipt = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  const secondValuation = await db.select().from(productInventoryCosts)
    .where(eq(productInventoryCosts.productId, product.id))
  assert.equal(afterSecondReceipt?.stockQty, '19.000')
  assert.equal(secondValuation[0]?.unitCost, secondAverage)

  await refundOrder(order.id, primaryUser, 'Integration refund', shift.id)
  const refundedAverage = weightedAverageUnitCost('19', secondAverage, '2', firstAverage)
  const afterRefund = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  const refundValuation = await db.select().from(productInventoryCosts)
    .where(eq(productInventoryCosts.productId, product.id))
  assert.equal(afterRefund?.stockQty, '21.000')
  assert.equal(refundValuation[0]?.unitCost, refundedAverage)

  const refundMovements = await db.select({
    movementId: stockMovements.id,
    unitCost: stockMovementCosts.unitCost,
    totalCost: stockMovementCosts.totalCost,
  }).from(stockMovements)
    .innerJoin(stockMovementCosts, eq(stockMovementCosts.movementId, stockMovements.id))
    .where(and(
      eq(stockMovements.orderId, order.id),
      eq(stockMovements.type, 'adjustment'),
    ))
  assert.equal(refundMovements.length, 1)
  assert.equal(refundMovements[0]?.unitCost, firstAverage)
  assert.equal(refundMovements[0]?.totalCost, '3818.182')

  const refundJournal = await getJournalLines('refund', order.id)
  const refundByCode = new Map(refundJournal.map(line => [line.code, line]))
  assert.equal(refundByCode.get('4001')?.amount, '10000.000')
  assert.equal(refundByCode.get('1001')?.amount, '10000.000')
  assert.equal(refundByCode.get('1201')?.amount, '3818.182')
  assert.equal(refundByCode.get('5001')?.amount, '3818.182')
  assert.ok(isJournalBalanced(refundJournal.map(line => ({ type: line.type, amount: line.amount }))))

  const refundTransactions = await db.select().from(transactions)
    .where(eq(transactions.orderId, order.id))
  assert.equal(refundTransactions.filter(transaction => transaction.isRefund).length, 1)

  const receiptRows = await db.select().from(goodsReceipts)
  assert.equal(receiptRows.length, 2)
})
