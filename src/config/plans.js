// Single source of truth for every Bookrightly pricing tier.
//
// Plain JS, no JSX/React import, no import.meta.env — this file is imported
// directly by src/worker.js the same way it already imports
// src/pages/blog/posts.js (Workers can bundle plain ESM from src/, just not
// React/Vite-specific modules). Every price, trial length, business-type
// restriction and feature flag used anywhere in the app or the Worker
// should read from here rather than being hardcoded again.
//
// Stripe note: Bookrightly has never used pre-created Stripe Price objects.
// handleCreateSubscription in worker.js builds `price_data` inline on every
// checkout from a plain pounds amount — there is no Stripe Price ID to
// "reuse" because none were ever created. priceGBP below is that amount;
// the Worker keeps building price_data from it at checkout time. No new
// Stripe Product/Price needs to exist for this config to work.

export const ALL_BUSINESS_TYPES = ["barber", "hairdresser", "trainer", "decorator", "plumber"];

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceGBP: 0,
    trialDays: 0,
    businessTypes: ALL_BUSINESS_TYPES,
    features: {
      hostedPage: true,
      nav: false,
      footer: false,
      poweredByBadge: true,
      deposits: false,
      customerConfirmationEmail: false,
      customerReminderEmail: false,
      portfolio: false,
      reviews: false,
      queue: false,
      customSections: false,
    },
  },
  basic: {
    id: "basic",
    name: "Basic",
    priceGBP: 5,
    trialDays: 90,
    businessTypes: ALL_BUSINESS_TYPES,
    features: {
      hostedPage: true,
      nav: true,
      footer: true,
      poweredByBadge: false,
      deposits: true,
      customerConfirmationEmail: true,
      customerReminderEmail: true,
      portfolio: false,
      reviews: false,
      queue: false,
      customSections: false,
    },
  },
  widget: {
    id: "widget",
    name: "Widget",
    priceGBP: 5,
    trialDays: 90,
    businessTypes: ALL_BUSINESS_TYPES,
    features: {
      hostedPage: false,
      nav: false,
      footer: false,
      poweredByBadge: false,
      deposits: true,
      customerConfirmationEmail: true,
      customerReminderEmail: true,
      portfolio: false,
      reviews: false,
      queue: true,
      customSections: false,
    },
  },
  full: {
    id: "full",
    name: "Full",
    priceGBP: 10,
    trialDays: 90,
    businessTypes: ALL_BUSINESS_TYPES,
    features: {
      hostedPage: true,
      nav: true,
      footer: true,
      poweredByBadge: false,
      deposits: true,
      customerConfirmationEmail: true,
      customerReminderEmail: true,
      portfolio: true,
      reviews: true,
      queue: true,
      customSections: true,
    },
  },
};

export const PLAN_IDS = Object.keys(PLANS);

// Plan ids that existed before this restructure and no longer exist —
// callers should treat these as their replacement.
export const LEGACY_PLAN_ALIASES = { mini: "free" };

export function normalizePlanId(planId) {
  return LEGACY_PLAN_ALIASES[planId] || planId;
}

export function getPlan(planId) {
  return PLANS[normalizePlanId(planId)] || PLANS.full;
}

export function planAllowsBusinessType(planId, businessType) {
  return getPlan(planId).businessTypes.includes(businessType);
}

export function planHasFeature(planId, featureKey) {
  return Boolean(getPlan(planId).features[featureKey]);
}
