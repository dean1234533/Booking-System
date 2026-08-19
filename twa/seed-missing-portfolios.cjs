// Seeds portfolioItems for the barber, hairdresser and PT demo accounts —
// only the decorator had gallery images. Reuses each account's own
// already-verified logo/hero/services images (proven to load on their
// live public pages today) rather than introducing unverified new URLs.
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

const BARBER_LOGO  = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=600&fit=crop';
const BARBER_HERO  = 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&h=600&fit=crop';

const HAIR_LOGO     = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop';
const HAIR_HERO     = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop';
const HAIR_SERVICES = 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop';

const PT_LOGO = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop';
const PT_HERO = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop';

const PATCHES = [
  {
    label: 'Barber — Fade Factory',
    uid: BARBER_UID,
    portfolioHeading: 'Recent work',
    portfolioSubtext: 'Drag the slider to see the finish.',
    items: [
      item(BARBER_LOGO, BARBER_HERO, 'Skin Fade & Beard Sculpt'),
      item(BARBER_HERO, BARBER_LOGO, 'Precision Cut Finish'),
    ],
  },
  {
    label: 'Hairdresser — Luxe Hair Studio',
    uid: HAIRDRESSER_UID,
    portfolioHeading: 'Recent transformations',
    portfolioSubtext: 'Drag the slider on each image to reveal the difference a fresh cut and colour makes.',
    items: [
      item(HAIR_LOGO, HAIR_HERO, 'Colour & Cut Transformation'),
      item(HAIR_SERVICES, HAIR_HERO, 'Balayage Result'),
      item(HAIR_LOGO, HAIR_SERVICES, 'Precision Styling'),
    ],
  },
  {
    label: 'PT — DB Fitness',
    uid: PT_UID,
    portfolioHeading: 'Client transformations',
    portfolioSubtext: 'Drag the slider on each image to reveal real client results.',
    items: [
      item(PT_LOGO, PT_HERO, '8-Week Transformation'),
      item(PT_HERO, PT_LOGO, 'Strength & Conditioning Progress'),
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
