# Caffe YA Launch Checklist

Caffe YA is a bilingual Next.js operations app hosted on Vercel, with Better Auth and a PostgreSQL database on Neon. Expected demo cost: **$0/month** on the Vercel and Neon free tiers. Estimated hands-on time: **45–75 minutes**.

Legend: 🧑 **You** — owner action · 🤖 **Agent** — code/CLI action · 🤝 **Together** — shared verification

## Phase 0 — Deployment blockers

- [x] 🤖 **Repair the dependency lockfile** — 10 minutes. Keep `package-lock.json` current so Vercel installs the exact tested packages.
  > Verify the committed lockfile and run a clean install plus production build.
  **You'll know it worked when:** `bun install --frozen-lockfile` and `bun run build` both exit successfully.

- [x] 🤖 **Set the production auth URL explicitly** — 5 minutes. Better Auth uses this URL to trust login requests and redirects.
  > Configure Better Auth with the validated `BETTER_AUTH_URL` environment variable.
  **You'll know it worked when:** production login reaches the dashboard without an origin or callback error.

## Phase 1 — Accounts and prerequisites

- [x] 🤖 **Use the existing Vercel and Neon accounts** — 5 minutes. Both services have suitable free tiers for a client demo.
  > Create a Neon project in the existing organization and link this repository to Vercel.
  **You'll know it worked when:** both CLIs return the new project without prompting for another account.

## Phase 2 — Secrets and configuration

- [x] 🤖 **Store production settings in Vercel** — 5 minutes. An environment variable is a setting stored outside Git, which keeps database credentials and auth secrets out of the repository.
  > Add `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` to Vercel Production without printing or committing their values.
  **You'll know it worked when:** Vercel lists all three names for Production and the app boots successfully.

- [x] 🤖 **Keep secrets out of Git** — 2 minutes.
  > Confirm `.env*`, Neon local context, and Vercel local context files are ignored; scan the pending diff for credentials.
  **You'll know it worked when:** `git diff` contains no connection string, password hash, or auth secret.

## Phase 3 — Production database

- [x] 🤖 **Create and migrate Neon PostgreSQL** — 10 minutes. A migration creates the tables and relationships the app expects.
  > Apply the Drizzle schema to the production Neon branch and fail if any statement is rejected.
  **You'll know it worked when:** Neon reports all schema changes applied.

- [x] 🤖 **Seed meaningful demo data** — 5 minutes.
  > Populate every business table transactionally with users, roles, products, resources, orders, inventory, procurement, payroll, accounting, settings, and audit data. Leave session and verification-token tables runtime-owned.
  **You'll know it worked when:** every demo-domain table has at least one row and all foreign keys resolve.

## Phase 4 — Deploy the app

- [x] 🤖 **Deploy the production build to Vercel** — 10–20 minutes.
  > Link `YrFnS/Caffe-YA`, add the production environment variables, deploy `main`, and wait for the canonical alias to become Ready.
  **You'll know it worked when:** the public Vercel URL returns the bilingual sign-in screen over HTTPS.

## Phase 5 — Domain

- [x] 🤖 **Use the Vercel HTTPS domain for this demo** — no extra time or cost. DNS is the address book that maps a custom name to the deployed app; a custom domain is unnecessary for the requested client demo.
  > Confirm the canonical `.vercel.app` URL is stable and uses HTTPS.
  **You'll know it worked when:** the canonical URL opens without a certificate warning.

## Phase 6 — Pre-demo verification

- [ ] 🤖 **Run the production browser journey** — 15–25 minutes.
  > Sign in fresh as every seeded role, verify protected routing, dashboard data, POS products and resources, complete one representative mutation, sign out, and repeat in Arabic RTL.
  **You'll know it worked when:** each role reaches protected data, the mutation persists in Neon, and sign-out returns to sign-in.

- [ ] 🤝 **Do the final client-device check** — 5 minutes.
  > Open the final URL once on the device used for the presentation and keep the demo credentials available privately.
  **You'll know it worked when:** the sign-in screen and dashboard fit the display without horizontal clipping.

## Phase 7 — After the demo

- [ ] 🧑 **Choose whether this becomes a real production system** — 15 minutes, no immediate cost. Real operations would need named employee accounts, a custom domain, monitoring, a backup policy, and credential rotation.
  Go to the Vercel project settings and Neon project settings only after the client approves continued use. Do not share production secrets in chat.
  **You'll know it worked when:** ownership, billing, backup retention, and the production domain have named owners.

No payment gateway, email provider, object storage, analytics, or external AI service is currently required by the codebase.
