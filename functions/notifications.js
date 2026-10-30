"use strict";

/**
 * Notification triggers for coach.dbworkouts.co.uk.
 *
 * Every watched Firestore write produces:
 *   1. An in-app feed entry for the trainer   -> barbers/{id}/notifications
 *   2. An admin feed entry                    -> adminNotifications
 *   3. An email to the admin (all but quiet events)
 *   4. An email to the trainer when the change came from someone else
 *      (client form, booking, review, billing, ...)
 *
 * Writes use the Admin SDK, so they bypass security rules; the rules only
 * let the trainer read/mark-read their own feed.
 */

const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");

const ADMIN_EMAIL = "dbsworkouts@gmail.com";
const DASHBOARD_URL = "https://coach.dbworkouts.co.uk/dashboard";

// path pattern -> how it is described.
//  label:   noun used in the message
//  external: true when the write usually comes from a client/visitor
//  quiet:   feed only, no email (high-frequency housekeeping)
const WATCHED = [
  {path: "bookings/{docId}", label: "booking", external: true, top: true},
  {path: "slots/{docId}", label: "availability slot", quiet: true, top: true},
  {path: "barbers/{barberId}/clients/{docId}", label: "client"},
  {path: "barbers/{barberId}/clients/{clientId}/messages/{docId}", label: "client message"},
  {path: "barbers/{barberId}/clients/{clientId}/activities/{docId}", label: "session logged"},
  {path: "barbers/{barberId}/clients/{clientId}/consultationNotes/{docId}", label: "consultation note"},
  {path: "barbers/{barberId}/clients/{clientId}/nutritionPlans/{docId}", label: "nutrition plan"},
  {path: "barbers/{barberId}/workoutPlans/{docId}", label: "workout plan"},
  {path: "barbers/{barberId}/reviews/{docId}", label: "review", external: true},
  {path: "barbers/{barberId}/foodDiarySubmissions/{docId}", label: "food diary entry", external: true},
  {path: "barbers/{barberId}/checkInSubmissions/{docId}", label: "client check-in", external: true},
  {path: "barbers/{barberId}/parQSubmissions/{docId}", label: "PAR-Q form", external: true},
  {path: "barbers/{barberId}/liveQueue/{docId}", label: "queue entry", external: true},
  {path: "barbers/{barberId}/colourPalettes/{palId}/approvals/{docId}", label: "approval", external: true},
  {path: "barbers/{barberId}/colourPalettes/{docId}", label: "colour palette"},
  {path: "barbers/{barberId}/income/{docId}", label: "income record"},
  {path: "barbers/{barberId}/expenses/{docId}", label: "expense record"},
  {path: "barbers/{barberId}/invoices/{docId}", label: "invoice"},
  {path: "barbers/{barberId}/quotes/{docId}", label: "quote"},
  {path: "barbers/{barberId}/automationSchedules/{docId}", label: "automation"},
  {path: "barbers/{barberId}/staff/{docId}", label: "staff member"},
  {path: "barbers/{barberId}/foodGeneratorLinks/{docId}", label: "food generator link"},
  {path: "barbers/{barberId}/notepadCategories/{docId}", label: "notepad", quiet: true},
  {path: "barbers/{barberId}/customFoods/{docId}", label: "custom food", quiet: true},
  {path: "barbers/{barberId}/favoriteExercises/{docId}", label: "favourite exercise", quiet: true},
  {path: "barbers/{barberId}/dayPlan/{dayKey}/jobs/{docId}", label: "day planner job", quiet: true},
  {path: "barbers/{barberId}/calendarSettings/{docId}", label: "calendar sync setting", quiet: true},
  {path: "barbers/{barberId}/config/{docId}", label: "site setting", quiet: true},
];

// Fields on the trainer's profile doc that are worth announcing when they change.
const PROFILE_FIELDS = {
  subscriptionStatus: "subscription status",
  stripeConnected: "Stripe connection",
  customDomain: "custom domain",
  domainStatus: "domain status",
  businessName: "business name",
  brandColor: "brand colour",
  services: "services",
  phone: "phone number",
  email: "email",
  bio: "bio",
  photoURL: "profile photo",
};

function s(v) {
  return v === undefined || v === null ? "" : String(v);
}

function describe(data) {
  if (!data) return "";
  const pick = (...keys) => keys.map((k) => s(data[k])).find((v) => v && v.length < 80) || "";
  const who = pick("clientName", "name", "displayName", "customerName", "clientEmail", "title");
  const when = [pick("date", "slotDate"), pick("time", "slotTime")].filter(Boolean).join(" ");
  const amt = data.amount != null ? `£${data.amount}` : "";
  return [who, when, amt].filter(Boolean).join(" · ");
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function esc(t) {
  return s(t).replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));
}

