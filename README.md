# BookPilot

BookPilot is a demo-friendly appointment booking tool for teams. Ops users manage availability and bookings, while guests can reserve slots from a shareable public page that syncs to Google Calendar after Stripe deposits clear.

## Features

- Email/password auth with role-aware navigation across dashboard, bookings, availability, and audit log views.
- Weekly availability editor with drag-free block management that powers the public booking page.
- Booking workflow: pick slot → enter details → reserve → Stripe Checkout session (mock friendly) → webhook-driven confirmation + Google Calendar event creation.
- RBAC enforcement (Admin/Manager/Member) for mutations, with audit log trail and idempotent checkout session creation.
- Encrypted customer email/phone at rest plus conflict detection + pending-payment auto expiry.

## Getting started

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Then open http://localhost:3000. Use the seeded credentials `admin@bookpilot.test` / `password123` to access the ops surface, or visit `/book/demo-team` for the public flow.

Environment variables live in `.env` (see `.env.example`). At minimum set `SESSION_PASSWORD` (32+ chars) and `ENCRYPTION_KEY` (32-byte base64). Optional integrations:

- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`

## Tests & linting

```bash
npm run lint
npm run test
```

Vitest covers critical helpers (time utils today) and can be extended for server logic.

## Project structure

```
src/
  app/
    (public)/login, book/[teamSlug]
    (app)/app/... (dashboard, bookings, availability, audit)
  components/
  lib/ (config, session, crypto helpers)
  server/ (auth, bookings, availability, payments, integrations)
api/ routes live within `src/app/api/*` following the spec (auth, availability, bookings, billing, webhooks, audit).
```

## Notes

- Stripe + Google Calendar integrations gracefully degrade when env vars are missing (mock URLs + stub event ids) so you can demo without live keys.
- SQLite is powered by Prisma's better-sqlite3 adapter for fast local development.
# bookPilot
