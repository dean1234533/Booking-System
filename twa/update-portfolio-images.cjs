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

const str = v  => ({ stringValue: v });
const arr = items => ({ arrayValue: { values: items } });
const map = obj  => ({ mapValue: { fields: obj } });

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const DECORATOR_UID = 'cKyzLBNBHuYKBS439GuE74UYEUv1';

  const portfolioItems = arr([
    // 1 — Living Room: dark heavy room → light fresh room
    map({
      before: str('https://images.unsplash.com/photo-1564078516393-cf04bd966897?q=80&w=1200&fit=crop'),
      after:  str('https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1200&fit=crop'),
      label:  str('Living Room — SW London'),
    }),
    // 2 — Kitchen: dark traditional kitchen → bright white modern kitchen
    map({
      before: str('https://images.unsplash.com/photo-1556909172-54557c7e4fb7?q=80&w=1200&fit=crop'),
      after:  str('https://images.unsplash.com/photo-1560440021-33f9b867899d?q=80&w=1200&fit=crop'),
      label:  str('Kitchen — North London'),
    }),
    // 3 — Living Room: olive/green walls → bright neutral modern room
    map({
      before: str('https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=1200&fit=crop'),
      after:  str('https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=1200&fit=crop'),
      label:  str('Living Room — East London'),
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
  console.log('✅  Portfolio images updated — dark/dingy before, freshly painted after.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
