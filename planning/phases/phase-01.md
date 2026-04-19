# Phase 1: Project Setup & Foundation

## Goal
Establish the development environment, initialize the Next.js application with the chosen stack, configure database access, set up authentication, implement internationalization, and create the base layout shell.

## What Ships
- Next.js 16 App Router project with TypeScript
- PostgreSQL database connected via Drizzle ORM
- Better Auth configured with credentials provider
- next-intl set up with Arabic (ar) and English (en) locales
- Base layout with responsive sidebar navigation
- Tailwind CSS + shadcn/ui components
- Environment validation with Zod
- Basic error.tsx and loading.tsx for root layout

## Completed On
- 2026-04-19

---

## Steps

### Step 1: Initialize Next.js Project
```bash
npx create-next-app@latest caffe-ya --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --yes
```

### Step 2: Install Core Dependencies
```bash
npm install drizzle-orm drizzle-zod better-auth postgres zod next-intl lucide-react clsx tailwind-merge class-variance-authority @tanstack/react-query
npm install -D drizzle-kit @types/pg
```

### Step 3: Configure Environment Variables
Create `.env.local`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/caffe_ya
BETTER_AUTH_SECRET=your-super-secret-key-change-in-production-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
```

Create `src/lib/env.ts`:
- Validate all required env vars with Zod on startup
- Throw if any required var is missing

### Step 4: Set Up Drizzle with PostgreSQL
- Create `src/lib/db.ts` for the database connection
- Copy/refine schema from `schema.ts` to `src/lib/schema.ts`
- Run `npx drizzle-kit generate` to create migrations
- Apply migrations with `npx drizzle-kit push`

### Step 5: Configure Better Auth
- Create `src/lib/auth.ts` with Better Auth configuration
- Use drizzle adapter for PostgreSQL
- Enable email/password credentials provider
- Note: `better-auth/drizzle-adapter` not available - using core package

### Step 6: Set Up next-intl
- Create `src/lib/i18n.ts` for i18n configuration
- Create `src/lib/routing.ts` for routing configuration
- Create locale files: `src/messages/en.json` and `src/messages/ar.json`
- Configure Arabic (RTL) and English locales
- Test: access `/en/...` and `/ar/...` routes

### Step 7: Install and Configure shadcn/ui
Manual installation (shadcn init interactive issues):
- Create `src/components/ui/button.tsx`
- Create `src/components/ui/input.tsx`
- Configure with design tokens from DESIGN.md in `src/app/globals.css`

### Step 8: Create Base Layout
- Create `(protected)` route group at `app/[locale]/(protected)/`
- Build a responsive sidebar in `(protected)/layout.tsx`:
  - Logo and shop name ("Caffe-YA")
  - Navigation links (13 modules)
  - Language toggle (EN/العربية)
  - User menu (profile, logout)
- Apply the design system's colors and typography
- Ensure RTL works correctly for Arabic (use `border-s`, not `border-e`)

### Step 9: Create Root Error & Loading States
- Add `app/[locale]/error.tsx` with localized error UI
- Add `app/[locale]/loading.tsx` with skeleton loader

### Step 10: Set Up Docker for PostgreSQL

Create `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: caffe-ya-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: caffe_ya
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
    name: caffe-ya-postgres
```

Start the container:
```bash
docker compose up -d
```

### Step 11: Generate and Apply Migrations
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Step 12: Verify Build
```bash
npm run build  # must pass with zero type errors
npm run lint   # zero warnings
```

---

## Project Structure
```
caffe-ya/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (protected)/
│   │   │   │   ├── layout.tsx      # Sidebar + main
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx
│   │   │   ├── layout.tsx          # Root layout with fonts/i18n
│   │   │   ├── page.tsx           # Redirect to dashboard
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── (auth)/
│   │   │   └── layout.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       └── input.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── env.ts
│   │   ├── i18n.ts
│   │   ├── routing.ts
│   │   ├── schema.ts
│   │   └── utils.ts
│   └── messages/
│       ├── ar.json
│       └── en.json
├── .env.local
├── docker-compose.yml
├── drizzle.config.ts
└── package.json
```

---

## Database Schema (32 Tables)
- `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
- `partners`, `partner_equity_entries`
- `resource_categories`, `resources`
- `shifts`
- `units`, `ingredients`, `products`, `product_categories`, `product_ingredients`, `stock_movements`
- `orders`, `order_items`, `transactions`
- `expense_categories`, `expenses`
- `vendors`, `purchases`, `purchase_items`
- `employees`, `payroll_entries`
- `chart_of_accounts`, `journal_entries`, `journal_entry_lines`
- `system_settings`, `system_modules`
- `audit_logs`

Enums: `resource_status`, `order_status`, `payment_method`, `product_type`, `shift_status`, `equity_entry_type`, `stock_movement_type`, `account_type`, `journal_line_type`

---

## Success Criteria
- [x] `npm run build` passes with zero type errors
- [x] Sidebar navigation renders in both English and Arabic
- [x] RTL layout works when switching to Arabic
- [x] Database tables created via migrations (32 tables)
- [x] Environment variables validated on startup

## Known Limitations
- Auth flow not tested (requires dev server running)
- `better-auth/drizzle-adapter` not available, used core package instead

---

## Dependencies
- Phase 2 (POS, Resources)

## Commands
```bash
# Start development
npm run dev

# Start PostgreSQL
docker compose up -d

# Stop PostgreSQL
docker compose down

# Generate migrations
npx drizzle-kit generate

# Push migrations to DB
npx drizzle-kit push
```