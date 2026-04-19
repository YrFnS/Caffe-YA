<!-- BEGIN:nextjs-agent-rules -->
# Caffe-YA Agent Guide

**Last updated:** 2026-04-19

## Critical setup

- Database runs on `localhost:5432` via Docker. Run `docker compose up -d` before anything else.
- Environment required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`. Validated at runtime in `src/lib/env.ts`.
- After changing schema, run migrations: `npx drizzle-kit generate && npx drizzle-kit push`.
- Always start dev server from repo root: `npm run dev`.

## Project structure

- Single Next.js 16 App Router package. Routes use **route groups**:
  - `(auth)` — auth-only routes, currently redirects to `/[locale]`
  - `(protected)` — all protected dashboard routes under `/[locale]/(protected)/*`
  - `[locale]` — i18n segment (`en` or `ar`). Locale routing defined in `src/lib/routing.ts`.
- Middleware (`src/proxy.ts`) uses `next-intl` and excludes `api|trpc|_next|_vercel|.*\..*` paths.
- Authentication uses Better Auth with Drizzle adapter (`src/lib/auth.ts`). Only `users` table is mapped; `session`, `account`, `verification` are `undefined`.
- Database: Drizzle ORM, schema in `src/lib/schema.ts` (~600 lines, all domain tables + enums + relations). Migrations output to `./drizzle/`.

## Available commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on `localhost:3000` |
| `npm run build` | Production build |
| `npm run lint` | ESLint (uses `eslint.config.mjs`, extends Next.js core-web-vitals + typescript) |
| `npx drizzle-kit generate` | Generate migration from schema changes |
| `npx drizzle-kit push` | Apply migrations to local DB |

**No test command exists** (no Jest/Vitest configured).

## Configuration quirks

- `next.config.ts`: `reactCompiler: true` enabled. `next-intl` plugin wraps config (`src/lib/i18n.ts`).
- `tsconfig.json`: path alias `@/*` → `./src/*`.
- Tailwind v4 with `@tailwindcss/postcss`. MD 3 Material Design-inspired tokens used in components (e.g. `text-on-surface`, `bg-surface-container-high`).
- `eslint.config.mjs` uses flat config and explicitly re-imports `nextVitals` and `nextTs`. Global ignores cover `.next/`, `out/`, `build/`, `next-env.d.ts`.

## Important files

- `src/lib/env.ts` — Zod env validation; throws on startup if invalid.
- `src/lib/db.ts` — Drizzle instance with schema reference.
- `src/app/[locale]/layout.tsx` — Root layout with RTL handling for Arabic. Loads fonts for both locales.
- `src/app/[locale]/(protected)/layout.tsx` — Sidebar navigation; hardcoded "Admin User" until auth UI is built.
- `src/proxy.ts` — Middleware, must be at `src/` (root) for Next.js to pick it up.

## How to work with the codebase

- Run `npm run lint` before commits. Type checking is implicit via TypeScript + Next.js build.
- UI components use `class-variance-authority` (`src/components/ui/button.tsx`). Use `cn()` utility for class merging.
- All financial amounts use `numeric` with 3 decimal places precision in schema.
- Locale: `en` is default; Arabic requires RTL. All translations in `src/messages/*.json`.
- PRs/branches: none configured. No CI workflows exist yet.

## What's NOT here (don't assume)

- No unit test framework.
- No pre-commit hooks.
- No CI/CD.
- No monorepo — single package only.
- `features/` directory doesn't exist (per README it's planned, not implemented).<!-- END:nextjs-agent-rules -->
