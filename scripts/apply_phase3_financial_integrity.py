from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {relative_path}, found {count}\n--- OLD ---\n{old}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def write(relative_path: str, content: str) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


# ── Schema: durable costs, invariants, and race-proof indexes ──────────────────
replace_once(
    "src/lib/schema.ts",
    """  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
""",
    """  jsonb,
  check,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
""",
)
replace_once(
    "src/lib/schema.ts",
    """  notes:      text('notes'),
  approvedBy: text('approved_by').references(() => users.id),
})
""",
    """  notes:      text('notes'),
  approvedBy: text('approved_by').references(() => users.id),
}, (t) => ({
  openCashierUidx: uniqueIndex('shifts_open_cashier_uidx')
    .on(t.cashierId)
    .where(sql`${t.status} = 'open'`),
}))
""",
)
replace_once(
    "src/lib/schema.ts",
    """  stockQty:          numeric('stock_qty',           { precision: 12, scale: 3 }).default('0'),
  lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }).default('0'),

  localImageName:    text('local_image_name'),
""",
    """  stockQty:          numeric('stock_qty',           { precision: 12, scale: 3 }).default('0'),
  lowStockThreshold: numeric('low_stock_threshold', { precision: 12, scale: 3 }).default('0'),
  costPerUnit:       numeric('cost_per_unit',        { precision: 12, scale: 3 }).notNull().default('0'),

  localImageName:    text('local_image_name'),
""",
)
replace_once(
    "src/lib/schema.ts",
    """  // Positive = stock in, Negative = stock out
  quantity:     numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  note:         text('note'),
""",
    """  // Positive = stock in, Negative = stock out
  quantity:     numeric('quantity',   { precision: 12, scale: 3 }).notNull(),
  // Historical valuation snapshot. Required for new purchase/sale/refund movements.
  unitCost:     numeric('unit_cost',  { precision: 12, scale: 3 }),
  totalCost:    numeric('total_cost', { precision: 14, scale: 3 }),
  note:         text('note'),
""",
)
replace_once(
    "src/lib/schema.ts",
    """}, (t) => ({
  ingredientIdx: index('sm_ingredient_idx').on(t.ingredientId),
  orderIdx:      index('sm_order_idx').on(t.orderId),
}))
""",
    """}, (t) => ({
  ingredientIdx: index('sm_ingredient_idx').on(t.ingredientId),
  orderIdx:      index('sm_order_idx').on(t.orderId),
  unitCostNonnegative: check(
    'stock_movements_unit_cost_nonnegative_check',
    sql`${t.unitCost} IS NULL OR ${t.unitCost} >= 0`,
  ),
  totalCostNonnegative: check(
    'stock_movements_total_cost_nonnegative_check',
    sql`${t.totalCost} IS NULL OR ${t.totalCost} >= 0`,
  ),
}))
""",
)
replace_once(
    "src/lib/schema.ts",
    """}, (t) => ({
  shiftIdx:    index('orders_shift_idx').on(t.shiftId),
  resourceIdx: index('orders_resource_idx').on(t.resourceId),
}))
""",
    """}, (t) => ({
  shiftIdx:    index('orders_shift_idx').on(t.shiftId),
  resourceIdx: index('orders_resource_idx').on(t.resourceId),
  draftOrderUidx: uniqueIndex('orders_draft_cashier_shift_uidx')
    .on(t.shiftId, t.cashierId)
    .where(sql`${t.status} = 'draft'`),
  activeResourceUidx: uniqueIndex('orders_active_resource_uidx')
    .on(t.resourceId)
    .where(sql`${t.resourceId} IS NOT NULL AND ${t.status} IN ('draft', 'open')`),
}))
""",
)
replace_once(
    "src/lib/schema.ts",
    """export const purchaseItems = pgTable('purchase_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  purchaseId:   uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id),
  // If buying a finished product for resale (e.g. packaged drinks)
  productId:    uuid('product_id').references(() => products.id),
  quantity:     numeric('quantity',   { precision: 12, scale: 3 }).notNull(),
  unitCost:     numeric('unit_cost',  { precision: 12, scale: 3 }).notNull(),
  totalCost:    numeric('total_cost', { precision: 12, scale: 3 }).notNull(),
})
""",
    """export const purchaseItems = pgTable('purchase_items', {
  id:           uuid('id').primaryKey().defaultRandom(),
  purchaseId:   uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id),
  // If buying a finished product for resale (e.g. packaged drinks)
  productId:    uuid('product_id').references(() => products.id),
  quantity:     numeric('quantity',   { precision: 12, scale: 3 }).notNull(),
  unitCost:     numeric('unit_cost',  { precision: 12, scale: 3 }).notNull(),
  totalCost:    numeric('total_cost', { precision: 12, scale: 3 }).notNull(),
}, (t) => ({
  oneTarget: check(
    'purchase_items_one_target_check',
    sql`num_nonnulls(${t.ingredientId}, ${t.productId}) = 1`,
  ),
  positiveQuantity: check('purchase_items_positive_quantity_check', sql`${t.quantity} > 0`),
  nonnegativeCosts: check(
    'purchase_items_nonnegative_costs_check',
    sql`${t.unitCost} >= 0 AND ${t.totalCost} >= 0`,
  ),
}))
""",
)
replace_once(
    "src/lib/schema.ts",
    """export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  goodsReceiptId: uuid('goods_receipt_id').notNull().references(() => goodsReceipts.id, { onDelete: 'cascade' }),
  ingredientId:   uuid('ingredient_id').references(() => ingredients.id),
  productId:      uuid('product_id').references(() => products.id),
  quantity:       numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost:       numeric('unit_cost', { precision: 12, scale: 3 }).notNull(),
})
""",
    """export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  goodsReceiptId: uuid('goods_receipt_id').notNull().references(() => goodsReceipts.id, { onDelete: 'cascade' }),
  ingredientId:   uuid('ingredient_id').references(() => ingredients.id),
  productId:      uuid('product_id').references(() => products.id),
  quantity:       numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost:       numeric('unit_cost', { precision: 12, scale: 3 }).notNull(),
}, (t) => ({
  oneTarget: check(
    'goods_receipt_items_one_target_check',
    sql`num_nonnulls(${t.ingredientId}, ${t.productId}) = 1`,
  ),
  positiveQuantity: check('goods_receipt_items_positive_quantity_check', sql`${t.quantity} > 0`),
  nonnegativeCost: check('goods_receipt_items_nonnegative_cost_check', sql`${t.unitCost} >= 0`),
}))
""",
)

# ── Runtime imports that can execute under Node's native TypeScript test runner ─
write(
    "src/lib/db.ts",
    """import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from './env.ts'
import * as schema from './schema.ts'

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
})

export const db = drizzle(dbPool, { schema })

export type Database = typeof db
""",
)

