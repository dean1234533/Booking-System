// Single source of trade/homepage landing-page copy, used by TWO
// consumers:
//   1. src/worker.js — pre-renders this as real server-side HTML inside
//      <div id="root"> before React ever loads, so crawlers that don't
//      execute JavaScript (GPTBot, PerplexityBot, and a cold/slow Googlebot
//      pass) see actual text instead of an empty div.
//   2. src/pages/seo/ElectricianSoftwarePage.jsx — the one genuinely new
//      trade page, reads straight from here instead of duplicating copy.
// The four pre-existing trade pages (BarberSoftwarePage.jsx etc.) keep
// their own hand-written JSX — this file's entries for those routes exist
// so the Worker's pre-rendered fallback roughly matches what React then
// renders, not to replace that JSX.
//
// Plain JS, no JSX/React import — importable directly by src/worker.js the
// same way it already imports src/config/plans.js and src/pages/blog/posts.js.

import { PLANS } from "../config/plans.js";

const fullPrice  = PLANS.full.priceGBP;
const basicPrice = PLANS.basic.priceGBP;
const trialDays  = PLANS.full.trialDays;

export const LANDING_PAGES = {
  "/": {
    title: "Bookrightly — Online Booking Software for UK Service Professionals",
    metaDescription: `Bookrightly is UK booking software for barbers, hairdressers, personal trainers, decorators and trades. Your own branded booking page, deposits, no commission ever. Free plan, or ${trialDays}-day free trial on paid plans.`,
    h1: "Booking software for UK service professionals",
    intro: "Bookrightly gives barbers, hairdressers, personal trainers, decorators and trades their own branded online booking page — real-time availability, Stripe deposits to stop no-shows, and a client dashboard. No commission on a single booking, ever.",
    features: [
      { h2: "Your own branded booking page", p: "Every business gets a public profile at bookrightly.co.uk/your-name — your logo, services, prices and photos, with a live Book Now button. No marketplace listing you alongside competitors." },
      { h2: "Deposits that stop no-shows", p: `Take a Stripe deposit the moment someone books. Businesses using deposits see no-shows drop sharply — and there's no commission on top, ever, at £${fullPrice}/month flat.` },
      { h2: "Built for five trades, not one", p: "Barbers get walk-in live queues, hairdressers get treatment menus and portfolios, personal trainers get PAR-Q forms and workout plans, decorators get quote requests and colour approval, trades get fixed-slot call-outs." },
      { h2: "Free plan, or 90 days free on paid plans", p: `Start on the Free plan with no time limit, or try any paid plan free for ${trialDays} days with no card required. If you don't upgrade, you keep your page — you're never locked out.` },
    ],
    faq: [
      { q: "Is Bookrightly free?", a: "Yes — there's a genuinely free plan with no time limit. Paid plans start from £" + basicPrice + "/month after a " + trialDays + "-day free trial, no card needed to start." },
      { q: "Does Bookrightly take commission?", a: "No, never — not on a single booking. The only cost at checkout is Stripe's own real card-processing fee, which isn't marked up." },
      { q: "Which trades is Bookrightly built for?", a: "Barbers, hairdressers, personal trainers, decorators, and plumbing/heating/electrical trades — each with their own tailored booking flow, not a generic one-size-fits-all form." },
      { q: "Do I need my own website?", a: "No. Bookrightly hosts your branded booking page for you. If you already have a website, the Widget plan embeds booking and the live queue directly into it instead." },
      { q: "What happens after the free trial?", a: "You're never locked out. If you don't subscribe, your page simply moves to the Free plan — you keep it, your data, and your booking link." },
    ],
    cta: { text: "Start free — no card needed", href: "/signup" },
  },

  "/booking-software/barbers": {
    title: "Barber Booking Software UK — Online Booking for Barbers | Bookrightly",
    metaDescription: `The best online booking system for UK barbers. Custom profile, live walk-in queue, Stripe deposits, real-time slots and client reviews — from £${fullPrice}/month, or free to start. ${trialDays}-day free trial on paid plans.`,
    h1: "Online booking software built for UK barbers",
    intro: "Stop taking bookings over WhatsApp. Bookrightly gives your barbershop a professional online presence, real-time slot availability, a live walk-in queue, and deposit collection to cut no-shows.",
    features: [
      { h2: "Your own branded shop page", p: "A full public profile with your shop name, logo, hero image, service menu with prices, reviews, and a Book Now button." },
      { h2: "Live walk-in queue", p: "Clients join a live queue from their phone instead of standing around — you call them up when their turn is near, and walk-ins and bookings share the same real-time list." },
      { h2: "Deposit collection at booking", p: "Connected via Stripe. Clients pay a deposit when they book, which goes straight to your account minus the standard Stripe fee. No-shows become rare." },
      { h2: "Reviews on your page", p: "Happy clients can leave a review directly on your Bookrightly page, building social proof for every new visitor." },
      { h2: "Booking notifications", p: "Get notified the moment a new booking comes in — a push notification, no app required on the client side." },
      { h2: "Installs like an app", p: "Clients can add your Bookrightly page to their phone's home screen. It opens instantly and works offline." },
    ],
    faq: [
      { q: "Is Bookrightly booking software free for barbers?", a: `Yes — there's a genuinely free plan with no time limit. The full branded website with deposits, portfolio and reviews is £${fullPrice}/month after a ${trialDays}-day free trial, no commission ever either way.` },
      { q: "Can I take deposits when clients book?", a: "Yes. Bookrightly integrates Stripe so you can collect a deposit at the point of booking, which reduces no-shows significantly." },
      { q: "Does Bookrightly support walk-ins as well as bookings?", a: "Yes. The live queue lets walk-in clients join from their phone, sitting alongside your booked appointments in one real-time list." },
      { q: "Do clients need to download an app?", a: "No. Clients book directly through your Bookrightly page in any browser, and can optionally install it as a PWA." },
      { q: "Will my barbershop have its own page?", a: "Yes. Your shop gets a public profile at bookrightly.co.uk/your-shop-name with your logo, photos, services, reviews and live booking." },
    ],
    cta: { text: "Start free for 90 days", href: "/signup" },
  },

  "/booking-software/salons": {
    title: "Salon Booking Software UK — Online Booking for Hair Salons | Bookrightly",
    metaDescription: `Online booking software for UK hair salons. Branded page, treatment menu, Stripe deposits, before & after portfolio — from £${fullPrice}/month, or start free. No commission.`,
    h1: "Online booking software for UK hair salons",
    intro: "Give your salon a professional booking page — no marketplace, no 30% commission, no chasing clients over Instagram DM. Just a clean booking flow, a treatment menu, and deposits.",
    features: [
      { h2: "A full treatment menu with prices", p: "List every treatment — cuts, colours, balayage, keratin, blowdrys — each with its own price, duration and description." },
      { h2: "Before & after portfolio", p: "Show off colour corrections and transformations directly on your public profile, building trust before a client ever books." },
      { h2: "Deposits to reduce no-shows", p: "Stripe is built in. Set a deposit amount per service, and clients pay it at the point of booking." },
      { h2: "No sign-up required for clients", p: "Clients book directly on your public salon page — no account creation on their end." },
      { h2: "Colour consultations and patch tests", p: "Add any service type, including consultations, patch tests and colour approval sessions, alongside standard appointments." },
    ],
    faq: [
      { q: "Is this booking software free for hair salons?", a: `Yes — there's a genuinely free plan with no time limit. The full branded website with deposits, treatment menu and portfolio is £${fullPrice}/month after a ${trialDays}-day free trial, no commission ever either way.` },
      { q: "Can I list all my salon treatments and prices?", a: "Yes. Add every treatment — cuts, colours, balayage, keratin, blowdrys — each with its own price, duration and description." },
      { q: "Do clients need an account to book?", a: "No. Clients book directly on your public salon page — no sign-up required on their end." },
      { q: "Can I collect a deposit to reduce no-shows?", a: "Yes. Stripe is built in. You set the deposit amount per service, and clients pay it at the point of booking." },
      { q: "How is this different from Treatwell?", a: "Treatwell takes 20–30% commission on every booking. Bookrightly charges a flat monthly fee. At 20 bookings a week, that difference is thousands of pounds per year." },
    ],
    cta: { text: "Try free for 90 days", href: "/signup" },
  },

  "/booking-software/personal-trainers": {
    title: "Personal Trainer Booking Software UK — PAR-Q, Plans & Payments | Bookrightly",
    metaDescription: `Booking and client management for UK PTs. Recurring sessions, PAR-Q forms, food diary, check-ins, workout plans, Stripe payments — from £${fullPrice}/month, or free to start. ${trialDays}-day free trial on paid plans.`,
    h1: "Booking and client management software for UK personal trainers",
    intro: "Recurring session bookings, PAR-Q forms, workout plans, food diary, client check-ins, Stripe payments, and a public PT profile — in one place, built for how PTs actually train clients.",
    features: [
      { h2: "Recurring session bookings", p: "Set up a client's regular weekly slot once — Bookrightly keeps it booked going forward instead of you re-booking the same session every week." },
      { h2: "Digital PAR-Q forms", p: "Clients fill in a health screening form before their first session. Submissions save straight into your client dashboard." },
      { h2: "Workout plans and progress tracking", p: "Build and assign custom workout plans to individual clients, who access them through their own client portal and log check-ins and progress notes." },
      { h2: "Food diary", p: "Clients log daily food entries which you can review and comment on as part of their programme." },
      { h2: "Payment at booking", p: "Stripe handles deposits and session payments — clients pay when they book a slot through your PT booking page." },
    ],
    faq: [
      { q: "Is Bookrightly free for personal trainers?", a: `Yes — ${trialDays}-day free trial, no card required. It's £${fullPrice}/month after that — same flat price as every other business type, including every client-management feature barbers and salons don't need.` },
      { q: "Does Bookrightly support PAR-Q forms?", a: "Yes. Clients fill in a digital PAR-Q health screening form before their first session, saved in your client dashboard." },
      { q: "Can clients book the same recurring slot every week?", a: "Yes. Set a client's regular session once and it stays booked, rather than re-booking the same slot manually every week." },
      { q: "Can I create workout plans for clients?", a: "Yes. Build and assign custom workout plans to individual clients, accessible through their own portal." },
      { q: "How is this different from Mindbody?", a: "Mindbody costs £100–400+/month and targets large gym businesses. Bookrightly is built for UK solo and small-team PTs at a fraction of the price." },
    ],
    cta: { text: "Start free for 90 days", href: "/signup" },
  },

  "/booking-software/decorators": {
    title: "Decorator & Painter Booking Software UK — Quotes, Portfolio & Site Visits | Bookrightly",
    metaDescription: `Online booking and quoting software for UK painters and decorators. Portfolio, multi-day job scheduling, quote request forms, site visit booking, colour approval — from £${fullPrice}/month, or free to start. No commission.`,
    h1: "Online booking and quoting software for UK painters and decorators",
    intro: "A professional portfolio page, quote request form, multi-day job scheduling, site visit booking, and a colour approval tool — built around how decorating jobs actually run, not a generic appointment slot.",
    features: [
      { h2: "Quote requests, not just bookings", p: "Clients fill in a quote request form describing the job and upload photos. You receive the enquiry by email and in your dashboard, then send back a priced quote." },
      { h2: "Multi-day job scheduling", p: "Decorating jobs run over days, not one-hour slots — Bookrightly's day planner schedules a job across however many days it actually needs." },
      { h2: "Before and after portfolio", p: "Show the quality of your finish with before/after photos on your public profile, building trust before a client ever enquires." },
      { h2: "Colour approval sign-off", p: "Send clients a digital colour palette to review and formally approve before work starts — a record that protects you if a client changes their mind later." },
      { h2: "Bookable site visits", p: "Add site visit slots so clients can book a convenient time for you to assess the job and give an accurate quote, without back-and-forth calls." },
    ],
    faq: [
      { q: "Is Bookrightly free for decorators?", a: `Yes — ${trialDays}-day free trial with no credit card required. After that it's £${fullPrice}/month with no commission on any booking or enquiry.` },
      { q: "Can clients request a quote through my Bookrightly page?", a: "Yes. Clients fill in a quote request form describing the job, upload photos, and submit their contact details." },
      { q: "Does it handle jobs that take several days?", a: "Yes. The day planner schedules a job across multiple days rather than forcing everything into single appointment slots." },
      { q: "What is the colour approval tool?", a: "A digital colour palette you send clients to review and formally approve before work starts — a record that protects you if a client changes their mind after painting." },
      { q: "Do clients need an account to submit a quote request?", a: "No. Clients submit the form directly on your page with no sign-up required." },
    ],
    cta: { text: "Try free for 90 days", href: "/signup" },
  },

  "/booking-software/electricians": {
    title: "Electrician Booking Software UK — Call-Outs & Fixed-Slot Inspections | Bookrightly",
    metaDescription: `Online booking software for UK electricians. Fixed-slot inspections, call-out requests, standard charges shown upfront, service areas covered — from £${fullPrice}/month, or free to start. No commission.`,
    h1: "Online booking software for UK electricians",
    intro: "A branded profile for fixed-slot inspections (EICRs, PAT testing, consumer unit upgrades) and a call-out request form for emergency work — with your standard charges shown upfront so clients know the cost before they even enquire.",
    features: [
      { h2: "Fixed-slot inspection booking", p: "List bookable slots for work with a known duration — EICRs, PAT testing, consumer unit upgrades — so clients can book a fixed appointment instead of waiting for a callback." },
      { h2: "Call-out request form for urgent work", p: "For anything that isn't a fixed slot, clients submit a job request with the problem, urgency and photos — you receive it by email and in your dashboard, then quote or schedule it." },
      { h2: "Standard charges shown upfront", p: "Display your call-out fee, hourly rate, minimum charge and emergency rate directly on your page, so there's no guessing before someone gets in touch." },
      { h2: "Service areas covered", p: "List the postcodes or areas you cover and your travel radius, so clients outside your range don't waste your time with an enquiry." },
      { h2: "Job scheduling and invoicing", p: "Enquiries convert into scheduled jobs on your day planner, and into VAT-ready invoices with payment status tracking — no separate spreadsheet needed." },
    ],
    faq: [
      { q: "Is Bookrightly free for electricians?", a: `Yes — ${trialDays}-day free trial with no credit card required. After that it's £${fullPrice}/month with no commission on any booking, call-out or invoice.` },
      { q: "Can clients book a fixed appointment for an EICR or PAT testing?", a: "Yes. List your inspection and testing work as bookable fixed-duration slots, so clients book a real appointment time rather than waiting for a call back." },
      { q: "What about emergency call-outs that don't fit a fixed slot?", a: "Clients submit a call-out request describing the problem and urgency, with photos if relevant — you receive it instantly and can quote, schedule or call them back." },
      { q: "Can I show my call-out fee and hourly rate before someone enquires?", a: "Yes. Your standard charges — call-out fee, hourly rate, minimum charge, emergency rate — display directly on your public page." },
      { q: "Does it handle invoicing too?", a: "Yes. Jobs convert into VAT-ready invoices with paid/unpaid/overdue status tracking, separate from the quote and enquiry stage." },
    ],
    cta: { text: "Start free for 90 days", href: "/signup" },
  },
};

export const LANDING_PAGE_PATHS = Object.keys(LANDING_PAGES);
