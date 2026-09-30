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
const BARBER_ID = 'sXRl6tHeg0QTd4GLSQfXDtke2D72';

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE}:runQuery`, {
    method: 'POST', headers,
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'bookings' }],
      where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'barberId' }, op: 'EQUAL', value: { stringValue: BARBER_ID } } },
      ] } },
    } }),
  });
  const results = await res.json();
  const bookings = (results || []).filter(r => r.document).map(r => ({
    id: r.document.name.split('/').pop(),
    slotId: r.document.fields.slotId?.stringValue,
    status: r.document.fields.status?.stringValue,
    name: r.document.fields.name?.stringValue,
    date: r.document.fields.date?.stringValue,
    time: r.document.fields.time?.stringValue,
  }));
  console.log('All bookings for Trim:');
  for (const b of bookings) console.log(' ', JSON.stringify(b));

  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'completed') continue;
    if (!b.slotId) continue;
    const slotRes = await fetch(`${BASE}/slots/${b.slotId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (slotRes.status === 404) {
      console.log(`  -> booking ${b.id}: slot ${b.slotId} no longer exists (deleted) -- orphaned`);
      continue;
    }
    const slotDoc = await slotRes.json();
    const isBooked = slotDoc.fields?.isBooked?.booleanValue;
    const slotStatus = slotDoc.fields?.status?.stringValue;
    if (isBooked === false || slotStatus === 'open') {
      console.log(`  -> booking ${b.id}: slot ${b.slotId} is now open/unbooked -- orphaned`);
    }
  }
}
main().catch(e => console.error(e.message));