write(
    "src/features/pos/_services/costing.ts",
    """import {
  addMoney,
  fromCents,
  multiplyDecimalMoney,
  multiplyDecimalMoneyMany,
  toCents,
  weightedAverageUnitCost,
} from '../../../lib/currency.ts'

export interface ReceivedCostRow {
  quantity: string
  unitCost: string
}

export interface RecipeCostRow {
  quantityUsed: string
  unitCost: string
}

export function calculateReceivedUnitCost(rows: ReceivedCostRow[]): string {
  let totalQuantity = '0.000'
  let unitCost = '0.000'

  for (const row of rows) {
    unitCost = weightedAverageUnitCost(totalQuantity, unitCost, row.quantity, row.unitCost)
    totalQuantity = addMoney(totalQuantity, row.quantity)
  }

  return unitCost
}

export function calculateStandardLineCost(unitCost: string, soldQuantity: string): string {
  return multiplyDecimalMoney(unitCost, soldQuantity)
}

export function calculateRecipeLineCost(
  ingredients: RecipeCostRow[],
  soldQuantity: string,
): string {
  const total = ingredients.reduce(
    (sum, ingredient) => sum + toCents(multiplyDecimalMoneyMany(
      ingredient.unitCost,
      ingredient.quantityUsed,
      soldQuantity,
    )),
    0,
  )
  return fromCents(total)
}
""",
)

# ── Purchases maintain live weighted-average valuation ─────────────────────────
replace_once(
    "src/features/procurement/_services/goodsReceiptService.ts",
    """import { db } from '@/lib/db'
import { auditLogs, chartOfAccounts, goodsReceiptItems, goodsReceipts, ingredients, journalEntries, journalEntryLines, products, purchases, purchaseItems, stockMovements } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { addMoney, weightedAverageUnitCost } from '@/lib/currency'
import type { GoodsReceiptRow } from '../_types'
""",
    """import { db } from '../../../lib/db.ts'
import { auditLogs, chartOfAccounts, goodsReceiptItems, goodsReceipts, ingredients, journalEntries, journalEntryLines, products, purchases, purchaseItems, stockMovements } from '../../../lib/schema.ts'
import { eq } from 'drizzle-orm'
import { addMoney, weightedAverageUnitCost } from '../../../lib/currency.ts'
import type { GoodsReceiptRow } from '../_types.ts'
""",
)
replace_once(
    "src/features/procurement/_services/goodsReceiptService.ts",
    """      } else if (item.productId) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        await tx.update(products).set({
          stockQty: addMoney(product.stockQty ?? '0', item.quantity),
        }).where(eq(products.id, item.productId))
      }
""",
    """      } else if (item.productId) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        const currentStockQty = product.stockQty ?? '0'
        await tx.update(products).set({
          stockQty: addMoney(currentStockQty, item.quantity),
          costPerUnit: weightedAverageUnitCost(
            currentStockQty,
            product.costPerUnit,
            item.quantity,
            item.unitCost,
          ),
        }).where(eq(products.id, item.productId))
      }
""",
)
replace_once(
    "src/features/procurement/_services/goodsReceiptService.ts",
    """      await tx.insert(stockMovements).values({
        ingredientId: item.ingredientId,
        productId: item.productId,
        type: 'purchase',
        quantity: item.quantity,
        purchaseId,
        createdBy: userId,
      })
""",
    """      await tx.insert(stockMovements).values({
        ingredientId: item.ingredientId,
        productId: item.productId,
        type: 'purchase',
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        purchaseId,
        createdBy: userId,
      })
""",
)

