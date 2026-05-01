@AGENTS.md

---

## Project Context

### Stack
- **Framework:** Next.js 16 App Router, React 19, TypeScript
- **Database:** PostgreSQL (Docker), Drizzle ORM
- **Auth:** Better Auth
- **Styling:** Tailwind v4 with MD 3 Material Design tokens
- **i18n:** next-intl (en, ar with RTL)
- **Package manager:** npm

### Commands
- Start DB: `docker compose up -d`
- Dev server: `npm run dev` (from repo root)
- Build: `npm run build`
- Lint: `npm run lint`
- Schema migration: `npx drizzle-kit generate && npx drizzle-kit push`

### Layout
- Source: `src/`
- Features: `src/features/[domain]/`
- UI components: `src/components/ui/`
- Schema: `src/lib/schema.ts`
- Messages: `src/messages/en.json`, `src/messages/ar.json`

### Key Conventions
- Financial amounts: `numeric` with 3 decimal places (NOT float)
- Path alias: `@/*` → `./src/*`
- RTL: use `start`/`end` not `left`/`right` in Tailwind
- Server Components by default; push `'use client'` to leaf components

---

## Project Learnings

*(Accumulated corrections — agent appends here after each session)*

- (empty)