/**
 * Backfill bookingSlug + accountType for existing accounts that predate the
 * Bookrightly vanity-URL feature. Additive only — never touches customDomain,
 * domainStatus, customHostnameId, vercelUrl, or any other existing field.
 * Idempotent — safe to re-run; skips any account that already has a
 * bookingSlug.
 *
 * Candidate slug priority: businessName -> name -> email local-part.
 * On collision, appends -2, -3, etc.
 *
 * Usage: node twa/backfill-booking-slugs.cjs
 */

const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const envVars = {};
fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});

const PROJECT_ID = envVars['VITE_FIREBASE_PROJECT_ID'];
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const auth = new GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: PROJECT_ID,
    private_key: envVars['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n'),
    client_email: envVars['FIREBASE_CLIENT_EMAIL'],
  },
  scopes: ['https://www.googleapis.com/auth/datastore'],
});

async function getToken() {
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

// ── Mirrors src/utils/bookingSlug.js — keep in sync ─────────────────────────
const RESERVED_SLUGS = new Set([
  "shop", "pt-booking", "decorator", "hairdresser", "barber", "book",
  "confirmation", "auth", "review", "login", "signup", "cancel-booking",
  "website-design", "compare", "fresha-alternative", "treatwell-alternative",
  "booking-software", "pricing", "how-it-works", "blog", "tools", "terms",
  "privacy", "contact", "workout", "food-diary", "check-in", "par-q",
  "colour-approval", "quote-view", "queue", "food-generator", "client-portal",
  "pt-book", "onboarding", "dashboard",
  "admin", "api", "account", "settings", "support", "help", "about",
  "bookrightly", "www", "register", "sitemap.xml", "robots.txt",
]);

function sanitizeSlug(raw) {
  return String(raw || "")
    .toLowerCase().trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlugFormat(slug) {
  return /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/.test(slug) && slug.length >= 3 && slug.length <= 30;
}

function extractValue(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(extractValue);
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, extractValue(val)]));
  return undefined;
}

async function listAllBarbers(token) {
  const docs = [];
  let pageToken = undefined;
  do {
    const url = `${BASE}/barbers?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(`List barbers failed: ${JSON.stringify(data)}`);
    (data.documents || []).forEach(d => docs.push(d));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return docs;
}

async function slugTaken(token, slug, claimedThisRun) {
  if (claimedThisRun.has(slug)) return true;
  const res = await fetch(`${BASE}/bookingSlugs/${slug}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.status === 200;
}

async function findAvailableSlug(token, base, claimedThisRun) {
  let candidate = base;
  let suffix = 2;
  while (!candidate || RESERVED_SLUGS.has(candidate) || await slugTaken(token, candidate, claimedThisRun)) {
    candidate = `${base || "business"}-${suffix}`;
    suffix++;
    if (suffix > 50) throw new Error(`Could not find an available slug based on "${base}"`);
  }
  return candidate;
}

async function hasStaff(token, uid) {
  const res = await fetch(`${BASE}/barbers/${uid}/staff?pageSize=1`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return false;
  const data = await res.json();
  return (data.documents || []).length > 0;
}

async function claimSlug(token, uid, slug) {
  // Sentinel doc, doc ID = the slug itself
  const createRes = await fetch(`${BASE}/bookingSlugs?documentId=${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { barberId: { stringValue: uid }, claimedAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(`Claim bookingSlugs/${slug} failed: ${JSON.stringify(err)}`);
  }
}

async function patchBarberFields(token, uid, fields) {
  const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const body = {};
  for (const [k, v] of Object.entries(fields)) {
    body[k] = typeof v === 'string' ? { stringValue: v } : v;
  }
  const res = await fetch(`${BASE}/barbers/${uid}?${fieldPaths}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`PATCH barbers/${uid} failed: ${JSON.stringify(err)}`);
  }
}

async function main() {
  console.log(`\nBackfilling bookingSlug + accountType in ${PROJECT_ID}\n`);
  const token = await getToken();
  console.log('✓ Access token obtained\n');

  const docs = await listAllBarbers(token);
  console.log(`Found ${docs.length} barber accounts\n`);

  const claimedThisRun = new Set();
  let slugsAdded = 0, accountTypesAdded = 0, skipped = 0;

  for (const doc of docs) {
    const uid = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const data = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, extractValue(v)]));

    // Only owners get a booking slug — staff are reached via /barber/:id, unchanged.
    const isStaff = data.role === 'staff';
    const patch = {};

    if (!data.bookingSlug && !isStaff) {
      const candidateBase = sanitizeSlug(data.businessName || data.name || (data.email || '').split('@')[0]);
      try {
        const slug = await findAvailableSlug(token, candidateBase, claimedThisRun);
        await claimSlug(token, uid, slug);
        claimedThisRun.add(slug);
        patch.bookingSlug = slug;
        slugsAdded++;
        console.log(`  ✓ ${uid.slice(0, 10)}… -> bookingSlug: "${slug}"`);
      } catch (e) {
        console.error(`  ✗ ${uid.slice(0, 10)}… slug claim failed: ${e.message}`);
      }
    }

    if (!data.accountType) {
      const team = !isStaff && await hasStaff(token, uid);
      patch.accountType = team ? 'team' : 'solo';
      accountTypesAdded++;
    }

    if (Object.keys(patch).length > 0) {
      await patchBarberFields(token, uid, patch);
    } else {
      skipped++;
    }
  }

  console.log(`\n✅  Done. ${slugsAdded} slugs claimed, ${accountTypesAdded} accountType fields set, ${skipped} accounts already up to date.\n`);
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