# ── Checkout snapshots exact inventory cost per movement and posts COGS ───────
replace_once(
    "src/features/pos/_services/orderService.ts",
    """import { db } from '@/lib/db'
import {
  auditLogs,
  chartOfAccounts,
  goodsReceiptItems,
  ingredients,
  journalEntries,
  journalEntryLines,
  orders,
  orderItems,
  productIngredients,
  products,
  resources,
  shifts,
  stockMovements,
  transactions,
} from '@/lib/schema'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { fromCents, multiplyDecimalMoney, toCents } from '@/lib/currency'
import { getPaymentAccountCode } from '@/lib/accounting'
import { calculateRecipeLineCost, calculateStandardLineCost } from './costing'
import { validatePayments, type PaymentLine } from './payment'
""",
    """import { db } from '../../../lib/db.ts'
import {
  auditLogs,
  chartOfAccounts,
  ingredients,
  journalEntries,
  journalEntryLines,
  orders,
  orderItems,
  productIngredients,
  products,
  resources,
  shifts,
  stockMovements,
  transactions,
} from '../../../lib/schema.ts'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { fromCents, multiplyDecimalMoney, multiplyDecimalMoneyMany, toCents } from '../../../lib/currency.ts'
import { getPaymentAccountCode } from '../../../lib/accounting.ts'
import { calculateStandardLineCost } from './costing.ts'
import { validatePayments, type PaymentLine } from './payment.ts'
""",
)
replace_once(
    "src/features/pos/_services/orderService.ts",
    """      if (item.product?.type === 'recipe') {
        const recipeRows = await tx.select().from(productIngredients)
          .where(eq(productIngredients.productId, item.productId))
        const recipeCosts: Array<{ quantityUsed: string; unitCost: string }> = []

        for (const recipeRow of recipeRows) {
          const [ingredient] = await tx.select().from(ingredients)
            .where(eq(ingredients.id, recipeRow.ingredientId)).for('update')
          if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')

          const deductionQuantity = multiplyDecimalMoney(recipeRow.quantityUsed, item.quantity)
          const deduction = toCents(deductionQuantity)
          const currentStock = toCents(ingredient.stockQty)
          if (currentStock < deduction) throw new Error('INSUFFICIENT_STOCK')

          await tx.update(ingredients).set({
            stockQty: fromCents(currentStock - deduction),
          }).where(eq(ingredients.id, recipeRow.ingredientId))
          await tx.insert(stockMovements).values({
            type: 'sale_deduction',
            quantity: fromCents(-deduction),
            ingredientId: recipeRow.ingredientId,
            productId: item.productId,
            orderId,
            createdBy: userId,
          })
          recipeCosts.push({
            quantityUsed: recipeRow.quantityUsed,
            unitCost: ingredient.costPerUnit ?? '0',
          })
        }

        costOfGoods += toCents(calculateRecipeLineCost(recipeCosts, item.quantity))
""",
    """      if (item.product?.type === 'recipe') {
        const recipeRows = await tx.select().from(productIngredients)
          .where(eq(productIngredients.productId, item.productId))

        for (const recipeRow of recipeRows) {
          const [ingredient] = await tx.select().from(ingredients)
            .where(eq(ingredients.id, recipeRow.ingredientId)).for('update')
          if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')

          const deductionQuantity = multiplyDecimalMoney(recipeRow.quantityUsed, item.quantity)
          const deduction = toCents(deductionQuantity)
          const currentStock = toCents(ingredient.stockQty)
          const unitCost = ingredient.costPerUnit ?? '0'
          if (currentStock < deduction) throw new Error('INSUFFICIENT_STOCK')
          if (deduction > 0 && toCents(unitCost) <= 0) throw new Error('INVENTORY_COST_NOT_CONFIGURED')

          const movementCost = multiplyDecimalMoneyMany(
            unitCost,
            recipeRow.quantityUsed,
            item.quantity,
          )
          await tx.update(ingredients).set({
            stockQty: fromCents(currentStock - deduction),
          }).where(eq(ingredients.id, recipeRow.ingredientId))
          await tx.insert(stockMovements).values({
            type: 'sale_deduction',
            quantity: fromCents(-deduction),
            unitCost,
            totalCost: movementCost,
            ingredientId: recipeRow.ingredientId,
            productId: item.productId,
            orderId,
            createdBy: userId,
          })
          costOfGoods += toCents(movementCost)
        }
""",
)
replace_once(
    "src/features/pos/_services/orderService.ts",
    """      } else if (item.product?.type === 'standard' && item.product.trackStock) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, item.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')

        const deduction = toCents(item.quantity)
        const currentStock = toCents(product.stockQty ?? '0')
        if (currentStock < deduction) throw new Error('INSUFFICIENT_STOCK')

        await tx.update(products).set({
          stockQty: fromCents(currentStock - deduction),
        }).where(eq(products.id, product.id))
        await tx.insert(stockMovements).values({
          type: 'sale_deduction',
          quantity: fromCents(-deduction),
          productId: product.id,
          orderId,
          createdBy: userId,
        })

        const receivedCosts = await tx.select({
          quantity: goodsReceiptItems.quantity,
          unitCost: goodsReceiptItems.unitCost,
        }).from(goodsReceiptItems).where(eq(goodsReceiptItems.productId, product.id))
        costOfGoods += toCents(calculateStandardLineCost(receivedCosts, item.quantity))
      }
""",
    """      } else if (item.product?.type === 'standard' && item.product.trackStock) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, item.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')

        const deduction = toCents(item.quantity)
        const currentStock = toCents(product.stockQty ?? '0')
        const unitCost = product.costPerUnit
        if (currentStock < deduction) throw new Error('INSUFFICIENT_STOCK')
        if (deduction > 0 && toCents(unitCost) <= 0) throw new Error('INVENTORY_COST_NOT_CONFIGURED')

        const movementCost = calculateStandardLineCost(unitCost, item.quantity)
        await tx.update(products).set({
          stockQty: fromCents(currentStock - deduction),
        }).where(eq(products.id, product.id))
        await tx.insert(stockMovements).values({
          type: 'sale_deduction',
          quantity: fromCents(-deduction),
          unitCost,
          totalCost: movementCost,
          productId: product.id,
          orderId,
          createdBy: userId,
        })
        costOfGoods += toCents(movementCost)
      }
""",
)

# ── Refunds restore quantity at historical cost and reverse exact sale COGS ───
replace_once(
    "src/features/pos/_services/voidService.ts",
    """import { db } from '@/lib/db'
import {
  auditLogs,
  chartOfAccounts,
  ingredients,
  journalEntries,
  journalEntryLines,
  orders,
  orderItems,
  products,
  resources,
  stockMovements,
  transactions,
} from '@/lib/schema'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { fromCents, toCents } from '@/lib/currency'
import { getPaymentAccountCode } from '@/lib/accounting'
import type { RefundableOrder } from '../_types'
import { isRefundableOrder } from './payment'
""",
    """import { db } from '../../../lib/db.ts'
import {
  auditLogs,
  chartOfAccounts,
  ingredients,
  journalEntries,
  journalEntryLines,
  orders,
  orderItems,
  products,
  resources,
  stockMovements,
  transactions,
} from '../../../lib/schema.ts'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { fromCents, toCents, weightedAverageUnitCost } from '../../../lib/currency.ts'
import { getPaymentAccountCode } from '../../../lib/accounting.ts'
import type { RefundableOrder } from '../_types.ts'
import { isRefundableOrder } from './payment.ts'
""",
)
replace_once(
    "src/features/pos/_services/voidService.ts",
    """    const deductions = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.type, 'sale_deduction')))
    for (const movement of deductions) {
      const restoredQuantity = -toCents(movement.quantity)
      if (restoredQuantity <= 0) continue

      if (movement.ingredientId) {
        const [ingredient] = await tx.select().from(ingredients)
          .where(eq(ingredients.id, movement.ingredientId)).for('update')
        if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')
        await tx.update(ingredients).set({
          stockQty: fromCents(toCents(ingredient.stockQty) + restoredQuantity),
        }).where(eq(ingredients.id, ingredient.id))
      } else if (movement.productId) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, movement.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        await tx.update(products).set({
          stockQty: fromCents(toCents(product.stockQty ?? '0') + restoredQuantity),
        }).where(eq(products.id, product.id))
      } else {
        continue
      }

      await tx.insert(stockMovements).values({
        ingredientId: movement.ingredientId,
        productId: movement.productId,
        orderId,
        type: 'adjustment',
        quantity: fromCents(restoredQuantity),
        note: `Refund: ${reason}`,
        createdBy: userId,
      })
    }

    const originalCostLines = await tx.select({ amount: journalEntryLines.amount })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(journalEntries.sourceType, 'order'),
        eq(journalEntries.sourceId, orderId),
        eq(chartOfAccounts.code, '5001'),
        eq(journalEntryLines.type, 'debit'),
      ))
    const costOfGoods = originalCostLines.reduce((sum, line) => sum + toCents(line.amount), 0)
""",
    """    const deductions = await tx.select().from(stockMovements)
      .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.type, 'sale_deduction')))
    if (deductions.some(movement => movement.unitCost === null || movement.totalCost === null)) {
      throw new Error('COST_HISTORY_MISSING')
    }

    const movementCost = deductions.reduce(
      (sum, movement) => sum + toCents(movement.totalCost!),
      0,
    )
    for (const movement of deductions) {
      const restoredQuantity = -toCents(movement.quantity)
      if (restoredQuantity <= 0) continue
      const restoredQuantityValue = fromCents(restoredQuantity)
      const restoredUnitCost = movement.unitCost!

      if (movement.ingredientId) {
        const [ingredient] = await tx.select().from(ingredients)
          .where(eq(ingredients.id, movement.ingredientId)).for('update')
        if (!ingredient) throw new Error('INGREDIENT_NOT_FOUND')
        await tx.update(ingredients).set({
          stockQty: fromCents(toCents(ingredient.stockQty) + restoredQuantity),
          costPerUnit: weightedAverageUnitCost(
            ingredient.stockQty,
            ingredient.costPerUnit ?? '0',
            restoredQuantityValue,
            restoredUnitCost,
          ),
        }).where(eq(ingredients.id, ingredient.id))
      } else if (movement.productId) {
        const [product] = await tx.select().from(products)
          .where(eq(products.id, movement.productId)).for('update')
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        const currentStock = product.stockQty ?? '0'
        await tx.update(products).set({
          stockQty: fromCents(toCents(currentStock) + restoredQuantity),
          costPerUnit: weightedAverageUnitCost(
            currentStock,
            product.costPerUnit,
            restoredQuantityValue,
            restoredUnitCost,
          ),
        }).where(eq(products.id, product.id))
      } else {
        continue
      }

      await tx.insert(stockMovements).values({
        ingredientId: movement.ingredientId,
        productId: movement.productId,
        orderId,
        type: 'adjustment',
        quantity: restoredQuantityValue,
        unitCost: restoredUnitCost,
        totalCost: movement.totalCost,
        note: `Refund: ${reason}`,
        createdBy: userId,
      })
    }

    const originalCostLines = await tx.select({ amount: journalEntryLines.amount })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
      .where(and(
        eq(journalEntries.sourceType, 'order'),
        eq(journalEntries.sourceId, orderId),
        eq(chartOfAccounts.code, '5001'),
        eq(journalEntryLines.type, 'debit'),
      ))
    const journalCost = originalCostLines.reduce((sum, line) => sum + toCents(line.amount), 0)
    if (journalCost !== movementCost) throw new Error('COST_HISTORY_MISMATCH')
    const costOfGoods = journalCost
""",
)

