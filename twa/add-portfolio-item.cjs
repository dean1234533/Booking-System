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
function arr(items) { return { arrayValue: { values: items } }; }
function map(obj)   { return { mapValue: { fields: obj } }; }

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const DECORATOR_UID = 'cKyzLBNBHuYKBS439GuE74UYEUv1';

  const portfolioItems = arr([
    // 1 — Living Room
    map({
      before: str('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop'),
      after:  str('https://images.unsplash.com/photo-1562619425-c307bb83bc42?w=600&h=400&fit=crop'),
      label:  str('Living Room Transformation'),
    }),
    // 2 — Kitchen
    map({
      before: str('https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=600&h=400&fit=crop'),
      after:  str('https://images.unsplash.com/photo-1560440021-33f9b867899d?w=600&h=400&fit=crop'),
      label:  str('Kitchen Refresh'),
    }),
    // 3 — Bedroom (new)
    map({
      before: str('https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&h=400&fit=crop'),
      after:  str('https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=400&fit=crop'),
      label:  str('Bedroom Makeover'),
    }),
  ]);

  const url = `${BASE}/barbers/${DECORATOR_UID}?updateMask.fieldPaths=portfolioItems`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { portfolioItems } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  console.log('✅  Third portfolio item added — 3 before/after sliders now showing.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
