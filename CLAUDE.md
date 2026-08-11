# Bookrightly — Claude Code Instructions

## What this project is
Bookrightly is a multi-industry booking SaaS for UK service professionals (barbers, hairdressers, personal trainers, decorators). Each business gets their own public profile page, online booking, payments, and a dashboard. It is live at **https://bookrightly.co.uk**.

## Tech stack
- **Frontend**: React + Vite + MUI (Material UI)
- **Backend/Routing**: Cloudflare Worker (`src/worker.js`) — handles all routing, SEO injection, sitemap, assetlinks.json
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth
- **Payments**: Stripe
- **Deploy**: `npm run deploy` = `vite build && wrangler deploy && firebase deploy --only hosting`

## Deploy command
```
npm run deploy
```
Always run this after any code change. Never deploy only one part without the others.

## Key files
- `src/worker.js` — Cloudflare Worker: routing, per-business SEO (HTMLRewriter), dynamic sitemap, assetlinks.json, Google/Bing ping
- `src/App.jsx` — React Router setup, tenant loading logic
- `src/pages/BarberProfile.jsx` — Barber public profile (uses `slots` collection, `useSlots` hook)
- `src/pages/HairdresserTemplate.jsx` — Hairdresser public profile (uses `slots` collection, `barberId` query)
- `src/pages/DecoratorTemplate.jsx` — Decorator public profile (quote form + slot picker)
- `src/pages/PTBookingSite.jsx` — PT marketing/profile page (YouTube embed, reviews, pricing)
- `src/pages/PTBookingPage.jsx` — PT slot booking page (reads `barbers/{id}/ptSlots`)
- `src/pages/Dashboard.jsx` — Business owner dashboard
- `src/firebase/firestore.js` — Firestore helpers (`getAllBarbers`, `addSlot`, `getOpenSlots`)
- `src/components/BarberCard.jsx` — Homepage listing card (shows `businessName`, `specialty`, `aboutBody`)
- `src/components/SlotPicker.jsx` — Shared slot picker component used across templates
- `firestore.rules` — Security rules

## Firestore data structure
```
barbers/{uid}                    — business owner profile document
  businessName, name, specialty
  businessType: barber | hairdresser | decorator | trainer
  brandColor, logoUrl, heroImage
  services: [{ name, price (number), duration }]
  aboutBody, heroTagline, heroCtaText
  stat1Value, stat1Label, stat2Value, stat2Label, stat3Value, stat3Label
  instagramUrl, facebookUrl, tiktokUrl
  youtubeUrl                     — PT only
  uid                            — must equal the document ID (used by templates to self-query)
  isDemo: true                   — only on the 4 demo accounts

barbers/{uid}/reviews            — subcollection: { customerName, rating (number), comment }
barbers/{uid}/ptSlots            — PT booking slots: { date, time, duration, price, status: "available" }
barbers/{uid}/notifications      — in-app notifications
barbers/{uid}/enquiries          — decorator quote requests

slots/{id}                       — barber/hairdresser/decorator slots (top-level collection)
  barberId, shopId, date, time, isBooked: false, status: "open"
```

## Important rules
- **Service prices must be numbers** (not strings like "£25"). `formatCurrency()` uses `Intl.NumberFormat` — strings cause £NaN.
- **`uid` field must be set** on every business document and must equal the Firestore document ID. Templates use `tenantData.id || tenantData.uid` to query their own slots.
- **`isDemo: true`** shows a subtle "Demo" badge on homepage cards. Only the 4 demo accounts have this.
- The **`slots` collection** is shared by barbers, hairdressers, and decorators. PT uses a separate subcollection `ptSlots`.
- The **static `public/sitemap.xml` was deleted** — the dynamic sitemap is served by the Cloudflare Worker at `/sitemap.xml`.
- The `youtubeUrl` field is **PT-only** — don't add YouTube sections to barber/hairdresser/decorator templates.

## Business routes
| URL pattern | Component | Business type |
|---|---|---|
| `/barber/:id` | BarberProfile | barber |
| `/shop/:id` | BarberProfile | barber |
| `/hairdresser/:id` | HairdresserTemplate | hairdresser |
| `/decorator/:id` | DecoratorTemplate | decorator |
| `/pt-booking/:id` | PTBookingSite | trainer |
| `/pt-book/:id` | PTBookingPage | trainer (slot picker only) |

## Demo accounts (do not delete)
| UID | Business | Type |
|---|---|---|
| `S5s1FWMaz1XuAEo8gDSTTIqlqgL2` | Fade Factory | barber |
| `xyPHCqfFgoYympmcqUAzNS37URG3` | Luxe Hair Studio | hairdresser |
| `cKyzLBNBHuYKBS439GuE74UYEUv1` | Premier Painters London | decorator |
| `Ih8OFcRzvuS3QbwtsYPeUFCnUEo1` | DB Fitness | trainer |

## Seeding/admin scripts (in `twa/`)
These use the Firestore REST API + Google Auth Library (credentials in `.env`):
- `seed-demo-accounts.cjs` — seeds profile data
- `fix-service-prices.cjs` — patches services with correct numeric prices
- `fix-uid-and-youtube.cjs` — patches uid field + PT youtubeUrl + decorator slots
- `seed-reviews.cjs` — seeds demo reviews
- `add-portfolio-item.cjs` — adds before/after items to decorator

## Android / TWA
- Signed AAB: `twa/bookrightly-v1.aab`
- Keystore: `twa/bookrightly.keystore` (not tracked in git — alias/password kept locally, not in this repo)
- Play Store decided against for now — PWA install via Chrome is primary distribution
- assetlinks.json SHA-256: `C4:A4:38:9C:FF:92:1F:D9:D9:41:1D:8D:27:69:E3:C9:78:55:D3:D0:AB:96:EB:AD:1B:D0:18:BA:DA:1A:F4:4D`

## Stripe
- Deposit payments go through `/api/create-intent`
- Refunds through `/api/cancel-refund`
- Payment amounts verified server-side in the Worker

## PWA
- Service worker: `src/sw.js` (workbox, injectManifest mode)
- `skipWaiting()` + `clientsClaim()` — reloads on SW update but NOT on first install (fixed in `src/main.jsx`)
- Push notifications use VAPID keys stored in Cloudflare Worker env vars
