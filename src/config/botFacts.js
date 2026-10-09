// Single source of truth for everything the homepage chatbot is allowed to
// say. Both the Worker's system prompt and its keyword-matched fallback are
// built from this file — update a price or feature here and both paths stay
// in sync automatically. Plain JS (no React/Vite-specific syntax), same
// constraint as src/config/plans.js, since this is imported directly into
// src/worker.js.

export const BUSINESS_TYPES_SUPPORTED = [
  "barbers", "hairdressers", "personal trainers", "electricians", "painters & decorators",
];

export const PLANS = {
  free: {
    name: "Free",
    priceGBP: 0,
    tagline: "forever, no card needed",
    businessTypes: "any business type",
    features: [
      "your own booking page",
      "real booking slots",
      "on-screen confirmation",
    ],
    notIncluded: ["deposits"],
  },
  basic: {
    name: "Basic",
    priceGBP: 5,
    tagline: "90-day free trial, then £5/month",
    businessTypes: "barbers & hairdressers only",
    features: [
      "hosted booking page",
      "a link for your Instagram bio",
      "deposits via Stripe",
      "booking confirmations and reminders",
    ],
    notIncluded: [],
  },
  widget: {
    name: "Widget",
    priceGBP: 5,
    tagline: "90-day free trial, then £5/month",
    businessTypes: "any business type",
    features: [
      "an embeddable booking widget for a website they already have",
      "a live walk-in queue (barbers)",
    ],
    notIncluded: [],
  },
  full: {
    name: "Full",
    priceGBP: 10,
    tagline: "90-day free trial, then £10/month",
    businessTypes: "any business type",
    features: [
      "a branded website and booking page, built for Google (SEO)",
      "deposits via Stripe",
      "customer reviews",
      "a portfolio/gallery",
      "an installable app (PWA)",
    ],
    notIncluded: [],
  },
};

// Plain-English facts the bot can draw on freely. Nothing here should ever
// be contradicted by PLANS above — if a fact and a plan field disagree,
// fix the data, don't let the bot paper over it.
export const FACTS = {
  whatItIs: "Bookrightly is UK booking software for barbers, hairdressers, personal trainers, electricians, and painters & decorators. New business types can be added on request.",
  commission: "Zero commission, ever. No booking fees for the business's clients either.",
  trial: "90-day free trial on every paid plan, no card needed. The Free plan is free forever — no trial needed because there's nothing to convert from.",
  deposits: "Deposits are paid by the client at the moment of booking, via Stripe, and go straight to the business's own account.",
  directory: "Every business is also listed in the Bookrightly directory, so clients can find them more than one way, not just their own link.",
  instagram: "Works well alongside Instagram: put the booking link in the bio instead of taking bookings by DM.",
  cancelAnytime: "Cancel any time, no contract.",
  signupUrl: "https://bookrightly.co.uk/signup",
};

// Audience detection for the proactive opener and system-prompt tailoring.
// Checked in order — first match wins. Keep in sync with the business types
// actually supported above.
export const AUDIENCE_RULES = [
  { id: "barber", test: /barber/i, greeting: "Barber? I can show you what your booking page would look like in 2 minutes. What's your shop called?" },
  { id: "salon", test: /salon|hair/i, greeting: "Stylist or salon owner? Want to see how deposits stop no-shows on long appointments? What's your salon called?" },
  { id: "pt", test: /\bpt\b|trainer/i, greeting: "PT? Want clients booking and paying for sessions without the back-and-forth?" },
];
export const DEFAULT_GREETING = "Hi! Running a barbers, salon or trades business? I can show you how Bookrightly works in a minute.";

export function detectAudience(text) {
  if (!text) return null;
  for (const rule of AUDIENCE_RULES) if (rule.test.test(text)) return rule.id;
  return null;
}

export function greetingForAudience(audienceId) {
  return AUDIENCE_RULES.find(r => r.id === audienceId)?.greeting || DEFAULT_GREETING;
}

// Which plan the bot should lead with for a given detected audience — used
// both in the system prompt and as a fallback-answer hint.
export const RECOMMENDED_PLAN = {
  barber: "basic",
  salon: "basic",
  pt: "full",
};

export function planLine(planId) {
  const p = PLANS[planId];
  if (!p) return "";
  const price = p.priceGBP === 0 ? "free, forever" : `£${p.priceGBP}/month (${p.tagline})`;
  return `${p.name} — ${price}. For ${p.businessTypes}. Includes: ${p.features.join(", ")}.`;
}

export function allPlanLines() {
  return Object.keys(PLANS).map(planLine).join("\n");
}

// Confident, fact-only answers to the specific objections product/marketing
// expects at ad-traffic volume. Used both as fallback-answer candidates and
// as worked examples in the system prompt, so the AI model's tone matches
// these even when it isn't quoting them verbatim.
export const OBJECTIONS = [
  {
    id: "how_much",
    keywords: ["how much", "price", "pricing", "cost", "fee", "fees"],
    answer: "Depends on your business — Basic or Widget are £5/month, Full (your own branded site) is £10/month, and there's a genuinely free plan too. Every paid plan has a 90-day free trial, no card needed.",
  },
  {
    id: "client_fees",
    keywords: ["my clients pay", "client fee", "booking fee", "do my clients"],
    answer: "No — your clients never pay a booking fee, and Bookrightly never takes a commission. The only thing added at checkout is Stripe's own card processing cost, which we don't mark up.",
  },
  {
    id: "deposits_put_off",
    keywords: ["put off", "scare off", "deposit too much", "will deposits"],
    answer: "Most no-shows come from first-time clients, not regulars — a deposit protects your slot either way. You choose whether to ask for one at all.",
  },
  {
    id: "already_use_competitor",
    keywords: ["booksy", "fresha", "square", "already use"],
    answer: "Those take a commission on your bookings — Bookrightly doesn't, ever. You also get your own branding and a page built to actually show up on Google, not a shared marketplace listing.",
  },
  {
    id: "just_instagram",
    keywords: ["just use instagram", "only use instagram", "instagram dm"],
    answer: "Keep Instagram — just add your booking link to the bio so you're not managing bookings back and forth in DMs anymore.",
  },
];

// Shown as part of ANY message that asks a visitor for their contact
// details — never after the fact. See CHAT_FACTS usage in src/chat/service.js
// for the two places this gets used: the "ask" message (unknown-topic
// deflection, or a hesitant visitor) and the reply when someone volunteers
// their details unprompted.
export const PRIVACY_NOTICE = "We'll only use it to contact you about Bookrightly.";

export const UNKNOWN_REPLY = `Good question. I'll get Dean to answer that personally. What's the best email to reach you? ${PRIVACY_NOTICE}`;

// Worked example for the system prompt — the model is instructed to use
// this exact phrasing (not invent its own) when a visitor seems interested
// but hasn't given contact details yet.
export const HESITANT_VISITOR_PROMPT = `Want me to set it up and send you the link? Drop your email and shop name. ${PRIVACY_NOTICE}`;

// Used when a visitor volunteers an email/phone WITHOUT being asked — the
// notice comes after the thanks here, per spec, a different order to the
// ask-first messages above (both are always one single message, never two).
export const VOLUNTEERED_LEAD_REPLY = `Thanks! ${PRIVACY_NOTICE.replace("it", "that")} Dean will be in touch shortly.`;
