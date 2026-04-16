# Phase 1: Project Setup & Foundation

## Goal
Establish the development environment, initialize the Next.js application with the chosen stack, configure database access, set up authentication, implement internationalization, and create the base layout shell.

## What Ships
- Next.js 16 App Router project with TypeScript
- PostgreSQL database connected via Drizzle ORM
- Better Auth configured with credentials provider
- next-intl set up with Arabic (ar) and English (en) locales
- Base layout with responsive sidebar navigation
- Tailwind CSS + shadcn/ui installed and configured
- Environment validation with Zod
- Basic error.tsx and loading.tsx for root layout

## Steps

### Step 1: Initialize Next.js Project
```bash
npx create-next-app@latest caffe-ya --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```
- Choose: Yes to TypeScript, Tailwind, ESLint, App Router, src directory, import alias @/*

### Step 2: Install Core Dependencies
```bash
npm install drizzle-orm drizzle-zod better-auth better-auth-react better-auth/drizzle-adapter postgres zod next-intl lucide-react @tanstack/react-query clsx tailwind-merge class-variance-authority
npm install -D drizzle-kit @types/node
```

### Step 3: Configure Environment Variables
Create `.env.local`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/caffe_ya
BETTER_AUTH_SECRET=your-32-char-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
```

Create `src/lib/env.ts`:
- Validate all required env vars with Zod on startup
- Throw if any required var is missing

### Step 4: Set Up Drizzle with PostgreSQL
- Create `src/lib/db.ts` for the database connection
- Create `src/lib/schema.ts` (copy/refine from existing schema.ts)
- Run `drizzle-kit generate` to create migrations
- Apply migrations to the database

### Step 5: Configure Better Auth
- Create `src/lib/auth.ts` with Better Auth configuration
- Use drizzle adapter for PostgreSQL
- Enable email/password credentials provider
- Create auth client and server-side helpers

### Step 6: Set Up next-intl
- Create `src/i18n.ts` for i18n configuration
- Create locale files: `messages/en.json` and `messages/ar.json`
- Configure Arabic (RTL) and English locales
- Test: access `/en/...` and `/ar/...` routes

### Step 7: Install and Configure shadcn/ui
```bash
npx shadcn@latest init
```
- Configure with the design tokens from DESIGN.md
- Install key components: Button, Input, Card, Dialog, Sheet, Table, Badge, etc.

### Step 8: Create Base Layout
- Create `(protected)` and `(auth)` route groups in `app/`
- Build a responsive sidebar with:
  - Logo and shop name
  - Navigation links
  - Language toggle (ar/en)
  - User menu (profile, logout)
- Apply the design system's colors and typography
- Ensure RTL works correctly for Arabic

### Step 9: Create Root Error & Loading States
- Add `app/error.tsx` with localized error UI
- Add `app/loading.tsx` with skeleton loader

### Step 10: Verify Build
- Run `npm run build` — must pass with zero errors
- Run `npm run lint` — zero warnings
- Verify dev server starts and auth flow works

## Success Criteria
- [ ] `npm run build` passes with zero type errors
- [ ] User can sign up / sign in with email + password
- [ ] Sidebar navigation renders in both English and Arabic
- [ ] RTL layout works when switching to Arabic
- [ ] Database tables created via migrations
- [ ] Environment variables validated on startup

## Dependencies
- Phase 2 (POS, Resources)