# ── Safe error classification ─────────────────────────────────────────────────
replace_once(
    "src/features/pos/_actions/checkout.ts",
    """  'INSUFFICIENT_STOCK', 'ACCOUNTING_NOT_CONFIGURED',
""",
    """  'INSUFFICIENT_STOCK', 'INVENTORY_COST_NOT_CONFIGURED', 'ACCOUNTING_NOT_CONFIGURED',
""",
)
replace_once(
    "src/features/pos/_actions/void.ts",
    """  'PAYMENT_NOT_FOUND', 'INGREDIENT_NOT_FOUND', 'PRODUCT_NOT_FOUND', 'ACCOUNTING_NOT_CONFIGURED',
""",
    """  'PAYMENT_NOT_FOUND', 'INGREDIENT_NOT_FOUND', 'PRODUCT_NOT_FOUND',
  'COST_HISTORY_MISSING', 'COST_HISTORY_MISMATCH', 'ACCOUNTING_NOT_CONFIGURED',
""",
)

# ── Product opening cost is editable and product deletion preserves history ───
replace_once(
    "src/features/inventory/_services/productService.ts",
    """  stockQty?: string
  lowStockThreshold?: string
  localImageName?: string
""",
    """  stockQty?: string
  lowStockThreshold?: string
  costPerUnit?: string
  localImageName?: string
""",
)
replace_once(
    "src/features/inventory/_services/productService.ts",
    """    stockQty: data.stockQty ?? '0',
    lowStockThreshold: data.lowStockThreshold ?? '0',
    localImageName: data.localImageName ?? null,
""",
    """    stockQty: data.stockQty ?? '0',
    lowStockThreshold: data.lowStockThreshold ?? '0',
    costPerUnit: data.costPerUnit ?? '0',
    localImageName: data.localImageName ?? null,
""",
)
replace_once(
    "src/features/inventory/_services/productService.ts",
    """    nameAr?: string
    categoryId?: string | null
""",
    """    nameAr?: string | null
    categoryId?: string | null
""",
)
replace_once(
    "src/features/inventory/_services/productService.ts",
    """    stockQty?: string
    lowStockThreshold?: string
    localImageName?: string | null
""",
    """    stockQty?: string
    lowStockThreshold?: string
    costPerUnit?: string
    localImageName?: string | null
""",
)
replace_once(
    "src/features/inventory/_services/productService.ts",
    """export async function deleteProduct(id: string): Promise<void> {
  await db.delete(products).where(eq(products.id, id))
}
""",
    """export async function deleteProduct(id: string): Promise<void> {
  const [product] = await db.update(products).set({ isActive: false }).where(eq(products.id, id)).returning()
  if (!product) throw new Error('NOT_FOUND')
}
""",
)

