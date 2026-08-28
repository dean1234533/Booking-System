// Seeds portfolioItems for the barber, hairdresser and PT demo accounts —
// only the decorator had gallery images. Uses matched local before/after
// pairs so each slider keeps the same subject, framing and lighting.
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

const str = v => ({ stringValue: v });
const arr = items => ({ arrayValue: { values: items } });
const map = obj => ({ mapValue: { fields: obj } });
const item = (before, after, label) => map({ before: str(before), after: str(after), label: str(label) });

const BARBER_UID      = 'S5s1FWMaz1XuAEo8gDSTTIqlqgL2';
const HAIRDRESSER_UID = 'xyPHCqfFgoYympmcqUAzNS37URG3';
const PT_UID          = 'Ih8OFcRzvuS3QbwtsYPeUFCnUEo1';

const PATCHES = [
  {
    label: 'Barber — Fade Factory',
    uid: BARBER_UID,
    portfolioHeading: 'Recent work',
    portfolioSubtext: 'Drag the slider to see the finish.',
    items: [
      item('/images/demo/barber/skin-fade-before.jpg', '/images/demo/barber/skin-fade-after.jpg', 'Skin Fade & Beard Sculpt'),
      item('/images/demo/barber/curly-taper-before.jpg', '/images/demo/barber/curly-taper-after.jpg', 'Curly Taper & Line-Up'),
      item('/images/demo/barber/textured-crop-before.jpg', '/images/demo/barber/textured-crop-after.jpg', 'Textured Crop & Beard Shape'),
    ],
  },
  {
    label: 'Hairdresser — Luxe Hair Studio',
    uid: HAIRDRESSER_UID,
    portfolioHeading: 'Recent transformations',
    portfolioSubtext: 'Drag the slider on each image to reveal the difference a fresh cut and colour makes.',
    items: [
      item('/images/demo/hairdresser/balayage-before.jpg', '/images/demo/hairdresser/balayage-after.jpg', 'Honey Balayage & Long Layers'),
      item('/images/demo/hairdresser/brunette-lob-before.jpg', '/images/demo/hairdresser/brunette-lob-after.jpg', 'Glossy Brunette Lob'),
      item('/images/demo/hairdresser/curly-cut-before.jpg', '/images/demo/hairdresser/curly-cut-after.jpg', 'Curl Definition & Shape'),
    ],
  },
  {
    label: 'PT — DB Fitness',
    uid: PT_UID,
    portfolioHeading: 'Client transformations',
    portfolioSubtext: 'Drag the slider on each image to reveal real client results.',
    items: [
      item('/images/demo/trainer/male-strength-before.jpg', '/images/demo/trainer/male-strength-after.jpg', '12-Month Strength Transformation'),
      item('/images/demo/trainer/female-strength-before.jpg', '/images/demo/trainer/female-strength-after.jpg', '9-Month Strength Transformation'),
      item('/images/demo/trainer/six-month-strength-before.jpg', '/images/demo/trainer/six-month-strength-after.jpg', '6-Month Strength Transformation'),
    ],
  },
];

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  for (const p of PATCHES) {
    const url = `${BASE}/barbers/${p.uid}?updateMask.fieldPaths=portfolioItems&updateMask.fieldPaths=portfolioHeading&updateMask.fieldPaths=portfolioSubtext`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          portfolioItems: arr(p.items),
          portfolioHeading: str(p.portfolioHeading),
          portfolioSubtext: str(p.portfolioSubtext),
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`${p.label}: ${JSON.stringify(json)}`);
    console.log(`✅  ${p.label} — ${p.items.length} portfolio items added.`);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
