---
name: project-conventions
description: Project-specific conventions for Caffe-YA
user-invocable: false
---

# Caffe-YA Conventions

## Database Schema Changes

When modifying `src/lib/schema.ts`:
1. Run `npx drizzle-kit generate` to create migration
2. Run `npx drizzle-kit push` to apply to local DB
3. Do NOT run `drizzle-kit migrate` (not configured)

## Financial Amounts

All monetary values in schema MUST use `numeric` type with 3 decimal places precision:
```sql
amount numeric(15, 3)
```
Do NOT use `float` or `double precision` for money.

## Dev Server

- Always start from repo root: `npm run dev`
- Database must be running via Docker: `docker compose up -d`
- Required env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`
- Env validation happens at `src/lib/env.ts` — app throws on invalid env

## Routing

- Locale routing: `en` is default, `ar` is Arabic (RTL)
- Route groups: `(auth)` for auth routes, `(protected)` for dashboard
- Middleware at `src/proxy.ts` handles locale routing
- Path alias: `@/*` maps to `./src/*`

## Styling

- Tailwind v4 with MD 3 Material Design tokens
- Use design tokens: `text-on-surface`, `bg-surface-container-high`, etc.
- Components use `class-variance-authority` + `cn()` utility

## Build & Lint

- Run `npm run lint` before commits (no pre-commit hook, must remember manually)
- Type checking is implicit via TypeScript + Next.js build (no separate `tsc` step)
- React Compiler enabled (`reactCompiler: true` in next.config.ts)

## Translations

- All i18n strings in `src/messages/en.json` and `src/messages/ar.json`
- Arabic requires RTL handling (see `src/app/[locale]/layout.tsx`)