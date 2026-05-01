---
name: setup-dev
description: Developer setup checklist for Caffe-YA
disable-model-invocation: true
---

# Setup Development Environment

Run this when onboarding or after a fresh clone.

## Prerequisites Checklist

### 1. Start Database
```bash
docker compose up -d
```
Database runs on `localhost:5432`.

### 2. Environment Variables
Create `.env.local` with required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — ≥32 character secret for auth (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — URL for Better Auth (typically `http://localhost:3000`)

The app validates these at startup in `src/lib/env.ts`. It will throw if invalid.

### 3. Install Dependencies
```bash
npm install
```

### 4. Push Schema to DB
```bash
npx drizzle-kit push
```

### 5. Start Dev Server
```bash
npm run dev
```
App runs on `http://localhost:3000`.

## Verify Setup

- [ ] `docker compose ps` shows postgres running
- [ ] `npm run dev` starts without env validation errors
- [ ] Dashboard loads at `http://localhost:3000/en`