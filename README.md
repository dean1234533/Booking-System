# Bookrightly: online booking for UK service businesses

**A multi-industry booking SaaS for barbers, hairdressers, personal trainers, decorators, and plumbing/heating/electrical trades. Each business gets its own public profile, online booking, Stripe deposits, and a management dashboard.**

[![Live site](https://img.shields.io/badge/live-bookrightly.co.uk-7c3aed?style=flat-square)](https://bookrightly.co.uk/)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-007FFF?style=flat-square&logo=mui&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)

**Live:** [bookrightly.co.uk](https://bookrightly.co.uk/)

---

## Screenshots

<!-- Add images to docs/screenshots/ and uncomment. -->
<!--
| Marketplace | Business profile | Dashboard |
|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Profile](docs/screenshots/profile.png) | ![Dashboard](docs/screenshots/dashboard.png) |
-->

_Screenshots coming soon. For now, see the [live site](https://bookrightly.co.uk/)._

---

## Features

- **Industry-specific templates**, each with its own public page:
  - Barbers and hairdressers: services, reviews, and a live slot picker
  - Decorators and trades (plumbing/heating/electrical): a quote-request/job-enquiry form plus site-visit booking
  - Personal trainers: a marketing page with video, reviews, pricing, and session booking
- **Online booking** with real-time slot availability, or an embeddable widget for a business's own existing website
- **Stripe deposits and refunds**, via Connect destination charges. Amounts are always priced and verified server-side in the Cloudflare Worker, never trusted from the client
- **Client reminders** — a push → email → SMS channel chain (gated by plan), scheduled in each business's own timezone, stopping at the first channel that succeeds so a client is never reminded twice
- **Business dashboard** for services, availability, bookings, enquiries, analytics charts, and PDF exports
- **SEO and AEO for every business and every marketing page.** The Worker injects per-profile meta tags and structured data (`Organization`, `SoftwareApplication`, `FAQPage`) directly into the raw HTML with `HTMLRewriter`, serves a dynamic sitemap, and publishes `/llms.txt` — all readable by AI answer engines and crawlers that don't execute JavaScript, not just traditional search
- **Installable PWA** with Workbox and web push notifications (VAPID, implemented directly with WebCrypto — no server-side Node dependency)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Material UI, React Router, Chart.js |
| Edge / API | Cloudflare Worker (`src/worker.js`) — routing, SEO/AEO injection, dynamic sitemap, the client-reminder cron, and every `/api/*` payment/booking endpoint |
| Database & Auth | Firebase Firestore and Firebase Auth |
| Payments | Stripe (Connect, destination charges) |
| Email | Resend |
| PWA | vite-plugin-pwa (`injectManifest` mode), Web Push |
| Testing | Vitest |

The Worker is the single entry point for every request: it serves the built frontend, and every write from an unauthenticated customer (a booking, a cancellation, a push-notification opt-in) goes through it using a Firebase service-account token — `firestore.rules` requires an authenticated session for most writes, and an anonymous customer never has one.

---

## Getting started

```bash
git clone https://github.com/dean1234533/Booking-System.git
cd Booking-System
npm install
npm run dev
```

You'll need a Firebase project (Auth and Firestore), a Stripe account, and a Cloudflare account. Local admin/maintenance scripts (`twa/`) read secrets from a git-ignored `.env` file; the deployed Worker's secrets are managed separately with `wrangler secret put` and are never committed.

Running the Worker locally (needed for any `/api/*` route, Stripe, or the Workers AI-powered chatbot):

```bash
npx wrangler dev --remote   # --remote is required — Workers AI has no local model to run against
```

Before running any local script that touches Stripe or Firebase, check which account you're authenticated as:

```bash
npx wrangler whoami
firebase login:list
```

### Deploy

```bash
npm run deploy   # vite build (app + embeddable widget) → wrangler deploy → firebase deploy --only hosting
```

Always run the full command — the Worker and hosting are expected to stay in sync, never deployed independently.

Firestore rules and indexes deploy separately, only when they've changed:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Testing

```bash
npm test
```

Runs the full Vitest suite, including the reminder engine's scheduling/timezone/channel-chain tests against an in-memory Firestore fake — no real network calls.

---

## Project structure

```
src/
  worker.js              Cloudflare Worker: routing, SEO/AEO injection, cron jobs, every /api/* handler
  App.jsx                Routing + tenant/business-type resolution
  config/
    plans.js             Single source of truth for every pricing tier (Free/Basic/Widget/Full)
    reminders.js         Plan limits and schedule options for the client-reminder system
  reminders/              Client-reminder engine (push → email → SMS chain), timezone-aware scheduling
  pages/                  Business-type templates (BarberProfile, HairdresserTemplate, DecoratorTemplate,
                          PlumberTemplateV2, PTBookingSite), booking flow, Dashboard
  components/dashboard/   Business owner dashboard tabs
  firebase/               Firestore/Auth client helpers
  widget/                 Standalone embeddable booking widget (built separately — see vite.widget.config.js)
  sw-v3.js                Service worker (Workbox + push)
firestore.rules           Security rules — most customer-facing writes go through admin-token Worker
                          endpoints rather than a direct client write
twa/                      One-off and repeatable admin/maintenance scripts (Node, run locally)
```

For more detail, see the design and planning docs in the repo root, such as `AUTOMATION_SYSTEM.md` and `PRICING_ANALYSIS.md`.

---

## Author

Built by **Dean Da Dev**, a UK full-stack developer building web apps, websites,
and AI tools.

🌐 [dean-da-dev.co.uk](https://www.dean-da-dev.co.uk/) · 💼 [More projects](https://www.dean-da-dev.co.uk/portfolio) · 🐙 [GitHub](https://github.com/dean1234533)