write(
    "src/features/inventory/_actions/productActions.ts",
    """'use server'

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  setProductRecipe,
} from '../_services/productService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/features/admin/_actions/adminActions'
import { toCents } from '@/lib/currency'

function normalizedMoney(value: string | null, fallback = '0'): string {
  const normalized = value?.trim() || fallback
  if (toCents(normalized) < 0) throw new Error('INVALID_INPUT')
  return normalized
}

export async function getProductsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.view')
  return getAllProducts()
}

export async function createProductAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  const name = (formData.get('name') as string | null)?.trim()
  const nameAr = (formData.get('nameAr') as string | null)?.trim()
  const categoryId = (formData.get('categoryId') as string | null)?.trim()
  const type = formData.get('type') as 'standard' | 'recipe' | 'service'
  const price = formData.get('price') as string | null
  const trackStock = type === 'standard' && formData.get('trackStock') === 'true'

  if (!name || !['standard', 'recipe', 'service'].includes(type)) return { error: 'INVALID_INPUT' }

  try {
    const normalizedPrice = normalizedMoney(price)
    if (toCents(normalizedPrice) <= 0) return { error: 'INVALID_INPUT' }
    await createProduct({
      name,
      nameAr: nameAr || undefined,
      categoryId: categoryId || undefined,
      type,
      price: normalizedPrice,
      trackStock,
      stockQty: trackStock ? normalizedMoney(formData.get('stockQty') as string | null) : '0',
      lowStockThreshold: trackStock ? normalizedMoney(formData.get('lowStockThreshold') as string | null) : '0',
      costPerUnit: trackStock ? normalizedMoney(formData.get('costPerUnit') as string | null) : '0',
      localImageName: (formData.get('localImageName') as string | null)?.trim() || undefined,
    })
    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'CREATE_PRODUCT_FAILED' }
  }
}

export async function updateProductAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  const productId = formData.get('productId') as string
  if (!productId) return { error: 'INVALID_INPUT' }

  try {
    const data: Parameters<typeof updateProduct>[1] = {}
    const name = formData.get('name') as string | null
    const nameAr = formData.get('nameAr') as string | null
    const categoryId = formData.get('categoryId') as string | null
    const type = formData.get('type') as 'standard' | 'recipe' | 'service' | null
    const price = formData.get('price') as string | null
    const trackStockValue = formData.get('trackStock') as string | null

    if (name !== null) {
      if (!name.trim()) return { error: 'INVALID_INPUT' }
      data.name = name.trim()
    }
    if (nameAr !== null) data.nameAr = nameAr.trim() || null
    if (categoryId !== null) data.categoryId = categoryId.trim() || null
    if (type !== null) {
      if (!['standard', 'recipe', 'service'].includes(type)) return { error: 'INVALID_INPUT' }
      data.type = type
    }
    if (price !== null) {
      const normalizedPrice = normalizedMoney(price)
      if (toCents(normalizedPrice) <= 0) return { error: 'INVALID_INPUT' }
      data.price = normalizedPrice
    }

    const tracked = (type ?? 'standard') === 'standard' && trackStockValue === 'true'
    if (trackStockValue !== null) data.trackStock = tracked
    if (formData.has('stockQty')) data.stockQty = tracked ? normalizedMoney(formData.get('stockQty') as string | null) : '0'
    if (formData.has('lowStockThreshold')) data.lowStockThreshold = tracked ? normalizedMoney(formData.get('lowStockThreshold') as string | null) : '0'
    if (formData.has('costPerUnit')) data.costPerUnit = tracked ? normalizedMoney(formData.get('costPerUnit') as string | null) : '0'
    if (formData.has('localImageName')) {
      data.localImageName = (formData.get('localImageName') as string | null)?.trim() || null
    }

    await updateProduct(productId, data)
    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'UPDATE_PRODUCT_FAILED' }
  }
}

export async function deleteProductAction(productId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  if (!productId) return { error: 'INVALID_INPUT' }

  try {
    await deleteProduct(productId)
    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'DELETE_PRODUCT_FAILED' }
  }
}

export async function setRecipeAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_products')

  const productId = formData.get('productId') as string
  const ingredientsJson = formData.get('ingredients') as string
  if (!productId || !ingredientsJson) return { error: 'INVALID_INPUT' }

  try {
    const ingredients = JSON.parse(ingredientsJson) as Array<{
      ingredientId: string
      quantityUsed: string
    }>
    await setProductRecipe(productId, ingredients)
    revalidatePath('/inventory')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'SET_RECIPE_FAILED' }
  }
}
""",
)

write(
    "src/features/inventory/_components/ProductModal.tsx",
    """"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/lib/navigation'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { ProductCategory, Product } from '@/features/inventory/_types'
import { createProductAction, updateProductAction } from '@/features/inventory/_actions/productActions'

interface ProductModalProps {
  categories: ProductCategory[]
  product?: Product
  editId?: string
}

export default function ProductModal({ categories, product, editId }: ProductModalProps) {
  const t = useTranslations('inventory')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: product?.name || '',
    nameAr: product?.nameAr || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'standard' as 'standard' | 'recipe' | 'service',
    price: product?.price || '',
    trackStock: product?.trackStock || false,
    stockQty: product?.stockQty || '0',
    lowStockThreshold: product?.lowStockThreshold || '0',
    costPerUnit: product?.costPerUnit || '0',
  })

  const handleClose = () => router.push('/inventory/products')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      if (editId) formData.set('productId', editId)
      formData.set('name', form.name)
      formData.set('nameAr', form.nameAr)
      formData.set('categoryId', form.categoryId)
      formData.set('type', form.type)
      formData.set('price', form.price)
      formData.set('trackStock', String(form.trackStock))
      formData.set('stockQty', form.stockQty)
      formData.set('lowStockThreshold', form.lowStockThreshold)
      formData.set('costPerUnit', form.costPerUnit)

      const result = editId
        ? await updateProductAction(formData)
        : await createProductAction(formData)
      if (result.error) {
        setError(result.error.replaceAll('_', ' '))
        return
      }
      router.push('/inventory/products')
      router.refresh()
    } catch (actionError) {
      console.error('Product save failed:', actionError)
      setError('SAVE FAILED')
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = categories.map(category => ({ value: category.id, label: category.name }))
  const tracksInventory = form.type === 'standard' && form.trackStock

  return (
    <Modal
      open
      onClose={handleClose}
      title={editId ? t('edit') : t('add')}
      footer={(
        <>
          <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('loading') : t('save')}
          </Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</div>}
        <Input label={t('name')} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required />
        <Input label={t('nameAr')} value={form.nameAr} onChange={event => setForm({ ...form, nameAr: event.target.value })} dir="rtl" />
        <Select
          label={t('categories')}
          options={categoryOptions}
          value={form.categoryId}
          onChange={event => setForm({ ...form, categoryId: event.target.value })}
          placeholder={t('selectCategory')}
        />
        <Select
          label={t('type')}
          options={[
            { value: 'standard', label: t('standard') },
            { value: 'recipe', label: t('recipe') },
            { value: 'service', label: t('service') },
          ]}
          value={form.type}
          onChange={event => {
            const type = event.target.value as 'standard' | 'recipe' | 'service'
            setForm({ ...form, type, trackStock: type === 'standard' ? form.trackStock : false })
          }}
        />
        <Input label={t('price')} type="number" min="0.001" step="0.001" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} required />
        {form.type === 'standard' && (
          <div className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              id="trackStock"
              className="h-5 w-5"
              checked={form.trackStock}
              onChange={event => setForm({ ...form, trackStock: event.target.checked })}
            />
            <label htmlFor="trackStock" className="text-sm text-on-surface">{t('tracked')}</label>
          </div>
        )}
        {tracksInventory && (
          <>
            <Input label={t('stock')} type="number" min="0" step="0.001" value={form.stockQty} onChange={event => setForm({ ...form, stockQty: event.target.value })} />
            <Input label={t('costPerUnit')} type="number" min="0" step="0.001" value={form.costPerUnit} onChange={event => setForm({ ...form, costPerUnit: event.target.value })} required />
            <Input label={t('lowThreshold')} type="number" min="0" step="0.001" value={form.lowStockThreshold} onChange={event => setForm({ ...form, lowStockThreshold: event.target.value })} />
          </>
        )}
      </form>
    </Modal>
  )
}
""",
)

