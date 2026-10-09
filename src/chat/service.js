// Homepage chatbot engine: Workers-AI-backed replies constrained to
// src/config/botFacts.js, lead capture (email/UK phone in-conversation),
// per-session analytics, and the admin lead/stats views. Worker-only
// helpers (Firestore base URL, admin token, Resend, JSON responder) are
// injected via `deps`, matching src/reminders/service.js's pattern — keeps
// this module free of a circular import with worker.js.
import {
  PLANS, FACTS, OBJECTIONS, UNKNOWN_REPLY, BUSINESS_TYPES_SUPPORTED,
  PRIVACY_NOTICE, HESITANT_VISITOR_PROMPT, VOLUNTEERED_LEAD_REPLY,
  detectAudience, greetingForAudience, RECOMMENDED_PLAN, allPlanLines,
} from "../config/botFacts.js";
import { stripHtml, extractEmail, extractUkPhone, redactContactInfo, guessBusinessName, isLikelyNameReply } from "./leadExtraction.js";
import { requireAdmin } from "../admin/requireAdmin.js";
import { fsClient, eq, sha256Hex } from "../reminders/fsrest.js";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const HISTORY_CAP = 10;
const MAX_MESSAGE_LEN = 500;
const SESSION_TRANSCRIPT_CAP = 20;
const SESSION_TTL_DAYS = 90;

async function client(env, deps) {
  const token = await deps.getFirebaseAdminToken(env);
  if (!token) throw new Error("no firebase admin token");
  return fsClient(deps.firestoreBase(env.VITE_FIREBASE_PROJECT_ID), env.VITE_FIREBASE_PROJECT_ID, token);
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1");
}

// ── System prompt, built from the facts file ────────────────────────────────
function buildSystemPrompt(audience) {
  const recommended = audience && RECOMMENDED_PLAN[audience];
  return `You are the help assistant on the Bookrightly homepage (bookrightly.co.uk). Friendly, short UK tone. Maximum 3 short sentences per reply. No hype, no exclamation-mark enthusiasm.

You must ONLY answer using the facts below. Never invent features, integrations, prices, timelines, or customer numbers. If something isn't covered by these facts, reply with EXACTLY this sentence and nothing else: "${UNKNOWN_REPLY}"

FACTS:
${FACTS.whatItIs}
${FACTS.commission}
${FACTS.trial}
${FACTS.deposits}
${FACTS.directory}
${FACTS.instagram}
${FACTS.cancelAnytime}
Business types: ${BUSINESS_TYPES_SUPPORTED.join(", ")}.

PLANS:
${allPlanLines()}

${recommended ? `This visitor is likely running a ${audience} business — lead with the ${PLANS[recommended].name} plan when relevant.\n` : ""}
Order of priorities in every reply: 1) answer their actual question from the facts above, 2) if relevant, suggest the plan that fits their business, 3) nudge toward "Start free" (${FACTS.signupUrl}), 4) if they seem interested but hesitate, ask for their email — use this exact message, word for word, nothing added: "${HESITANT_VISITOR_PROMPT}"

IMPORTANT: every single time you ask a visitor for their email or phone number, for ANY reason, that same message must also include this notice: "${PRIVACY_NOTICE}" — never ask for contact details in one message and mention the notice later or not at all.

Reply in plain conversational text only, like a person typing a message — no markdown, no asterisks, no bullet points, no headings, no bold or italics.`;
}

