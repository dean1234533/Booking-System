/**
 * Fix service prices — store as plain numbers so formatCurrency() works.
 * Only patches the `services` array on each account. Nothing else is touched.
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

// Firestore value helpers — price stored as integer so formatCurrency works
function str(v)     { return { stringValue: v }; }
function num(v)     { return { integerValue: String(Math.round(v)) }; }
function arr(items) { return { arrayValue: { values: items } }; }
function map(obj)   { return { mapValue: { fields: obj } }; }

function svc(name, price, duration, description) {
  const f = { name: str(name), price: num(price) };
  if (duration)    f.duration    = num(duration);
  if (description) f.description = str(description);
  return map(f);
}

// For decorator — price is shown as `£${price}` so must also be a number
// For PT services rendered on PTBookingSite — stored as string but won't show £NaN
// since PTBookingSite uses its own hardcoded plans, not the services array from Firestore

const ACCOUNTS = {
  // Barber — Fade Factory
  S5s1FWMaz1XuAEo8gDSTTIqlqgL2: arr([
    svc('Skin Fade',           25, 30),
    svc('Haircut & Style',     20, 30),
    svc('Beard Trim & Shape',  15, 20),
    svc('Cut & Beard Combo',   35, 45),
    svc('Hot Towel Shave',     20, 30),
    svc('Kids Cut (under 12)', 15, 25),
  ]),

  // Hairdresser — Luxe Hair Studio
  xyPHCqfFgoYympmcqUAzNS37URG3: arr([
    svc("Women's Cut & Blow Dry", 55,  60),
    svc("Men's Cut & Style",      35,  45),
    svc('Full Colour',            85, 120),
    svc('Highlights / Balayage', 110, 150),
    svc('Keratin Treatment',     150, 180),
    svc('Deep Conditioning',      30,  30),
  ]),

  // Decorator — Premier Painters London (price rendered as £${price})
  cKyzLBNBHuYKBS439GuE74UYEUv1: arr([
    svc('Interior Room Painting',   200, null, 'Full prep, prime and two coats of your chosen colour.'),
    svc('Exterior House Painting',  500, null, 'Weatherproof finish using premium outdoor paints.'),
    svc('Feature Wall',             150, null, 'Statement walls in bold colours or textured finishes.'),
    svc('Full Property Refresh',   1200, null, 'Complete interior repaint, all rooms included.'),
    svc('Wallpaper Hanging',        180, null, 'Expert hanging of all wallpaper types.'),
  ]),

  // PT — DB Fitness
  Ih8OFcRzvuS3QbwtsYPeUFCnUEo1: arr([
    svc('1-on-1 PT Session (60 min)',      65, 60),
    svc('Small Group Training (up to 4)', 25, 60),
    svc('Nutrition Consultation',         50, 45),
  ]),
};

async function patchField(token, uid, fieldName, value) {
  // updateMask.fieldPaths limits the patch to only this field
  const url = `${BASE}/barbers/${uid}?updateMask.fieldPaths=${fieldName}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { [fieldName]: value } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`PATCH barbers/${uid} [${fieldName}]: ${JSON.stringify(json)}`);
}

async function main() {
  console.log(`\nFixing service prices in ${PROJECT_ID}\n`);
  const token = await getToken();
  console.log('✓ Access token obtained\n');

  for (const [uid, services] of Object.entries(ACCOUNTS)) {
    console.log(`  Patching services → barbers/${uid.slice(0, 12)}…`);
    await patchField(token, uid, 'services', services);
    console.log('  ✓ Done');
  }

  console.log('\n✅  Service prices fixed — all values are now plain numbers.\n');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
