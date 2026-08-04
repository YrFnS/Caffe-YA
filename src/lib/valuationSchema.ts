import { numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { products, stockMovements } from './schema.ts'

/**
 * Perpetual weighted-average valuation for tracked resale products.
 * Ingredients already keep their live average in ingredients.cost_per_unit.
 */
export const productInventoryCosts = pgTable('product_inventory_costs', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  unitCost: numeric('unit_cost', { precision: 12, scale: 3 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Immutable cost snapshot for every newly-created stock movement.
 * Refunds use this record rather than recalculating a historical sale at today's cost.
 */
export const stockMovementCosts = pgTable('stock_movement_costs', {
  movementId: uuid('movement_id')
    .primaryKey()
    .references(() => stockMovements.id, { onDelete: 'cascade' }),
  unitCost: numeric('unit_cost', { precision: 12, scale: 3 }).notNull(),
  totalCost: numeric('total_cost', { precision: 14, scale: 3 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