# ── Seed data mirrors the new valuation model ─────────────────────────────────
replace_once(
    "seed.ts",
    """walletAccount: 'a0000000-0000-4000-8000-000000000009',
""",
    """walletAccount: 'a0000000-0000-4000-8000-000000000009', cogsAccount: 'a0000000-0000-4000-8000-000000000010',
""",
)
replace_once(
    "seed.ts",
    """    { id: ids.walletAccount, code: '1020', name: 'Mobile Wallet Clearing', nameAr: 'تسوية المحافظ الإلكترونية', type: 'asset' as const },
""",
    """    { id: ids.walletAccount, code: '1020', name: 'Mobile Wallet Clearing', nameAr: 'تسوية المحافظ الإلكترونية', type: 'asset' as const },
    { id: ids.cogsAccount, code: '5001', name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', type: 'cogs' as const },
""",
)
replace_once(
    "seed.ts",
    """      { id: ids.croissant, categoryId: ids.food, name: 'Butter Croissant', nameAr: 'كرواسون بالزبدة', type: 'standard', price: '5000', trackStock: true, stockQty: '24', lowStockThreshold: '6', localImageName: productImages.croissant },
""",
    """      { id: ids.croissant, categoryId: ids.food, name: 'Butter Croissant', nameAr: 'كرواسون بالزبدة', type: 'standard', price: '5000', trackStock: true, stockQty: '24', lowStockThreshold: '6', costPerUnit: '2500', localImageName: productImages.croissant },
""",
)
replace_once(
    "seed.ts",
    """    await tx.insert(schema.stockMovements).values([
      { ingredientId: ids.beans, type: 'opening_balance', quantity: '8500', note: 'Demo opening stock', createdBy: ids.manager },
      { ingredientId: ids.beans, type: 'sale_deduction', quantity: '-36', note: 'Demo sales usage', orderId: ids.orderClosed, createdBy: ids.cashier },
    ])
""",
    """    await tx.insert(schema.stockMovements).values([
      { ingredientId: ids.beans, type: 'opening_balance', quantity: '8500', unitCost: '18', totalCost: '153000', note: 'Demo opening stock', createdBy: ids.manager },
      { ingredientId: ids.beans, productId: ids.latte, type: 'sale_deduction', quantity: '-36', unitCost: '18', totalCost: '648', note: 'Demo sales usage', orderId: ids.orderClosed, createdBy: ids.cashier },
      { ingredientId: ids.milk, productId: ids.latte, type: 'sale_deduction', quantity: '-440', unitCost: '3', totalCost: '1320', note: 'Demo sales usage', orderId: ids.orderClosed, createdBy: ids.cashier },
      { ingredientId: ids.sugar, productId: ids.latte, type: 'sale_deduction', quantity: '-30', unitCost: '2', totalCost: '60', note: 'Demo sales usage', orderId: ids.orderClosed, createdBy: ids.cashier },
    ])
""",
)
replace_once(
    "seed.ts",
    """      { id: ids.salesAccount, code: '4001', name: 'Cafe Sales', nameAr: 'مبيعات المقهى', type: 'revenue' },
      { id: ids.expenseAccount, code: '6101', name: 'Utilities Expense', nameAr: 'مصروف الخدمات', type: 'expense' },
""",
    """      { id: ids.salesAccount, code: '4001', name: 'Cafe Sales', nameAr: 'مبيعات المقهى', type: 'revenue' },
      { id: ids.cogsAccount, code: '5001', name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', type: 'cogs' },
      { id: ids.expenseAccount, code: '6101', name: 'Utilities Expense', nameAr: 'مصروف الخدمات', type: 'expense' },
""",
)
replace_once(
    "seed.ts",
    """    await tx.insert(schema.journalEntryLines).values([
      { journalEntryId: ids.journal, accountId: ids.cardAccount, type: 'debit', amount: '16000', note: 'Card clearing' },
      { journalEntryId: ids.journal, accountId: ids.salesAccount, type: 'credit', amount: '16000', note: 'Cafe revenue' },
    ])
""",
    """    await tx.insert(schema.journalEntryLines).values([
      { journalEntryId: ids.journal, accountId: ids.cardAccount, type: 'debit', amount: '16000', note: 'Card clearing' },
      { journalEntryId: ids.journal, accountId: ids.salesAccount, type: 'credit', amount: '16000', note: 'Cafe revenue' },
      { journalEntryId: ids.journal, accountId: ids.cogsAccount, type: 'debit', amount: '2028', note: 'Demo COGS' },
      { journalEntryId: ids.journal, accountId: ids.inventoryAccount, type: 'credit', amount: '2028', note: 'Inventory issued' },
    ])
""",
)

# ── Unit tests reflect live unit cost instead of lifetime receipt averaging ────
write(
    "tests/unit/costing.test.ts",
    """import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateReceivedUnitCost,
  calculateRecipeLineCost,
  calculateStandardLineCost,
} from '../../src/features/pos/_services/costing.ts'

 test('received resale inventory uses weighted-average unit cost', () => {
  const receipts = [
    { quantity: '10', unitCost: '2000' },
    { quantity: '30', unitCost: '4000' },
  ]
  assert.equal(calculateReceivedUnitCost(receipts), '3500.000')
})

test('standard product COGS uses the current weighted-average unit cost', () => {
  assert.equal(calculateStandardLineCost('3500', '2'), '7000.000')
})

test('recipe cost includes every ingredient and sold quantity', () => {
  assert.equal(calculateRecipeLineCost([
    { unitCost: '18', quantityUsed: '18' },
    { unitCost: '3', quantityUsed: '160' },
  ], '2'), '1608.000')
})
""".replace("\n test(", "\ntest("),
)