async function sendMail(to, subject, lines) {
  if (!to) return;
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {user: GMAIL_USER.value(), pass: GMAIL_PASS.value()},
    });
    await transporter.sendMail({
      from: `DB's Workouts Coach <${GMAIL_USER.value()}>`,
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 12px">${esc(subject)}</h2>
        ${lines.filter(Boolean).map((l) => `<p style="margin:6px 0;color:#333">${esc(l)}</p>`).join("")}
        <p style="margin-top:20px"><a href="${DASHBOARD_URL}" style="color:#C9A84C;font-weight:700">Open dashboard</a></p>
      </div>`,
    });
  } catch (err) {
    // Never let a mail failure break the trigger (or cause retries/duplicates).
    console.error("[notify] mail failed:", err.message);
  }
}

/**
 * Record + deliver a notification.
 * @param {object} n {barberId, kind, action, label, detail, external, quiet, path}
 */
async function notify(n) {
  const db = admin.firestore();
  const ts = admin.firestore.FieldValue.serverTimestamp();

  let trainer = {};
  if (n.barberId) {
    const snap = await db.doc(`barbers/${n.barberId}`).get();
    trainer = snap.exists ? snap.data() : {};
  }
  const trainerName = trainer.businessName || trainer.name || n.barberId || "Unknown trainer";
  const title = n.title || `${n.label} ${n.action}`;
  const body = n.detail || "";

  const entry = {
    title,
    body,
    kind: n.kind || n.label,
    action: n.action,
    path: n.path,
    read: false,
    createdAt: ts,
  };

  const writes = [
    db.collection("adminNotifications").add({...entry, barberId: n.barberId || null, trainerName, trainerEmail: trainer.email || null}),
  ];
  if (n.barberId) writes.push(db.collection(`barbers/${n.barberId}/notifications`).add(entry));
  await Promise.all(writes);

  if (n.quiet) return;

  const lines = [`Trainer: ${trainerName}`, body, `Time: ${new Date().toISOString()}`];
  const mails = [sendMail(ADMIN_EMAIL, `[Coach] ${title} — ${trainerName}`, lines)];
  if (n.barberId && trainer.email && trainer.email !== ADMIN_EMAIL && (n.external || n.alwaysTrainer)) {
    mails.push(sendMail(trainer.email, title, [body, "Log in to your dashboard to see the details."]));
  }
  await Promise.all(mails);
}

const exportsMap = {};

WATCHED.forEach((cfg, i) => {
  exportsMap[`notify_${i}_${cfg.label.replace(/[^a-z]/gi, "")}`] = onDocumentWritten(
      {document: cfg.path, secrets: [GMAIL_USER, GMAIL_PASS]},
      async (event) => {
        const before = event.data.before.exists ? event.data.before.data() : null;
        const after = event.data.after.exists ? event.data.after.data() : null;
        if (before && after && same(before, after)) return;

        const action = !before ? "added" : !after ? "removed" : "updated";
        const barberId = cfg.top ?
          (after || before).barberId :
          event.params.barberId;

        await notify({
          barberId,
          label: cfg.label,
          action,
          detail: describe(after || before),
          external: cfg.external && action === "added",
          quiet: cfg.quiet,
          path: event.document,
        });
      },
  );
});

// Trainer signup + profile / billing changes
exportsMap.notifyTrainerProfile = onDocumentWritten(
    {document: "barbers/{barberId}", secrets: [GMAIL_USER, GMAIL_PASS]},
    async (event) => {
      const before = event.data.before.exists ? event.data.before.data() : null;
      const after = event.data.after.exists ? event.data.after.data() : null;
      const {barberId} = event.params;

      if (!before && after) {
        await notify({
          barberId,
          kind: "signup",
          title: "New trainer signed up",
          action: "signed up",
          detail: [after.name || after.displayName, after.email, after.businessName, after.businessType]
              .filter(Boolean).join(" · "),
          alwaysTrainer: true,
          path: event.document,
        });
        return;
      }

      if (before && !after) {
        await notify({
          barberId,
          kind: "account",
          title: "Trainer account deleted",
          action: "deleted",
          detail: [before.name, before.email].filter(Boolean).join(" · "),
          path: event.document,
        });
        return;
      }

      const changed = Object.keys(PROFILE_FIELDS).filter((k) => !same(before[k], after[k]));
      if (!changed.length) return;
      const billing = changed.some((k) => ["subscriptionStatus", "stripeConnected", "customDomain", "domainStatus"].includes(k));
      await notify({
        barberId,
        kind: "profile",
        title: `Dashboard updated: ${changed.map((k) => PROFILE_FIELDS[k]).join(", ")}`,
        action: "updated",
        detail: changed
            .filter((k) => typeof after[k] !== "object" && k !== "bio" && k !== "photoURL")
            .map((k) => `${PROFILE_FIELDS[k]}: ${s(before[k]) || "—"} → ${s(after[k]) || "—"}`)
            .join("; "),
        alwaysTrainer: billing,
        path: event.document,
      });
    },
);

module.exports = exportsMap;