// ── Fallback (AI unavailable) — keyword-matched from the same facts/objections
function matchFallbackAnswer(message) {
  const words = message.toLowerCase();
  let best = null, bestScore = 0;
  for (const entry of OBJECTIONS) {
    const score = entry.keywords.reduce((acc, kw) => acc + (words.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return best ? best.answer : UNKNOWN_REPLY;
}

// ── Rate limiting — per IP, 30 messages / 10 minutes, tracked in Firestore ──
// so it survives across the Worker's many isolates (an in-memory counter
// wouldn't). One tiny doc per IP; cheap next to the AI call it's gating.
async function checkRateLimit(fs, ip) {
  if (!ip) return true; // no IP header available (e.g. local dev) — never block
  const id = await sha256Hex(ip);
  const path = `chatRateLimits/${id}`;
  const now = Date.now();
  const doc = await fs.get(path);
  if (!doc || now - (doc.windowStart || 0) > RATE_LIMIT_WINDOW_MS) {
    await fs.patch(path, { windowStart: now, count: 1 });
    return true;
  }
  if (doc.count >= RATE_LIMIT_MAX) return false;
  await fs.patch(path, { count: (doc.count || 0) + 1 });
  return true;
}

// ── Session analytics upsert ────────────────────────────────────────────────
async function upsertSession(fs, sessionId, patch) {
  if (!sessionId) return;
  await fs.patch(`chatSessions/${sessionId}`, patch).catch(err => console.error("[chat] session upsert failed:", err.message));
}

// ── Lead capture ─────────────────────────────────────────────────────────────
async function saveLead(fs, env, deps, { sessionId, email, phone, businessName, audience, utm, landingPath, messages }) {
  const leadId = sessionId || (await sha256Hex(`${email || ""}${phone || ""}${Date.now()}`));
  const existing = await fs.get(`chatLeads/${leadId}`).catch(() => null);
  if (existing) {
    // Merge in anything new (e.g. phone arrives in a later message than email).
    await fs.patch(`chatLeads/${leadId}`, {
      ...(email && !existing.email ? { email } : {}),
      ...(phone && !existing.phone ? { phone } : {}),
      ...(businessName && !existing.businessName ? { businessName } : {}),
      transcript: messages.slice(-20),
    });
    return { leadId, isNew: false };
  }
  await fs.create("chatLeads", leadId, {
    email: email || "", phone: phone || "", businessName: businessName || "",
    businessType: audience || "", audience: audience || "",
    utmSource: utm.utmSource || "", utmCampaign: utm.utmCampaign || "", utmContent: utm.utmContent || "",
    landingPath: landingPath || "", transcript: messages.slice(-20),
    createdAt: new Date().toISOString(), status: "new",
  });
  return { leadId, isNew: true };
}

async function sendLeadNotificationEmail(env, deps, { businessName, email, phone, audience, messages }) {
  if (!env.RESEND_API_KEY || !env.ADMIN_NOTIFICATION_EMAIL) return;
  try {
    const resend = new deps.Resend(env.RESEND_API_KEY);
    const last5 = messages.slice(-5).map(m => `${m.role === "user" ? "Visitor" : "Bot"}: ${m.content}`).join("\n");
    await resend.emails.send({
      from: "Bookrightly <info@bookrightly.co.uk>",
      to: [env.ADMIN_NOTIFICATION_EMAIL],
      subject: `New Bookrightly lead: ${businessName || email || phone || "Unknown"}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;">
          <h2 style="margin:0 0 12px;">New chat lead</h2>
          <p><strong>Business:</strong> ${businessName || "(not given)"}<br/>
          <strong>Type:</strong> ${audience || "(unknown)"}<br/>
          <strong>Email:</strong> ${email || "(not given)"}<br/>
          <strong>Phone:</strong> ${phone || "(not given)"}</p>
          <p><strong>Last messages:</strong></p>
          <pre style="white-space:pre-wrap;background:#f4f1e9;padding:12px;border-radius:8px;font-size:13px;">${last5.replace(/</g, "&lt;")}</pre>
        </div>`,
    });
  } catch (err) {
    console.error("[chat] lead notification email failed:", err.message);
  }
}

// ── POST /api/chat ───────────────────────────────────────────────────────────
export async function handleChat(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { return deps.json({ error: "Invalid JSON body" }, 400); }

  const rawMessage = (body?.message || "").toString();
  const message = stripHtml(rawMessage).trim().slice(0, MAX_MESSAGE_LEN);
  const sessionId = (body?.sessionId || "").toString().slice(0, 100) || null;
  const audience = ["barber", "salon", "pt"].includes(body?.audience) ? body.audience : detectAudience(body?.landingPath);
  const utm = {
    utmSource: (body?.utmSource || "").toString().slice(0, 100),
    utmCampaign: (body?.utmCampaign || "").toString().slice(0, 100),
    utmContent: (body?.utmContent || "").toString().slice(0, 100),
  };
  const landingPath = (body?.landingPath || "").toString().slice(0, 200);
  const history = Array.isArray(body?.history)
    ? body.history.slice(-HISTORY_CAP).filter(m => m?.role && m?.content).map(m => ({ role: m.role, content: stripHtml(m.content).slice(0, MAX_MESSAGE_LEN) }))
    : [];

  if (!message) return deps.json({ error: "Missing message" }, 400);

  let fs;
  try { fs = await client(env, deps); } catch { fs = null; }

  // Rate limit, per IP — fail OPEN (never block the visitor) if Firestore/IP
  // lookup itself fails; this is abuse protection, not a hard dependency.
  const ip = request.headers.get("CF-Connecting-IP");
  if (fs) {
    try {
      const allowed = await checkRateLimit(fs, ip);
      if (!allowed) return deps.json({ reply: "You're sending messages a bit fast — give it a minute and try again, or email support directly.", source: "rate_limited" });
    } catch (err) { console.error("[chat] rate limit check failed:", err.message); }
  }

  const allMessages = [...history, { role: "user", content: message }];

  // The short reply right after "what's your shop called?" is a name, not a
  // question — answer it directly rather than sending it to the AI/fallback.
  let reply;
  let source;
  if (isLikelyNameReply(allMessages) && message.length <= 60) {
    reply = "Got it, thanks! Want me to show you how it'd look, or just send you the free sign-up link?";
    source = "name_ack";
  } else {
    try {
      const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: [
          { role: "system", content: buildSystemPrompt(audience) },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: message },
        ],
      });
      reply = stripMarkdown(result?.response?.trim() || "");
      if (!reply) throw new Error("Empty response from model");
      source = "ai";
    } catch (err) {
      console.error("[chat] falling back:", err.message);
      reply = matchFallbackAnswer(message);
      source = "fallback";
    }
  }

  // Lead detection — across the WHOLE conversation so far, not just this message.
  const email = allMessages.map(m => extractEmail(m.content)).find(Boolean) || null;
  const phone = allMessages.map(m => extractUkPhone(m.content)).find(Boolean) || null;
  const businessName = guessBusinessName(allMessages);
  let leadCaptured = false;
  let startFreeUrl = null;

  if ((email || phone) && fs) {
    try {
      const { isNew } = await saveLead(fs, env, deps, { sessionId, email, phone, businessName, audience, utm, landingPath, messages: allMessages });
      leadCaptured = true;
      if (isNew) await sendLeadNotificationEmail(env, deps, { businessName, email, phone, audience, messages: allMessages });
      // Volunteered (not asked for) — the notice comes after the thanks here,
      // a different order to HESITANT_VISITOR_PROMPT/UNKNOWN_REPLY above,
      // but still always one single message, never a separate follow-up.
      reply = VOLUNTEERED_LEAD_REPLY;
      source = "lead_captured";
      const recommendedPlan = (audience && RECOMMENDED_PLAN[audience]) || "free";
      startFreeUrl = `${FACTS.signupUrl}?plan=${recommendedPlan}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ""}`;
    } catch (err) {
      console.error("[chat] lead capture failed:", err.message);
    }
  }

  if (fs) {
    try {
      const existing = await fs.get(`chatSessions/${sessionId}`);
      // chatSessions keeps its OWN transcript (every conversation, not just
      // leads — unlike chatLeads' transcript, this one has the visitor's
      // contact details redacted before they're ever written, since this
      // collection has no lead-specific purpose that needs them unredacted).
      const transcript = [
        ...(existing?.transcript || []),
        { role: "user", content: redactContactInfo(message), timestamp: new Date().toISOString() },
        { role: "assistant", content: reply, timestamp: new Date().toISOString() },
      ].slice(-SESSION_TRANSCRIPT_CAP);
      await upsertSession(fs, sessionId, {
        audience: audience || "", utmSource: utm.utmSource, utmCampaign: utm.utmCampaign, utmContent: utm.utmContent,
        landingPath, messagesCount: (existing?.messagesCount || 0) + 1, transcript,
        ...(leadCaptured ? { leadCaptured: true } : {}),
        ...(existing ? {} : {
          opened: body?.openedAs || "none", createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000), // Firestore TTL policy — see CLAUDE.md/README setup step
        }),
      });
    } catch (err) { console.error("[chat] session update failed:", err.message); }
  }

  return deps.json({ reply, source, leadCaptured, startFreeUrl, audience });
}

