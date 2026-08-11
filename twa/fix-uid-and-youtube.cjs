/**
 * 1. Patch `uid` field on all 4 demo accounts so templates can self-identify for slot queries
 * 2. Add youtubeUrl to PT account only
 * 3. Seed slots for the decorator (site visit bookings)
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
  credentials: { type: 'service_account', project_id: PROJECT_ID, private_key: envVars['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n'), client_email: envVars['FIREBASE_CLIENT_EMAIL'] },
  scopes: ['https://www.googleapis.com/auth/datastore'],
});

function str(v)  { return { stringValue: v }; }
function bool(v) { return { booleanValue: v }; }

async function getToken() {
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function patchFields(token, uid, fields, maskPaths) {
  const mask = maskPaths.map(f => `updateMask.fieldPaths=${f}`).join('&');
  const url = `${BASE}/barbers/${uid}?${mask}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`PATCH ${uid}: ${JSON.stringify(json)}`);
}

async function addDoc(token, collPath, fields) {
  const res = await fetch(`${BASE}/${collPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${collPath}: ${JSON.stringify(json)}`);
}

const BARBER_UID      = 'S5s1FWMaz1XuAEo8gDSTTIqlqgL2';
const HAIRDRESSER_UID = 'xyPHCqfFgoYympmcqUAzNS37URG3';
const DECORATOR_UID   = 'cKyzLBNBHuYKBS439GuE74UYEUv1';
const PT_UID          = 'Ih8OFcRzvuS3QbwtsYPeUFCnUEo1';

const DATES = [
  '2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-18',
  '2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-25',
];

async function main() {
  console.log('\nFixing uid fields + PT youtubeUrl + decorator slots\n');
  const token = await getToken();
  console.log('✓ Token obtained\n');

  // 1. Patch uid on all 4 accounts
  for (const [label, uid] of [
    ['Barber', BARBER_UID],
    ['Hairdresser', HAIRDRESSER_UID],
    ['Decorator', DECORATOR_UID],
    ['PT', PT_UID],
  ]) {
    await patchFields(token, uid, { uid: str(uid) }, ['uid']);
    console.log(`✓ uid set on ${label}`);
  }

  // 2. Add youtubeUrl to PT only
  // Joe Wicks "20 Minute Full Body Workout" - The Body Coach TV
  await patchFields(token, PT_UID, { youtubeUrl: str('https://www.youtube.com/watch?v=Rj5S4_pWOQo') }, ['youtubeUrl']);
  console.log('✓ youtubeUrl set on PT');

  // 3. Seed decorator slots (morning site visit windows Mon-Fri)
  const today = new Date().toISOString().split('T')[0];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00'];
  let count = 0;
  for (const date of DATES) {
    if (date < today) continue;
    for (const time of times) {
      await addDoc(token, 'slots', {
        barberId:  str(DECORATOR_UID),
        shopId:    str(DECORATOR_UID),
        date:      str(date),
        time:      str(time),
        isBooked:  bool(false),
        status:    str('open'),
        isStaff:   bool(false),
        createdAt: str(new Date().toISOString()),
      });
      count++;
      process.stdout.write(`\r  Decorator slots: ${count}`);
    }
  }
  console.log(`\r✓ ${count} decorator slots created`);
  console.log('\n✅  All done!\n');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
