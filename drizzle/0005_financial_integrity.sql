CREATE TABLE IF NOT EXISTS "product_inventory_costs" (
  "product_id" uuid PRIMARY KEY NOT NULL,
  "unit_cost" numeric(12, 3) NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "product_inventory_costs_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "product_inventory_costs_unit_cost_nonnegative_check"
    CHECK ("unit_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movement_costs" (
  "movement_id" uuid PRIMARY KEY NOT NULL,
  "unit_cost" numeric(12, 3) NOT NULL,
  "total_cost" numeric(14, 3) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stock_movement_costs_movement_id_stock_movements_id_fk"
    FOREIGN KEY ("movement_id") REFERENCES "public"."stock_movements"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "stock_movement_costs_unit_cost_nonnegative_check"
    CHECK ("unit_cost" >= 0),
  CONSTRAINT "stock_movement_costs_total_cost_nonnegative_check"
    CHECK ("total_cost" >= 0)
);
--> statement-breakpoint

-- A product with no historical sale can be initialized safely from its receipts.
-- Products that were already sold are deliberately left unvalued for manual reconciliation.
INSERT INTO "product_inventory_costs" ("product_id", "unit_cost")
SELECT
  receipt_item."product_id",
  round(
    sum(receipt_item."quantity"::numeric * receipt_item."unit_cost"::numeric)
    / nullif(sum(receipt_item."quantity"::numeric), 0),
    3
  )
FROM "goods_receipt_items" receipt_item
WHERE receipt_item."product_id" IS NOT NULL
  AND receipt_item."quantity"::numeric > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "stock_movements" movement
    WHERE movement."product_id" = receipt_item."product_id"
      AND movement."type" = 'sale_deduction'
  )
GROUP BY receipt_item."product_id"
ON CONFLICT ("product_id") DO NOTHING;
--> statement-breakpoint

-- Purchase movements have trustworthy source costs and can be backfilled exactly.
WITH purchase_costs AS (
  SELECT
    "purchase_id",
    "ingredient_id",
    "product_id",
    round(
      sum("total_cost"::numeric) / nullif(sum("quantity"::numeric), 0),
      3
    ) AS "unit_cost"
  FROM "purchase_items"
  WHERE "quantity"::numeric > 0
  GROUP BY "purchase_id", "ingredient_id", "product_id"
)
INSERT INTO "stock_movement_costs" ("movement_id", "unit_cost", "total_cost")
SELECT
  movement."id",
  costs."unit_cost",
  round(abs(movement."quantity"::numeric) * costs."unit_cost", 3)
FROM "stock_movements" movement
JOIN purchase_costs costs
  ON movement."purchase_id" = costs."purchase_id"
 AND movement."ingredient_id" IS NOT DISTINCT FROM costs."ingredient_id"
 AND movement."product_id" IS NOT DISTINCT FROM costs."product_id"
WHERE movement."type" = 'purchase'
ON CONFLICT ("movement_id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "chart_of_accounts" ("code", "name", "name_ar", "type")
VALUES ('5001', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'cogs')
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
      USING HINT = 'Close or consolidate duplicate open shifts, then rerun the migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "orders"
    WHERE "status" = 'draft'
    GROUP BY "shift_id", "cashier_id"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one draft order per cashier and shift: duplicates exist'
      USING HINT = 'Cancel or consolidate duplicate draft orders, then rerun the migration.';
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
       OR "total_cost"::numeric <> round("quantity"::numeric * "unit_cost"::numeric, 3)
  ) THEN
    RAISE EXCEPTION 'Cannot enforce purchase item integrity: invalid purchase item rows exist'
      USING HINT = 'Each row must target exactly one ingredient/product and have a positive quantity with matching nonnegative costs.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "goods_receipt_items"
    WHERE num_nonnulls("ingredient_id", "product_id") <> 1
       OR "quantity"::numeric <= 0
       OR "unit_cost"::numeric < 0
  ) THEN
    RAISE EXCEPTION 'Cannot enforce goods receipt item integrity: invalid receipt rows exist'
      USING HINT = 'Each row must target exactly one ingredient/product and have a positive quantity with nonnegative cost.';
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

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_total_matches_check') THEN
    ALTER TABLE "purchase_items"
      ADD CONSTRAINT "purchase_items_total_matches_check"
      CHECK ("total_cost" = round("quantity" * "unit_cost", 3));
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