// ── POST /api/chat-event — non-message session events (opened, closed,
// clicked Start free, signed up) so sessions are tracked even if the
// visitor never typed anything.
export async function handleChatEvent(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { return deps.json({ error: "Invalid JSON body" }, 400); }

  const sessionId = (body?.sessionId || "").toString().slice(0, 100);
  const event = (body?.event || "").toString();
  if (!sessionId || !["opened", "closed", "clicked_start_free", "signed_up"].includes(event)) {
    return deps.json({ error: "Missing or invalid sessionId/event" }, 400);
  }

  try {
    const fs = await client(env, deps);
    const existing = await fs.get(`chatSessions/${sessionId}`);
    const patch = {
      audience: (body?.audience || existing?.audience || "").toString(),
      utmSource: (body?.utmSource || existing?.utmSource || "").toString(),
      utmCampaign: (body?.utmCampaign || existing?.utmCampaign || "").toString(),
      utmContent: (body?.utmContent || existing?.utmContent || "").toString(),
      landingPath: (body?.landingPath || existing?.landingPath || "").toString(),
      ...(existing ? {} : {
        messagesCount: 0, leadCaptured: false, createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000),
      }),
      ...(event === "opened" ? { opened: (body?.openedAs || "manual").toString() } : {}),
      ...(event === "clicked_start_free" ? { clickedStartFree: true } : {}),
      ...(event === "signed_up" ? { signedUp: true } : {}),
    };
    await fs.patch(`chatSessions/${sessionId}`, patch);
    return deps.json({ ok: true });
  } catch (err) {
    console.error("[chat-event]", err.message);
    return deps.json({ ok: false }, 200); // best-effort analytics — never block the visitor's actual flow
  }
}