# ── Migration: backfill safely, reject dirty invariants, then enforce them ─────
write(
    "drizzle/0005_financial_integrity.sql",
    """ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "cost_per_unit" numeric(12, 3) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_movements"
ADD COLUMN IF NOT EXISTS "unit_cost" numeric(12, 3);
--> statement-breakpoint
ALTER TABLE "stock_movements"
ADD COLUMN IF NOT EXISTS "total_cost" numeric(14, 3);
--> statement-breakpoint

WITH product_receipt_costs AS (
  SELECT
    "product_id",
    round(
      sum("quantity"::numeric * "unit_cost"::numeric)
      / nullif(sum("quantity"::numeric), 0),
      3
    ) AS "unit_cost"
  FROM "goods_receipt_items"
  WHERE "product_id" IS NOT NULL
    AND "quantity"::numeric > 0
  GROUP BY "product_id"
)
UPDATE "products" product
SET "cost_per_unit" = costs."unit_cost"
FROM product_receipt_costs costs
WHERE product."id" = costs."product_id"
  AND product."cost_per_unit" = 0;
--> statement-breakpoint

WITH purchase_costs AS (
  SELECT
    "purchase_id",
    "ingredient_id",
    "product_id",
    round(sum("total_cost"::numeric) / nullif(sum("quantity"::numeric), 0), 3) AS "unit_cost"
  FROM "purchase_items"
  WHERE "quantity"::numeric > 0
  GROUP BY "purchase_id", "ingredient_id", "product_id"
)
UPDATE "stock_movements" movement
SET
  "unit_cost" = costs."unit_cost",
  "total_cost" = round(abs(movement."quantity"::numeric) * costs."unit_cost", 3)
FROM purchase_costs costs
WHERE movement."type" = 'purchase'
  AND movement."purchase_id" = costs."purchase_id"
  AND movement."ingredient_id" IS NOT DISTINCT FROM costs."ingredient_id"
  AND movement."product_id" IS NOT DISTINCT FROM costs."product_id"
  AND movement."unit_cost" IS NULL;
--> statement-breakpoint

UPDATE "stock_movements" movement
SET
  "unit_cost" = ingredient."cost_per_unit",
  "total_cost" = round(abs(movement."quantity"::numeric) * ingredient."cost_per_unit"::numeric, 3)
FROM "ingredients" ingredient
WHERE movement."type" = 'opening_balance'
  AND movement."ingredient_id" = ingredient."id"
  AND movement."unit_cost" IS NULL;
--> statement-breakpoint

UPDATE "stock_movements" movement
SET
  "unit_cost" = product."cost_per_unit",
  "total_cost" = round(abs(movement."quantity"::numeric) * product."cost_per_unit"::numeric, 3)
FROM "products" product
WHERE movement."type" = 'opening_balance'
  AND movement."product_id" = product."id"
  AND movement."unit_cost" IS NULL;
--> statement-breakpoint

INSERT INTO "chart_of_accounts" ("code", "name", "name_ar", "type")
SELECT '5001', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'cogs'::"account_type"
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "name_ar" = EXCLUDED."name_ar",
  "type" = EXCLUDED."type";
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "shifts"
    WHERE "status" = 'open'
    GROUP BY "cashier_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one open shift per cashier: duplicate open shifts exist'
      USING HINT = 'Close or merge duplicate open shifts, then rerun the migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "orders"
    WHERE "status" = 'draft'
    GROUP BY "shift_id", "cashier_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one draft order per cashier and shift: duplicates exist'
      USING HINT = 'Cancel or merge duplicate drafts, then rerun the migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "orders"
    WHERE "resource_id" IS NOT NULL
      AND "status" IN ('draft', 'open')
    GROUP BY "resource_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one active order per resource: duplicate assignments exist'
      USING HINT = 'Transfer or cancel duplicate active resource orders, then rerun the migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "purchase_items"
    WHERE num_nonnulls("ingredient_id", "product_id") <> 1
       OR "quantity"::numeric <= 0
       OR "unit_cost"::numeric < 0
       OR "total_cost"::numeric < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce purchase item integrity: invalid purchase item rows exist'
      USING HINT = 'Each row must target exactly one ingredient/product and use positive quantity with nonnegative costs.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "goods_receipt_items"
    WHERE num_nonnulls("ingredient_id", "product_id") <> 1
       OR "quantity"::numeric <= 0
       OR "unit_cost"::numeric < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce goods receipt item integrity: invalid receipt rows exist'
      USING HINT = 'Each row must target exactly one ingredient/product and use positive quantity with nonnegative cost.';
  END IF;
END
$$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "shifts_open_cashier_uidx"
ON "shifts" ("cashier_id")
WHERE "status" = 'open';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_draft_cashier_shift_uidx"
ON "orders" ("shift_id", "cashier_id")
WHERE "status" = 'draft';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_active_resource_uidx"
ON "orders" ("resource_id")
WHERE "resource_id" IS NOT NULL
  AND "status" IN ('draft', 'open');
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_per_unit_nonnegative_check') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_cost_per_unit_nonnegative_check"
      CHECK ("cost_per_unit" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_unit_cost_nonnegative_check') THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_unit_cost_nonnegative_check"
      CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_total_cost_nonnegative_check') THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_total_cost_nonnegative_check"
      CHECK ("total_cost" IS NULL OR "total_cost" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_one_target_check') THEN
    ALTER TABLE "purchase_items"
      ADD CONSTRAINT "purchase_items_one_target_check"
      CHECK (num_nonnulls("ingredient_id", "product_id") = 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_positive_quantity_check') THEN
    ALTER TABLE "purchase_items"
      ADD CONSTRAINT "purchase_items_positive_quantity_check"
      CHECK ("quantity" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_nonnegative_costs_check') THEN
    ALTER TABLE "purchase_items"
      ADD CONSTRAINT "purchase_items_nonnegative_costs_check"
      CHECK ("unit_cost" >= 0 AND "total_cost" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_items_one_target_check') THEN
    ALTER TABLE "goods_receipt_items"
      ADD CONSTRAINT "goods_receipt_items_one_target_check"
      CHECK (num_nonnulls("ingredient_id", "product_id") = 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_items_positive_quantity_check') THEN
    ALTER TABLE "goods_receipt_items"
      ADD CONSTRAINT "goods_receipt_items_positive_quantity_check"
      CHECK ("quantity" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goods_receipt_items_nonnegative_cost_check') THEN
    ALTER TABLE "goods_receipt_items"
      ADD CONSTRAINT "goods_receipt_items_nonnegative_cost_check"
      CHECK ("unit_cost" >= 0);
  END IF;
END
$$;
""",
)

journal_path = ROOT / "drizzle/meta/_journal.json"
journal = json.loads(journal_path.read_text(encoding="utf-8"))
if not any(entry.get("tag") == "0005_financial_integrity" for entry in journal["entries"]):
    journal["entries"].append({
        "idx": 5,
        "version": "7",
        "when": 1785412800000,
        "tag": "0005_financial_integrity",
        "breakpoints": True,
    })
journal_path.write_text(json.dumps(journal, indent=2) + "\n", encoding="utf-8")

