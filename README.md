# Bookrightly: online booking for UK service businesses

**A multi-industry booking SaaS for barbers, hairdressers, personal trainers, and decorators. Each business gets its own public profile, online booking, Stripe deposits, and a management dashboard.**

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
  - Decorators: a quote-request form plus site-visit booking
  - Personal trainers: a marketing page with video, reviews, pricing, and session booking
- **Online booking** with real-time slot availability
- **Stripe deposits and refunds.** Amounts are checked on the server in the
  Cloudflare Worker.
- **Business dashboard** for services, availability, bookings, enquiries,
  analytics charts, and PDF exports
- **SEO for every business.** The Worker injects per-profile meta tags with
  `HTMLRewriter` and serves a dynamic sitemap.
- **Installable PWA** with Workbox and web push notifications (VAPID)
- **Calendar sync** with Google Calendar and automated email notifications

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Material UI, Tailwind CSS, React Router, Chart.js |
| Edge / API | Cloudflare Worker (`src/worker.js`) for routing, SEO injection, sitemap, and payment APIs |
| Database & Auth | Firebase Firestore and Firebase Auth |
| Payments | Stripe (Payment Intents) |
| Email | Resend and EmailJS |
| PWA | vite-plugin-pwa (injectManifest), Web Push |

---

## Getting started

```bash
git clone https://github.com/dean1234533/Booking-System.git
cd Booking-System
npm install
npm run dev
```

You'll need a Firebase project (Auth and Firestore), a Stripe account, and a
Cloudflare account. Keep all secret keys in Worker environment variables and
never commit them.

### Deploy

```bash
npm run deploy   # vite build → wrangler deploy → firebase deploy --only hosting
```

---

## Project structure

```
src/
  worker.js        Cloudflare Worker: routing, per-business SEO, sitemap, Stripe APIs
  App.jsx          routing + tenant loading
  pages/           BarberProfile, HairdresserTemplate, DecoratorTemplate, PTBookingSite, Dashboard …
  components/      SlotPicker, BarberCard and shared UI
  firebase/        Firestore helpers
  sw.js            service worker (Workbox + push)
firestore.rules    security rules
```

For more detail, see the design and planning docs in the repo root, such as
`CALENDAR_SYNC_SETUP.md`, `AUTOMATION_SYSTEM.md`, and `PRICING_ANALYSIS.md`.

---

## Author

Built by **Dean Da Dev**, a UK full-stack developer building web apps, websites,
and AI tools.

🌐 [dean-da-dev.co.uk](https://www.dean-da-dev.co.uk/) · 💼 [More projects](https://www.dean-da-dev.co.uk/portfolio) · 🐙 [GitHub](https://github.com/dean1234533)
