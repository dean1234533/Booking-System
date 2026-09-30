# Bookrightly

Bookrightly is a multi-industry booking SaaS for UK service professionals — barbers, hairdressers, personal trainers, decorators, and plumbing/heating/electrical trades. Each business gets its own public profile page, online booking, Stripe deposit payments, and a management dashboard.

Live at **https://bookrightly.co.uk**.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + MUI (Material UI) |
| Routing / edge logic | Cloudflare Worker (`src/worker.js`) — handles all HTTP routing, per-business SEO injection, the dynamic sitemap, and the client-reminder cron |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Payments | Stripe (Connect, destination charges) |
| Push | Web Push (VAPID, hand-rolled with WebCrypto — no Node `web-push` package) |
| Email | Resend |
| PWA | Workbox (`injectManifest` mode) |
| Testing | Vitest |

The Cloudflare Worker is the single entry point for every request — it serves the built frontend, injects SEO/structured-data into the raw HTML for pages that need to be readable without JavaScript (search crawlers, AI answer engines), and implements every server-side API route under `/api/*`.

## Getting started

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in local secrets for wrangler dev
npm run dev                       # Vite dev server (frontend only)
```

Running the Worker locally (needed for any `/api/*` route, Stripe, or Workers AI):

```bash
npx wrangler dev --remote
```

`--remote` is required — Workers AI (used by the homepage chatbot) has no local model to run against.

### Environment

Local scripts under `twa/` (seeding, migrations, one-off admin tasks) read secrets from a `.env` file in the project root — this file is git-ignored and never committed. The deployed Worker's secrets are managed separately via `wrangler secret put` and are not stored in this repo at all.

Before running any local script that touches Stripe or Firebase, check which account you're authenticated as:

```bash
npx wrangler whoami
firebase login:list
```

## Deploying

```bash
npm run deploy
```

This runs `vite build` (twice — once for the main app, once for the embeddable widget bundle), then `wrangler deploy` and `firebase deploy --only hosting`. Always run the full command — never deploy the Worker or hosting independently, since they're expected to stay in sync.

Firestore rules and indexes are deployed separately, only when they've changed:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Project structure

```
src/
  worker.js              Cloudflare Worker — routing, SEO/AEO injection, cron jobs, every /api/* handler
  App.jsx                React Router setup, tenant/business-type resolution
  config/
    plans.js             Single source of truth for every pricing tier (Free/Basic/Widget/Full)
    reminders.js          Plan limits and schedule options for the client-reminder system
  reminders/              Client-reminder engine (push → email → SMS chain), timezone-aware scheduling
  pages/                  Public business-type templates, booking flow, dashboard pages
  components/dashboard/   Business owner dashboard tabs
  firebase/               Firestore/Auth client helpers
  widget/                 Standalone embeddable booking widget (built separately, see vite.widget.config.js)
firestore.rules           Security rules — most writes from unauthenticated customers go through
                          admin-token Worker endpoints instead of direct client writes
twa/                      One-off and repeatable admin/maintenance scripts (Node, run locally)
functions/                Legacy Firebase Cloud Functions (being phased out in favour of the Worker)
```

## Business routes

| URL pattern | Business type |
|---|---|
| `/barber/:id`, `/shop/:id` | Barber |
| `/hairdresser/:id` | Hairdresser |
| `/decorator/:id` | Decorator |
| `/plumber/:id` | Plumbing / heating / electrical |
| `/pt-booking/:id` | Personal trainer (marketing page) |
| `/pt-book/:id` | Personal trainer (slot picker only) |
| `/{bookingSlug}` | Any business type, once it's claimed a custom booking link |

## Key architectural notes

- **Every write from an unauthenticated customer goes through the Worker**, using a Firebase service-account token, never a direct client-side Firestore write — `firestore.rules` requires `request.auth != null` for most writes, and an anonymous booking customer has no Firebase Auth session at all.
- **Pricing tiers live in one file** (`src/config/plans.js`), imported by both the frontend and the Worker. Never hardcode a price or feature-gate check anywhere else.
- **The `slots` collection is shared** by barbers, hairdressers, and decorators; personal trainers use a separate `ptSlots` subcollection.
- **Client reminders** (`src/reminders/`) follow a strict push → email → SMS channel chain, gated by plan, with all scheduling done in the business's own timezone (`barbers/{id}.timezone`, defaulting to Europe/London).

## Testing

```bash
npm test
```

Runs the full Vitest suite, including the reminder engine's scheduling/timezone/channel-chain tests against an in-memory Firestore fake (no real network calls).
