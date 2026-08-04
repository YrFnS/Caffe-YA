INSERT INTO "permissions" ("key", "description", "module")
SELECT 'pos.refund', 'Refund completed orders', 'pos'
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'pos.refund'
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
  AND r."name" IN ('Super Admin', 'Manager')
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p ON p."key" = 'pos.void_order'
WHERE EXISTS (SELECT 1 FROM "users" LIMIT 1)
  AND r."name" = 'Cashier'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id" AND rp."permission_id" = p."id"
  );
