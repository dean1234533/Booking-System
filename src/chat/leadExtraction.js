// Pure helpers for the homepage chatbot: lead detection (email/UK phone),
// HTML stripping, and a lightweight businessName guess from context. No I/O
// — kept separate from src/chat/service.js so these are unit-testable
// without a network or Firestore.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

// UK mobile (07...) and landline (0[1-9]...), with or without +44/0044, and
// common separators (spaces, hyphens, brackets). Deliberately permissive on
// input formatting — strict only on the digit count after normalising.
const PHONE_CANDIDATE_RE = /(?:\+44\s?|0044\s?|0)\s*\(?\d[\d\s().-]{7,}\d/;

export function stripHtml(text) {
  return String(text ?? "").replace(/<[^>]*>/g, "").trim();
}

// Separate `g`-flagged copies for redaction specifically — a shared `g`
// regex used elsewhere with .test()/.exec() keeps `lastIndex` state between
// calls, which would silently break extractEmail/extractUkPhone's own
// (stateless, non-`g`) matching if they ever pointed at the same object.
const EMAIL_RE_G = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_CANDIDATE_RE_G = /(?:\+44\s?|0044\s?|0)\s*\(?\d[\d\s().-]{7,}\d/g;

// chatSessions stores a transcript of every conversation (not just leads),
// so visitor-typed contact details are redacted before they're written —
// the full, unredacted version only ever lives in chatLeads. Order matters:
// redact email first, since a phone-shaped digit run can occasionally sit
// right next to an email-like string and either pass could otherwise eat
// into the other's match.
export function redactContactInfo(text) {
  return String(text ?? "")
    .replace(EMAIL_RE_G, "[email]")
    .replace(PHONE_CANDIDATE_RE_G, "[phone]");
}

export function extractEmail(text) {
  const m = String(text ?? "").match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

// Returns a UK number in a consistent local-display form ("07700 900123"),
// or null if nothing in the text normalises to a real UK-length number.
export function extractUkPhone(text) {
  const m = String(text ?? "").match(PHONE_CANDIDATE_RE);
  if (!m) return null;
  let digits = m[0].replace(/[^\d+]/g, "");
  if (digits.startsWith("+44")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("0044")) digits = "0" + digits.slice(4);
  if (!/^0\d{9,10}$/.test(digits)) return null;
  return digits;
}

// After the bot asks something like "What's your shop called?" / "your
// salon called?" / "your business called?", the very next short, non-question
// reply is almost always the name itself — simple heuristic, no NLP call,
// matching this codebase's existing keyword-matched-fallback style rather
// than a second AI round-trip just to extract one field.
const NAME_PROMPT_RE = /\b(shop|salon|business|studio|gym)\s+called\??$/i;

export function guessBusinessName(messages) {
  for (let i = messages.length - 1; i >= 1; i--) {
    const prev = messages[i - 1];
    const cur = messages[i];
    if (prev?.role !== "assistant" || cur?.role !== "user") continue;
    if (!NAME_PROMPT_RE.test(String(prev.content ?? "").trim())) continue;
    const reply = String(cur.content ?? "").trim();
    if (reply && reply.length <= 60 && !reply.includes("?")) return reply;
  }
  return null;
}

// true if the message looks like it directly answers "what's your [X]
// called?" — used so that short reply doesn't ALSO get treated as a normal
// question for the AI/fallback matcher to answer (it isn't one).
export function isLikelyNameReply(messages) {
  if (messages.length < 2) return false;
  const prev = messages[messages.length - 2];
  return prev?.role === "assistant" && NAME_PROMPT_RE.test(String(prev.content ?? "").trim());
}
