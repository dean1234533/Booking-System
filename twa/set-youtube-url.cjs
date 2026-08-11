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

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  const UID = 'Ih8OFcRzvuS3QbwtsYPeUFCnUEo1'; // DB Fitness PT
  const url = `${BASE}/barbers/${UID}?updateMask.fieldPaths=youtubeUrl`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { youtubeUrl: { stringValue: 'https://youtu.be/vlR0Z2tu9YI' } } }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  console.log('✅  youtubeUrl updated on DB Fitness');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
