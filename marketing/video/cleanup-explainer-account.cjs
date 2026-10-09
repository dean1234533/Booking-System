// Deletes the real test account created by record-explainer.cjs — the
// Firebase Auth user, the barbers/{uid} doc, any slots it opened, and any
// bookings made against it. Reads clips/explainer-account.json for which
// account, unless an email is passed explicitly.
// Usage: node marketing/video/cleanup-explainer-account.cjs [email]
const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const env = {};
fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const PID = env.VITE_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;

function dec(f) {
  if (!f) return undefined;
  const k = Object.keys(f)[0];
  if (k === "mapValue") return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([kk, vv]) => [kk, dec(vv)]));
  if (k === "arrayValue") return (f.arrayValue.values || []).map(dec);
  return f[k];
}
function decDoc(fields) { return Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, dec(v)])); }

(async () => {
  const email = process.argv[2] || JSON.parse(fs.readFileSync(path.join(__dirname, "clips", "explainer-account.json"), "utf8")).email;
  console.log("Cleaning up test account:", email);

  const auth = new GoogleAuth({
    credentials: { type: "service_account", project_id: PID, private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), client_email: env.FIREBASE_CLIENT_EMAIL },
    scopes: ["https://www.googleapis.com/auth/datastore", "https://www.googleapis.com/auth/identitytoolkit"],
  });
  const token = (await (await auth.getClient()).getAccessToken()).token;
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Find the Firebase Auth user by email — the Admin-scoped accounts:query
  // endpoint accepts the same OAuth bearer token used for Firestore above,
  // no separate API key needed (unlike the public accounts:lookup endpoint).
  const queryRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PID}/accounts:query`, {
    method: "POST", headers: H, body: JSON.stringify({ expression: [{ email }] }),
  });
  const queryData = await queryRes.json();
  const uid = queryData.userInfo?.[0]?.localId;

  if (uid) {
    const delRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PID}/accounts:delete`, {
      method: "POST", headers: H, body: JSON.stringify({ localId: uid }),
    });
    console.log("Deleted Auth user", uid, "status", delRes.status);

    // 2. Delete the barbers/{uid} doc.
    const barberRes = await fetch(`${BASE}/barbers/${uid}`, { headers: H });
    if (barberRes.ok) {
      const barber = decDoc((await barberRes.json()).fields);
      console.log("Deleted barber doc for", barber.businessName || uid, "status", (await fetch(`${BASE}/barbers/${uid}`, { method: "DELETE", headers: H })).status);
    }

    // 3. Delete any slots opened under this uid, and any bookings against them.
    const slotsQ = await fetch(`${BASE}:runQuery`, {
      method: "POST", headers: H,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "slots" }], where: { fieldFilter: { field: { fieldPath: "barberId" }, op: "EQUAL", value: { stringValue: uid } } }, limit: 500 } }),
    }).then(r => r.json());
    const slotIds = (Array.isArray(slotsQ) ? slotsQ : []).filter(r => r.document).map(r => r.document.name.split("/").pop());
    for (const id of slotIds) await fetch(`${BASE}/slots/${id}`, { method: "DELETE", headers: H });
    console.log("Deleted", slotIds.length, "slot(s)");

    const bookingsQ = await fetch(`${BASE}:runQuery`, {
      method: "POST", headers: H,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "bookings" }], where: { fieldFilter: { field: { fieldPath: "barberId" }, op: "EQUAL", value: { stringValue: uid } } }, limit: 500 } }),
    }).then(r => r.json());
    const bookingIds = (Array.isArray(bookingsQ) ? bookingsQ : []).filter(r => r.document).map(r => r.document.name.split("/").pop());
    for (const id of bookingIds) await fetch(`${BASE}/bookings/${id}`, { method: "DELETE", headers: H });
    console.log("Deleted", bookingIds.length, "booking(s)");
  } else {
    console.log("No Auth user found for that email — nothing to delete (may already be cleaned up, or signup never completed).");
  }
})().catch(e => { console.error(e); process.exit(1); });