// ── Admin: leads list ────────────────────────────────────────────────────────
export async function handleAdminChatLeads(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body; try { body = await request.json(); } catch { body = {}; }
  const denied = await requireAdmin(request, env, deps, body);
  if (denied) return deps.json({ error: denied.error }, denied.status);

  try {
    const fs = await client(env, deps);
    const limit = Math.min(Number(body.limit) || 200, 500);
    const rows = body.status
      ? await fs.query({ from: [{ collectionId: "chatLeads" }], where: eq("status", body.status), orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit })
      : await fs.query({ from: [{ collectionId: "chatLeads" }], orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }], limit });
    return deps.json({ leads: rows });
  } catch (err) {
    console.error("[admin-chat-leads]", err.message);
    return deps.json({ error: err.message }, 500);
  }
}

// POST /api/admin-chat-lead-update — body: { adminKey, leadId, status }
export async function handleAdminChatLeadUpdate(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body; try { body = await request.json(); } catch { body = {}; }
  const denied = await requireAdmin(request, env, deps, body);
  if (denied) return deps.json({ error: denied.error }, denied.status);
  if (!body.leadId || !["new", "contacted", "won", "lost"].includes(body.status)) {
    return deps.json({ error: "Missing leadId or invalid status" }, 400);
  }

  try {
    const fs = await client(env, deps);
    await fs.patch(`chatLeads/${body.leadId}`, { status: body.status });
    return deps.json({ ok: true });
  } catch (err) {
    return deps.json({ error: err.message }, 500);
  }
}

// ── Admin: stats (7/30 day) + top 10 questions ──────────────────────────────
const STOPWORDS = new Set(["the", "a", "an", "is", "are", "do", "does", "can", "how", "what", "i", "you", "my", "to", "for", "of", "in", "on", "it", "and", "or", "with", "about", "your"]);

function topQuestions(sessions, limit = 10) {
  // Crude but effective for FAQ-spotting: normalise each user message to its
  // non-stopword tokens, then group by that token set so paraphrases of the
  // same question ("how much is it" / "how much does this cost") collapse
  // together without needing embeddings/clustering. Reads chatSessions'
  // transcript (every conversation, redacted) rather than chatLeads' — a
  // visitor who never leaves contact details still shows up here.
  const counts = new Map();
  for (const session of sessions) {
    for (const m of session.transcript || []) {
      if (m.role !== "user") continue;
      const tokens = String(m.content).toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)).sort();
      if (!tokens.length) continue;
      const key = tokens.join(" ");
      const entry = counts.get(key) || { count: 0, example: m.content };
      entry.count++;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function handleAdminChatStats(request, env, deps) {
  if (request.method !== "POST") return deps.json({ error: "Method not allowed" }, 405);
  let body; try { body = await request.json(); } catch { body = {}; }
  const denied = await requireAdmin(request, env, deps, body);
  if (denied) return deps.json({ error: denied.error }, denied.status);

  try {
    const fs = await client(env, deps);
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const [sessions30, leads30] = await Promise.all([
      fs.query({ from: [{ collectionId: "chatSessions" }], where: { fieldFilter: { field: { fieldPath: "createdAt" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: since30 } } }, limit: 2000 }),
      fs.query({ from: [{ collectionId: "chatLeads" }], where: { fieldFilter: { field: { fieldPath: "createdAt" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: since30 } } }, limit: 1000 }),
    ]);

    const since7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const summarize = (sessions, leads) => {
      const bySplit = (list, key) => {
        const m = {};
        for (const row of list) { const k = row[key] || "(none)"; m[k] = (m[k] || 0) + 1; }
        return m;
      };
      return {
        sessions: sessions.length,
        opened: sessions.filter(s => s.opened && s.opened !== "none").length,
        leadsCaptured: leads.length,
        startFreeClicks: sessions.filter(s => s.clickedStartFree).length,
        signUps: sessions.filter(s => s.signedUp).length,
        byAudience: bySplit(sessions, "audience"),
        byCampaign: bySplit(sessions, "utmCampaign"),
      };
    };

    const sessions7 = sessions30.filter(s => s.createdAt >= since7);
    const leads7 = leads30.filter(l => l.createdAt >= since7);

    return deps.json({
      last7: summarize(sessions7, leads7),
      last30: summarize(sessions30, leads30),
      topQuestions: topQuestions(sessions30),
    });
  } catch (err) {
    console.error("[admin-chat-stats]", err.message);
    return deps.json({ error: err.message }, 500);
  }
}
