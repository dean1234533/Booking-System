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

const str = v => ({ stringValue: String(v) });
const num = v => ({ integerValue: String(v) });

const DEMOS = [
  {
    uid: 'S5s1FWMaz1XuAEo8gDSTTIqlqgL2',
    name: 'Fade Factory',
    fields: {
      address:      str('14 Brick Lane, Shoreditch, London E1 6RF'),
      phone:        str('020 7123 4567'),
      aboutUs:      str('Fade Factory is East London\'s go-to barbershop for sharp fades, clean lines, and precision cuts. Our experienced barbers have been crafting styles since 2015, serving clients from Shoreditch, Bethnal Green, and beyond. Walk-ins welcome, online booking recommended.'),
      openingHours: str('Mon–Fri: 9am – 7pm\nSaturday: 9am – 6pm\nSunday: 10am – 4pm'),
      stat1Value:   str('2,400+'),
      stat1Label:   str('Cuts This Year'),
      stat2Value:   str('4.9★'),
      stat2Label:   str('Google Rating'),
      stat3Value:   str('9 yrs'),
      stat3Label:   str('Est. 2015'),
    }
  },
  {
    uid: 'xyPHCqfFgoYympmcqUAzNS37URG3',
    name: 'Luxe Hair Studio',
    fields: {
      address:      str('38 Carnaby Street, Soho, London W1F 9PS'),
      phone:        str('020 7987 6543'),
      aboutUs:      str('Luxe Hair Studio is a boutique Soho salon specialising in colour, balayage, and precision cuts for all hair types. Founded by award-winning stylist Maya Chen, our team of six dedicated stylists creates looks that are as individual as you are. We use only premium sustainable products.'),
      openingHours: str('Mon–Wed: 10am – 7pm\nThu–Fri: 9am – 8pm\nSaturday: 9am – 6pm\nSunday: Closed'),
      stat1Value:   str('1,800+'),
      stat1Label:   str('Happy Clients'),
      stat2Value:   str('4.8★'),
      stat2Label:   str('Average Rating'),
      stat3Value:   str('6 yrs'),
      stat3Label:   str('Est. 2018'),
    }
  },
  {
    uid: 'cKyzLBNBHuYKBS439GuE74UYEUv1',
    name: 'Premier Painters London',
    fields: {
      address:      str('Serving all London boroughs — free quotes available'),
      phone:        str('020 8456 7890'),
      aboutUs:      str('Premier Painters London is a family-run decorating company with over 15 years of experience transforming homes and commercial spaces across the capital. From single rooms to full-house renovations, we deliver exceptional finishes using premium paints and materials. All work is fully insured and guaranteed.'),
      openingHours: str('Mon–Fri: 7:30am – 5:30pm\nSaturday: 8am – 2pm\nSunday: Closed'),
      stat1Value:   str('500+'),
      stat1Label:   str('Projects Completed'),
      stat2Value:   str('4.9★'),
      stat2Label:   str('Customer Rating'),
      stat3Value:   str('15 yrs'),
      stat3Label:   str('Est. 2009'),
    }
  },
  {
    uid: 'Ih8OFcRzvuS3QbwtsYPeUFCnUEo1',
    name: 'DB Fitness',
    fields: {
      address:      str('Battersea Power Station, London SW8 5BN'),
      phone:        str('07700 900 123'),
      aboutUs:      str('DB Fitness is a premium personal training service based in South London, delivering high-performance outdoor and gym-based training programmes. Coach Dean specialises in strength, conditioning, and body transformation — helping busy professionals and athletes achieve results that last.'),
      openingHours: str('Mon–Fri: 6am – 8pm\nSaturday: 7am – 4pm\nSunday: 8am – 12pm'),
      stat1Value:   str('120+'),
      stat1Label:   str('Active Clients'),
      stat2Value:   str('5.0★'),
      stat2Label:   str('Average Rating'),
      stat3Value:   str('8 yrs'),
      stat3Label:   str('Est. 2016'),
    }
  },
];

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  for (const demo of DEMOS) {
    const fieldPaths = Object.keys(demo.fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const url = `${BASE}/barbers/${demo.uid}?${fieldPaths}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: demo.fields }),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(`❌ ${demo.name}:`, JSON.stringify(json));
    } else {
      console.log(`✅ ${demo.name} — address, phone, hours, stats updated`);
    }
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
