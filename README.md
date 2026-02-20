# BookPilot

BookPilot is a scheduling and payments cockpit for internal operations teams. It gives coordinators a dashboard to review bookings, edit weekly availability, audit changes, and share a branded `/book/[teamSlug]` link with guests. Guests can pick a slot, pay a deposit through Stripe, and the confirmed meeting is synced back to Google Calendar so everyone stays aligned. The entire experience lives in a single Next.js repository so portfolio reviewers can reason about the product, data model, and integration surface at a glance.

## Try it on Vercel
The fastest path is the hosted build: [https://book-pilot-cyan.vercel.app/login](https://book-pilot-cyan.vercel.app/login). You’ll land on the operator login; once authenticated you can review the bookings queue, availability editor, audit log, or open the public `/book/demo-team` flow from the dashboard.

| Field | Value |
| --- | --- |
| Email | `admin@bookpilot.test` |
| Password | `password123` |

After logging in, explore the `/app` workspace, confirm/cancel bookings, or copy the published guest link to run through the Stripe deposit + webhook/polling confirmation path end to end.

## Run locally (optional)
```bash
# clone and enter
git clone https://github.com/AndreHeidemann/bookPilot.git
cd bookpilot

# install deps
npm install

# configure env
cp .env.example .env
# edit .env to set values for APP_BASE_URL, SESSION_PASSWORD, ENCRYPTION_KEY,
# optional STRIPE_* and GOOGLE_* keys, etc.

# start dev server
npm run dev
```
Visit http://localhost:3000 and sign in with the same demo credentials.

## Notes for reviewers
- Validate the authenticated `/app` flows: bookings list/detail actions, availability editor, audit log.
- From the dashboard, grab the `/book/[teamSlug]` link to simulate the guest flow plus Stripe checkout confirmation.
- Check that paid bookings update the admin view and audit trail whether confirmed via webhook or the client-side fallback.

## Why reviewers care
- **Real operator flow** – You can log in, triage bookings, tweak availability, and then jump into the `/book/:teamSlug` guest flow without leaving the repo.
- **Pragmatic stack** – Next.js 16 server components, Prisma 7 on SQLite/libSQL, Tailwind, Stripe Checkout, and Google Calendar—nothing exotic, but all wired end to end.
- **Safety nets** – Encrypted PII, pending-payment expiry, idempotent mutations, audit logging, and a Stripe confirmation fallback so paid bookings never get stuck.
- **Low-friction DX** – Prisma scripts, ESLint, Vitest, and a tiny seed database keep the project easy to clone, inspect, and modify during review.

---

## Quick start (5 commands)
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Copy the env template and fill values (see next section for help)**
   ```bash
   cp .env.example .env
   ```
3. **Apply the Prisma schema**
   ```bash
   npm run db:migrate
   ```
4. **Seed demo users, teams, and availability blocks**
   ```bash
   npm run db:seed
   ```
5. **Launch the dashboard**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000, log in with `admin@bookpilot.test / password123`, and share http://localhost:3000/book/demo-team with guests.

---

## Environment setup guide
Everything lives in `.env`. The template shows every variable, but this walkthrough explains how to generate safe values.

### 1. Copy the template
```bash
cp .env.example .env
```

### 2. Generate required secrets
```bash
# 32+ character password for iron-session
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" # → SESSION_PASSWORD

# 32-byte base64 key used to encrypt guest PII
openssl rand -base64 32 # → ENCRYPTION_KEY
```
Keep `APP_BASE_URL=http://localhost:3000` for local dev and leave `DATABASE_URL=file:./dev.db` unless you point Prisma at another SQLite file.

### 3. Stripe (optional in dev)
Leaving the Stripe fields empty keeps the UI in demo mode. To exercise real Checkout sessions add:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID` (the deposit line item)
Also update `DEPOSIT_AMOUNT_CENTS` if your deposit differs from the default `$50.00`. When a live key is present BookPilot automatically appends `session_id` to the success redirect and polls `/api/billing/checkout-session/confirm`, so bookings still confirm if Vercel drops the webhook.

### 4. Google Calendar (optional in dev)
Bookings automatically write to Google Calendar when these are set:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (replace newline characters with `\n` before saving)
- `GOOGLE_CALENDAR_ID`
If they stay empty, BookPilot generates stub IDs so the workflow still completes.

### 5. Final `.env` example
```env
APP_BASE_URL="http://localhost:3000"
DATABASE_URL="file:./dev.db"
SESSION_PASSWORD="<hex-from-node-command>"
ENCRYPTION_KEY="<base64-from-openssl>"
DEPOSIT_AMOUNT_CENTS="5000"
PENDING_PAYMENT_TTL_MINUTES="15"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ID=""
GOOGLE_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_PRIVATE_KEY=""
GOOGLE_CALENDAR_ID=""
```

> Tip: rerun `npm run db:migrate` whenever the schema changes. Prisma will keep `dev.db` and `prisma/migrations` in sync.

### Environment variable reference
| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_BASE_URL` | ✅ | Canonical URL used in emails, webhooks, and redirect URLs.
| `DATABASE_URL` | ✅ | Prisma connection string (`file:./dev.db` locally, `libsql://...` when deploying). Falls back to `TURSO_DATABASE_URL`/`LIBSQL_DATABASE_URL` if set.
| `DATABASE_AUTH_TOKEN` | Optional | Auth token for remote libSQL/Turso deployments (falls back to `TURSO_AUTH_TOKEN`/`LIBSQL_AUTH_TOKEN`).
| `SESSION_PASSWORD` | ✅ | Iron-session cookie password (32+ characters).
| `ENCRYPTION_KEY` | ✅ | Base64-encoded 32-byte key used to encrypt guest PII columns.
| `DEPOSIT_AMOUNT_CENTS` | ✅ | Stripe checkout deposit amount in cents.
| `PENDING_PAYMENT_TTL_MINUTES` | ✅ | Minutes before unpaid bookings auto-expire.
| `STRIPE_SECRET_KEY` | Optional | Enables live Stripe Checkout creation.
| `STRIPE_WEBHOOK_SECRET` | Optional | Verifies `/api/payments/stripe-webhook` requests.
| `STRIPE_PRICE_ID` | Optional | Price ID used inside the Checkout session.
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Optional | Service account identity for the Calendar API.
| `GOOGLE_PRIVATE_KEY` | Optional | Private key for the service account (escaped newlines).
| `GOOGLE_CALENDAR_ID` | Optional | Calendar that stores confirmed bookings.

### Remote libSQL (Vercel) setup
Vercel's serverless runtime can't write to bundled SQLite files, so production needs a remote libSQL database (Turso or any libSQL host).
1. Provision a Turso/libSQL database and note its `libsql://...` URL plus auth token.
2. Run Prisma migrations against it locally: `DATABASE_URL=<remote> DATABASE_AUTH_TOKEN=<token> npx prisma migrate deploy` (or `npm run db:migrate`). You can also rely on `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`; Prisma CLI now auto-detects them.
3. Seed demo data if desired with `npm run db:seed` while the same env vars are set.
4. In Vercel → Project Settings → Environment Variables, add **both** the URL and auth token (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`, or `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`). Without them, Vercel falls back to the bundled `dev.db` and logging will show `[prisma] Using SQLite file at /var/task/dev.db`.
5. Redeploy and confirm the logs say `[prisma] Using libSQL endpoint ...` before testing login.

---

## Local database + seed data
- `npm run db:migrate` – Runs `prisma migrate dev` with the Better SQLite adapter, creating `dev.db`.
- `npm run db:seed` – Inserts the `demo-team`, default availability blocks, and `admin@bookpilot.test` so you can log in immediately.
- Generated files live in `prisma/migrations` for reviewers to inspect schema evolution.

SQLite is bundled with Prisma so no separate service is required. Delete `dev.db` anytime to start fresh.

---

## Run, lint, and test
| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server at http://localhost:3000.
| `npm run build && npm start` | Production build + serve (good for smoke tests).
| `npm run lint` | ESLint 9 with Next.js, React, and accessibility rules.
| `npm run test` | Vitest suite (time utilities, booking rules, etc.). Extend this as you evaluate the domain logic.
| `npm run db:generate` | Regenerates Prisma client types after schema edits.

---

## Project map
```
src/
  app/
    (public)/book/[teamSlug]   → guest flow + Stripe checkout handoff
    (public)/login             → operator auth entrypoint
    (app)/app/*                → dashboard, bookings table, availability editor, audit log
    api/*                      → REST endpoints for bookings, availability, payments, audit events
  components/                  → UI primitives (cards, tables, editor widgets)
  lib/                         → Config, Prisma helper, session handler, crypto helpers
  server/                      → Domain modules (auth, bookings, availability, payments, integrations)
prisma/
  schema.prisma                → relational model + relations
  seed.ts                      → deterministic local dataset
```

---

## Portfolio commit story
You can explore the actual history with:
```bash
git log --reverse --decorate --stat
```
Curated checkpoints worth reading:

| Commit | Story |
| --- | --- |
| `5847ffe` | Scaffolded the Next.js 16 + TypeScript baseline (`create-next-app`), wired ESLint/Tailwind, and left the project ready for custom code.
| `809eefa` | Documented the initial product brief and runbook so reviewers know what problem BookPilot solves before digging into the code.
| `WORKTREE` | Adds the scheduling, payments, and integrations stack you are reviewing now (see the diff in your clone).

Future commits will continue to be narrowly scoped so reviewers can follow how features evolve.

---

## Suggested next steps
1. Capture screenshots or a Loom walkthrough so readers can see the UX without running the repo.
2. Publish a deployment recipe (Railway, Fly.io, Vercel + Neon) that references this README.
3. Expand the Vitest suite to cover Stripe webhook handling and booking conflict detection.