# ── A real PostgreSQL integration test: no skip-only green checks ──────────────
write(
    "tests/integration/financial-integrity.test.ts",
    """import assert from 'node:assert/strict'
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
import { isJournalBalanced, weightedAverageUnitCost } from '../../src/lib/currency.ts'
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

async function createPurchase(productId: string, quantity: string, unitCost: string, userId: string) {
  const totalCost = (Number(quantity) * Number(unitCost)).toFixed(3)
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

async function journalLines(sourceType: string, sourceId: string) {
  return db.select({
    journalId: journalEntries.id,
    code: chartOfAccounts.code,
    type: journalEntryLines.type,
    amount: journalEntryLines.amount,
  })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(chartOfAccounts, eq(journalEntryLines.accountId, chartOfAccounts.id))
    .where(and(eq(journalEntries.sourceType, sourceType), eq(journalEntries.sourceId, sourceId)))
}

test.before(resetDatabase)
test.after(async () => {
  await resetDatabase()
  await dbPool.end()
})

test('database invariants and sale/refund valuation remain exact across replenishment', async () => {
  const primaryUser = 'financial-integrity-cashier'
  const secondaryUser = 'financial-integrity-secondary'
  const thirdUser = 'financial-integrity-third'
  await db.insert(users).values([
    { id: primaryUser, name: 'Primary Cashier', email: 'fi-primary@example.test', emailVerified: true },
    { id: secondaryUser, name: 'Secondary Cashier', email: 'fi-secondary@example.test', emailVerified: true },
    { id: thirdUser, name: 'Third Cashier', email: 'fi-third@example.test', emailVerified: true },
  ])

  const accountRows = [
    { code: '1001', name: 'Cash', type: 'asset' as const },
    { code: '1010', name: 'Card Clearing', type: 'asset' as const },
    { code: '1020', name: 'Wallet Clearing', type: 'asset' as const },
    { code: '1201', name: 'Inventory', type: 'asset' as const },
    { code: '2001', name: 'Accounts Payable', type: 'liability' as const },
    { code: '4001', name: 'Sales', type: 'revenue' as const },
    { code: '5001', name: 'Cost of Goods Sold', type: 'cogs' as const },
  ]
  await db.insert(chartOfAccounts).values(accountRows)

  const [shift] = await db.insert(shifts).values({
    cashierId: primaryUser,
    openingFloat: '0',
  }).returning()
  await assert.rejects(() => db.insert(shifts).values({
    cashierId: primaryUser,
    openingFloat: '0',
  }))

  const [product] = await db.insert(products).values({
    name: 'Weighted Cost Product',
    type: 'standard',
    price: '5000',
    trackStock: true,
    stockQty: '1',
    costPerUnit: '1000',
  }).returning()

  const [constraintPurchase] = await db.insert(purchases).values({
    totalAmount: '1',
    isPaid: true,
    createdBy: primaryUser,
  }).returning()
  await assert.rejects(() => db.insert(purchaseItems).values({
    purchaseId: constraintPurchase.id,
    quantity: '1',
    unitCost: '1',
    totalCost: '1',
  }))

  await createPurchase(product.id, '10', '2000', primaryUser)
  const firstAverage = weightedAverageUnitCost('1', '1000', '10', '2000')
  assert.equal(firstAverage, '1909.091')
  const afterFirstReceipt = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  assert.equal(afterFirstReceipt?.stockQty, '11.000')
  assert.equal(afterFirstReceipt?.costPerUnit, firstAverage)

  const [order] = await db.insert(orders).values({
    shiftId: shift.id,
    cashierId: primaryUser,
    status: 'draft',
    subtotal: '10000',
    totalAmount: '10000',
  }).returning()
  await assert.rejects(() => db.insert(orders).values({
    shiftId: shift.id,
    cashierId: primaryUser,
    status: 'draft',
    subtotal: '0',
    totalAmount: '0',
  }))
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
  const [secondaryShift] = await db.insert(shifts).values({ cashierId: secondaryUser, openingFloat: '0' }).returning()
  const [thirdShift] = await db.insert(shifts).values({ cashierId: thirdUser, openingFloat: '0' }).returning()
  await db.insert(orders).values({
    shiftId: secondaryShift.id,
    cashierId: secondaryUser,
    resourceId: resource.id,
    status: 'open',
    subtotal: '0',
    totalAmount: '0',
  })
  await assert.rejects(() => db.insert(orders).values({
    shiftId: thirdShift.id,
    cashierId: thirdUser,
    resourceId: resource.id,
    status: 'open',
    subtotal: '0',
    totalAmount: '0',
  }))

  await checkoutOrder(order.id, [{ method: 'cash', amount: '10000' }], primaryUser)
  const afterSale = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  assert.equal(afterSale?.stockQty, '9.000')
  assert.equal(afterSale?.costPerUnit, firstAverage)

  const saleMovements = await db.select().from(stockMovements)
    .where(and(eq(stockMovements.orderId, order.id), eq(stockMovements.type, 'sale_deduction')))
  assert.equal(saleMovements.length, 1)
  assert.equal(saleMovements[0]?.unitCost, firstAverage)
  assert.equal(saleMovements[0]?.totalCost, '3818.182')

  const saleJournal = await journalLines('order', order.id)
  const saleByCode = new Map(saleJournal.map(line => [line.code, line]))
  assert.equal(saleByCode.get('1001')?.amount, '10000.000')
  assert.equal(saleByCode.get('4001')?.amount, '10000.000')
  assert.equal(saleByCode.get('5001')?.amount, '3818.182')
  assert.equal(saleByCode.get('1201')?.amount, '3818.182')
  assert.ok(isJournalBalanced(saleJournal.map(line => ({ type: line.type, amount: line.amount }))))

  await createPurchase(product.id, '10', '3000', primaryUser)
  const secondAverage = weightedAverageUnitCost('9', firstAverage, '10', '3000')
  const afterSecondReceipt = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  assert.equal(afterSecondReceipt?.stockQty, '19.000')
  assert.equal(afterSecondReceipt?.costPerUnit, secondAverage)

  await refundOrder(order.id, primaryUser, 'Integration refund', shift.id)
  const afterRefund = await db.query.products.findFirst({ where: eq(products.id, product.id) })
  const refundedAverage = weightedAverageUnitCost('19', secondAverage, '2', firstAverage)
  assert.equal(afterRefund?.stockQty, '21.000')
  assert.equal(afterRefund?.costPerUnit, refundedAverage)

  const refundMovements = await db.select().from(stockMovements)
    .where(and(eq(stockMovements.orderId, order.id), eq(stockMovements.type, 'adjustment')))
  assert.equal(refundMovements.length, 1)
  assert.equal(refundMovements[0]?.unitCost, firstAverage)
  assert.equal(refundMovements[0]?.totalCost, '3818.182')

  const refundJournal = await journalLines('refund', order.id)
  const refundByCode = new Map(refundJournal.map(line => [line.code, line]))
  assert.equal(refundByCode.get('4001')?.amount, '10000.000')
  assert.equal(refundByCode.get('1001')?.amount, '10000.000')
  assert.equal(refundByCode.get('1201')?.amount, '3818.182')
  assert.equal(refundByCode.get('5001')?.amount, '3818.182')
  assert.ok(isJournalBalanced(refundJournal.map(line => ({ type: line.type, amount: line.amount }))))

  const refundTransactions = await db.select().from(transactions)
    .where(eq(transactions.orderId, order.id))
  assert.equal(refundTransactions.filter(transaction => transaction.isRefund).length, 1)

  const receiptCount = await db.select().from(goodsReceipts)
  assert.equal(receiptCount.length, 2)
})
""",
)

print("Phase 3 financial integrity patch prepared successfully.")
