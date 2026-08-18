/**
 * bookingSlug.js
 *
 * Shared validation for Bookrightly-hosted vanity booking URLs
 * (bookrightly.co.uk/{slug}). Used by:
 *   - Onboarding / Settings UI (live availability check, format validation)
 *   - App.jsx's identifyTenant() (excludes reserved words before treating a
 *     path segment as a candidate slug)
 *
 * IMPORTANT: this file is mirrored (not imported) into functions/index.js,
 * since Cloud Functions can't import Vite src/ modules directly. If this
 * file changes, update the copy there too — it's marked "keep in sync".
 *
 * The reserved list MUST stay a superset of every static top-level path
 * segment in App.jsx's <Routes> table — otherwise a claimed slug could
 * permanently shadow a real page (e.g. someone claiming "pricing").
 */

export const RESERVED_SLUGS = new Set([
  // Static/system routes (first path segment of every route in App.jsx)
  "shop", "pt-booking", "decorator", "hairdresser", "barber", "book",
  "confirmation", "auth", "review", "login", "signup", "cancel-booking",
  "website-design", "compare", "fresha-alternative", "treatwell-alternative",
  "booking-software", "pricing", "how-it-works", "blog", "tools", "terms",
  "privacy", "contact", "workout", "food-diary", "check-in", "par-q",
  "colour-approval", "quote-view", "queue", "food-generator", "client-portal",
  "pt-book", "onboarding", "dashboard",
  // General platform/system words not currently routed but reserved to
  "admin", "api", "account", "settings", "support", "help", "about",
  "bookrightly", "www", "register", "sitemap.xml", "robots.txt",
]);

/**
 * Lowercases, trims, replaces whitespace with hyphens, and strips any
 * character that isn't a lowercase letter, digit, or hyphen.
 */
export function sanitizeSlug(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 3-30 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen,
 * no double hyphens. Assumes the input has already been sanitized.
 */
export function isValidSlugFormat(slug) {
  return /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/.test(slug) && slug.length >= 3 && slug.length <= 30;
}

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug);
}

/**
 * One-shot check combining sanitize + format + reserved-word validation.
 * Returns { valid: boolean, slug: string, error?: string }.
 */
export function validateSlug(raw) {
  const slug = sanitizeSlug(raw);
  if (!slug) return { valid: false, slug, error: "Please enter a link." };
  if (!isValidSlugFormat(slug)) {
    return { valid: false, slug, error: "Use 3-30 lowercase letters, numbers, or hyphens." };
  }
  if (isReservedSlug(slug)) {
    return { valid: false, slug, error: "This link is reserved." };
  }
  return { valid: true, slug };
}
