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

const UIDS = {
  'Barber (S5s1...)': 'S5s1FWMaz1XuAEo8gDSTTIqlqgL2',
  'Hairdresser (xyPH...)': 'xyPHCqfFgoYympmcqUAzNS37URG3',
  'Decorator (cKyz...)': 'cKyzLBNBHuYKBS439GuE74UYEUv1',
  'PT (Ih8O...)': 'Ih8OFcRzvuS3QbwtsYPeUFCnUEo1',
};

const SHOW_FIELDS = ['businessName','businessType','brandColor','logoUrl','heroImage','photoURL','profilePic','name','specialty'];

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  for (const [label, uid] of Object.entries(UIDS)) {
    const res = await fetch(`${BASE}/barbers/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
    const doc = await res.json();
    const fields = doc.fields || {};
    console.log(`\n── ${label} ──`);
    for (const f of SHOW_FIELDS) {
      if (fields[f]) console.log(`  ${f}: ${JSON.stringify(extractValue(fields[f]))}`);
    }
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
