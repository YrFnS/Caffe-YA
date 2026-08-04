ALTER TYPE "public"."order_status" ADD VALUE 'draft';--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_paid_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_voided_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_cashier_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "partner_equity_entries" DROP CONSTRAINT "partner_equity_entries_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "partners" DROP CONSTRAINT "partners_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "payroll_entries" DROP CONSTRAINT "payroll_entries_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_cashier_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_approved_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT "stock_movements_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "system_modules" DROP CONSTRAINT "system_modules_updated_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "system_settings" DROP CONSTRAINT "system_settings_updated_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_refunded_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "paid_by" SET DATA TYPE text USING "paid_by"::text;--> statement-breakpoint
ALTER TABLE "journal_entries" ALTER COLUMN "created_by" SET DATA TYPE text USING "created_by"::text;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "voided_by" SET DATA TYPE text USING "voided_by"::text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "cashier_id" SET DATA TYPE text USING "cashier_id"::text;--> statement-breakpoint
ALTER TABLE "partner_equity_entries" ALTER COLUMN "created_by" SET DATA TYPE text USING "created_by"::text;--> statement-breakpoint
ALTER TABLE "partners" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "payroll_entries" ALTER COLUMN "created_by" SET DATA TYPE text USING "created_by"::text;--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "created_by" SET DATA TYPE text USING "created_by"::text;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "cashier_id" SET DATA TYPE text USING "cashier_id"::text;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "approved_by" SET DATA TYPE text USING "approved_by"::text;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "created_by" SET DATA TYPE text USING "created_by"::text;--> statement-breakpoint
ALTER TABLE "system_modules" ALTER COLUMN "updated_by" SET DATA TYPE text USING "updated_by"::text;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "updated_by" SET DATA TYPE text USING "updated_by"::text;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "refunded_by" SET DATA TYPE text USING "refunded_by"::text;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "user_id" SET DATA TYPE text USING "user_id"::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_equity_entries" ADD CONSTRAINT "partner_equity_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_modules" ADD CONSTRAINT "system_modules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refunded_by_users_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;