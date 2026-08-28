// Shared, business-type-agnostic logic used by QuoteTab, DayPlannerTab,
// EnquiriesTab and the plumber invoices tab. Extracted so it's independently
// testable and so QuoteTab/DayPlannerTab don't each carry their own copy.

export function calcLineTotals(items, vatRate) {
  const subtotal = (items || []).reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
  const vat = subtotal * (Number(vatRate || 0) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

// Cycle used by DayPlannerTab's job status chip (pending -> in-progress -> done -> pending).
const JOB_STATUS_CYCLE = { pending: "in-progress", "in-progress": "done", done: "pending" };
export function nextJobStatus(current) {
  return JOB_STATUS_CYCLE[current] || "pending";
}

// Enquiry lifecycle — ordered roughly by how a job actually progresses, used
// by EnquiriesTab's status selector and for validating transitions.
export const ENQUIRY_STATUSES = [
  "new", "contacted", "site visit booked", "quoted",
  "accepted", "scheduled", "completed", "declined",
];
export function isValidEnquiryStatus(status) {
  return ENQUIRY_STATUSES.includes(status);
}

// Per-business-type cosmetic defaults for the reused Quote/Day-Planner tabs —
// keeps decorator's existing copy completely unchanged (it's the default)
// while giving plumber its own trade-appropriate wording.
export const QUOTE_LABELS = {
  decorator: {
    defaultJobTitle: "Decorating Works",
    jobTitlePlaceholder: "e.g. Full interior decoration — 3-bed semi",
    units: ["m²", "m", "hrs", "days", "item", "room", "coat", "door", "window"],
  },
  plumber: {
    defaultJobTitle: "Plumbing & Heating Work",
    jobTitlePlaceholder: "e.g. Bathroom re-plumb, 2-bed flat",
    units: ["hrs", "day", "item", "fixture", "m", "call-out", "job"],
  },
};
export function getQuoteLabels(businessType) {
  return QUOTE_LABELS[businessType] || QUOTE_LABELS.decorator;
}

export const JOB_TYPES_BY_BUSINESS_TYPE = {
  decorator: [
    "Full Interior Paint", "Full Exterior Paint", "Feature Wall", "Ceiling",
    "Woodwork / Gloss", "Prep & Prime", "Touch-Ups", "Wallpaper — Hang",
    "Wallpaper — Strip", "Site Visit / Quote", "Other",
  ],
  plumber: [
    "Boiler Install", "Boiler Service", "Leak Repair", "Bathroom Fit",
    "Central Heating", "Emergency Call-out", "Drain Unblock",
    "Gas Safety Check", "Electrical Fault", "Rewire", "Site Visit / Quote", "Other",
  ],
};
export function getJobTypes(businessType) {
  return JOB_TYPES_BY_BUSINESS_TYPE[businessType] || JOB_TYPES_BY_BUSINESS_TYPE.decorator;
}

// Plumber's public-page defaults — service categories with example items,
// used as fallbacks on PlumberTemplate and as starter content in the
// dashboard's Services editor when the owner hasn't added their own yet.
export const PLUMBER_SERVICE_CATEGORIES = [
  {
    category: "Plumbing",
    items: [
      { name: "Leak repair", description: "Diagnosing and fixing leaking pipes, taps and fittings.", startingPrice: "", bookableOnline: false },
      { name: "Blocked drains", description: "Clearing blocked sinks, toilets and drains.", startingPrice: "", bookableOnline: false },
      { name: "Bathroom fitting", description: "Full or partial bathroom installation.", startingPrice: "", bookableOnline: false },
    ],
  },
  {
    category: "Gas & Heating",
    items: [
      { name: "Boiler service", description: "Annual boiler service and safety check.", startingPrice: "", bookableOnline: true },
      { name: "Boiler repair", description: "Diagnosing and fixing boiler faults.", startingPrice: "", bookableOnline: false },
      { name: "Central heating install", description: "New or upgraded central heating systems.", startingPrice: "", bookableOnline: false },
    ],
  },
  {
    category: "Electrical",
    items: [
      { name: "Fault finding", description: "Diagnosing electrical faults and trips.", startingPrice: "", bookableOnline: false },
      { name: "Rewiring", description: "Partial or full property rewires.", startingPrice: "", bookableOnline: false },
      { name: "Socket & lighting installs", description: "Adding or replacing sockets, switches and lighting.", startingPrice: "", bookableOnline: false },
    ],
  },
];

// Marketplace/badge label for a plumber-type business, derived from whichever
// service categories they've actually kept in the dashboard's Services editor
// (removeCategory/addCategory there already let an electrician-only business
// delete "Plumbing" and "Gas & Heating") — rather than a fixed "Plumbing,
// Heating & Electrical" shown for every business in this trade regardless of
// what they actually do. "Gas & Heating" shortens to "Heating" here since the
// full category name reads oddly stacked next to "Plumbing" and "Electrical"
// in a short badge. Falls back to the full combined label when categories are
// unset (new/legacy accounts) or when there are enough of them that listing
// each one stops being useful as a short label.
export function getPlumberTradeLabel(serviceCategories) {
  const FALLBACK = "Plumbing, Heating & Electrical";
  const names = (serviceCategories || [])
    .map(c => (c.category === "Gas & Heating" ? "Heating" : c.category))
    .filter(Boolean);
  if (names.length === 0 || names.length > 3) return FALLBACK;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]}, ${names[1]} & ${names[2]}`;
}

export const URGENCY_LEVELS = [
  { value: "emergency", label: "Emergency — needs attention today" },
  { value: "urgent",    label: "Urgent — within a few days" },
  { value: "routine",   label: "Routine — within a couple of weeks" },
  { value: "flexible",  label: "Flexible — no rush" },
];
