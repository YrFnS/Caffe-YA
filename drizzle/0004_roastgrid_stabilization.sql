INSERT INTO "chart_of_accounts" ("code", "name", "name_ar", "type")
SELECT values_row."code", values_row."name", values_row."name_ar", values_row."type"::"account_type"
FROM (
  VALUES
    ('1010', 'Card Clearing', 'تسوية البطاقات', 'asset'),
    ('1020', 'Mobile Wallet Clearing', 'تسوية المحافظ الإلكترونية', 'asset')
) AS values_row("code", "name", "name_ar", "type")
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "name_ar" = EXCLUDED."name_ar",
  "type" = EXCLUDED."type";
--> statement-breakpoint
UPDATE "chart_of_accounts"
SET "name" = 'Cash', "name_ar" = 'النقد'
WHERE "code" = '1001'
  AND EXISTS (SELECT 1 FROM "users" LIMIT 1);
--> statement-breakpoint
INSERT INTO "permissions" ("key", "description", "module")
SELECT 'shifts.close_others', 'Close another cashier shift', 'shifts'
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
ON CONFLICT ("key") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "module" = EXCLUDED."module";
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'shifts.close_others'
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
  AND r."name" IN ('Super Admin', 'Manager')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" rp
    WHERE rp."role_id" = r."id"
      AND rp."permission_id" = p."id"
  );
--> statement-breakpoint
INSERT INTO "system_settings" ("key", "value")
SELECT 'shift_variance_approval_threshold', '"5000"'::jsonb
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "system_modules" ("module", "is_active")
SELECT 'admin', true
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
ON CONFLICT ("module") DO UPDATE
SET "is_active" = true, "updated_at" = now();
--> statement-breakpoint
DELETE FROM "role_permissions" older
USING "role_permissions" newer
WHERE older.ctid < newer.ctid
  AND older."role_id" = newer."role_id"
  AND older."permission_id" = newer."permission_id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_uidx"
ON "role_permissions" ("role_id", "permission_id");
--> statement-breakpoint
DELETE FROM "user_roles" older
USING "user_roles" newer
WHERE older.ctid < newer.ctid
  AND older."user_id" = newer."user_id"
  AND older."role_id" = newer."role_id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_role_uidx"
ON "user_roles" ("user_id", "role_id");
