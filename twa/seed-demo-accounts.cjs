/**
 * Seed Bookrightly demo accounts with realistic data.
 * Uses Google Auth Library + Firestore REST API (no firebase-admin needed).
 *
 * Run: node twa/seed-demo-accounts.cjs
 */

const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Read .env manually (no dotenv dependency needed)
const envPath = path.join(__dirname, '../.env');
const envVars = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});

const PROJECT_ID = envVars['VITE_FIREBASE_PROJECT_ID'];
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Service account credentials from .env ───────────────────────────────────
const credentials = {
  type: 'service_account',
  project_id: PROJECT_ID,
  private_key: envVars['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n'),
  client_email: envVars['FIREBASE_CLIENT_EMAIL'],
};

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/datastore'],
});

async function getToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

// ── Firestore REST value helpers ─────────────────────────────────────────────
function str(v)    { return { stringValue: v }; }
function num(v)    { return { integerValue: String(v) }; }
function dbl(v)    { return { doubleValue: v }; }
function bool(v)   { return { booleanValue: v }; }
function arr(items){ return { arrayValue: { values: items } }; }
function map(obj)  { return { mapValue: { fields: obj } }; }

function serviceItem({ name, price, duration, description }) {
  const fields = { name: str(name), price: str(price) };
  if (duration != null)    fields.duration    = num(duration);
  if (description != null) fields.description = str(description);
  return map(fields);
}

function portfolioItem({ before, after, title }) {
  return map({ before: str(before), after: str(after), title: str(title) });
}

// ── Future weekday dates starting Monday 14 July 2026 ───────────────────────
const DATES = [
  '2026-07-14','2026-07-15','2026-07-16','2026-07-17','2026-07-18',
  '2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-25',
];

// ── REST helpers ─────────────────────────────────────────────────────────────
async function patchDoc(token, collectionPath, docId, fields) {
  const url = `${BASE}/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`PATCH ${collectionPath}/${docId}: ${JSON.stringify(json)}`);
  return json;
}

async function addDoc(token, collectionPath, fields) {
  const url = `${BASE}/${collectionPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${collectionPath}: ${JSON.stringify(json)}`);
  return json;
}

// ── Account definitions ──────────────────────────────────────────────────────
const BARBER_UID       = 'S5s1FWMaz1XuAEo8gDSTTIqlqgL2';
const HAIRDRESSER_UID  = 'xyPHCqfFgoYympmcqUAzNS37URG3';
const DECORATOR_UID    = 'cKyzLBNBHuYKBS439GuE74UYEUv1';
const PT_UID           = 'Ih8OFcRzvuS3QbwtsYPeUFCnUEo1';

const BARBER_PROFILE = {
  businessType:    str('barber'),
  businessName:    str('Fade Factory'),
  name:            str('Marcus Wilson'),
  specialty:       str('Skin Fades & Beard Sculpting'),
  heroTagline:     str("East London's Premier Barbershop"),
  heroCtaText:     str('BOOK YOUR CUT'),
  aboutBody:       str("Fade Factory is East London's go-to destination for precision cuts, flawless skin fades, and expert beard sculpting. With over a decade of experience on the clippers, Marcus has built a loyal clientele who trust him to keep them looking sharp week after week."),
  brandColor:      str('#C9A84C'),
  stat1Value:      str('10+'),  stat1Label: str('Years Experience'),
  stat2Value:      str('500+'), stat2Label: str('Happy Clients'),
  stat3Value:      str('4.9★'), stat3Label: str('Google Rating'),
  instagramUrl:    str('https://instagram.com/fadefactorylondon'),
  facebookUrl:     str('https://facebook.com/fadefactorylondon'),
  logoUrl:         str('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop'),
  heroImage:       str('https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&h=800&fit=crop'),
  services: arr([
    serviceItem({ name: 'Skin Fade',             price: '£25', duration: 30 }),
    serviceItem({ name: 'Haircut & Style',        price: '£20', duration: 30 }),
    serviceItem({ name: 'Beard Trim & Shape',     price: '£15', duration: 20 }),
    serviceItem({ name: 'Cut & Beard Combo',      price: '£35', duration: 45 }),
    serviceItem({ name: 'Hot Towel Shave',        price: '£20', duration: 30 }),
    serviceItem({ name: "Kids Cut (under 12)",    price: '£15', duration: 25 }),
  ]),
};

const HAIRDRESSER_PROFILE = {
  businessType:       str('hairdresser'),
  businessName:       str('Luxe Hair Studio'),
  name:               str('Sophie Chen'),
  specialty:          str('Colour Specialist & Precision Cuts'),
  heroTagline:        str("London's Award-Winning Hair Salon"),
  heroHeadingLine1:   str('Where Every'),
  heroHeadingLine2:   str('Strand Shines'),
  heroCtaText:        str('Book Your Appointment'),
  heroSubtext:        str('Expert colour, precision cuts and transformative styling. Your most confident hair starts here.'),
  aboutHeading:       str('Our story, your style'),
  aboutQuote:         str('"We believe great hair is the foundation of everyday confidence."'),
  aboutBody:          str("Luxe Hair Studio is a boutique salon in the heart of London, specialising in transformative colour work and precision cuts. Led by Sophie Chen, our team of award-winning stylists are passionate about helping every client walk out feeling their absolute best."),
  brandColor:         str('#9c27b0'),
  stat1Value:         str('12+'),  stat1Label: str('Years Expertise'),
  stat2Value:         str('5.0★'), stat2Label: str('Average Rating'),
  stat3Value:         str('800+'), stat3Label: str('Happy Clients Monthly'),
  instagramUrl:       str('https://instagram.com/luxehairstudiolondon'),
  facebookUrl:        str('https://facebook.com/luxehairstudiolondon'),
  logoUrl:            str('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop'),
  heroImage:          str('https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=800&fit=crop'),
  servicesImage:      str('https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop'),
  services: arr([
    serviceItem({ name: "Women's Cut & Blow Dry",  price: '£55', duration: 60 }),
    serviceItem({ name: "Men's Cut & Style",       price: '£35', duration: 45 }),
    serviceItem({ name: 'Full Colour',             price: '£85', duration: 120 }),
    serviceItem({ name: 'Highlights / Balayage',   price: '£110', duration: 150 }),
    serviceItem({ name: 'Keratin Treatment',       price: '£150', duration: 180 }),
    serviceItem({ name: 'Deep Conditioning',       price: '£30', duration: 30 }),
  ]),
};

const DECORATOR_PROFILE = {
  businessType:       str('decorator'),
  businessName:       str('Premier Painters London'),
  name:               str("James O'Brien"),
  specialty:          str('Residential & Commercial Painting'),
  heroTagline:        str("London's Trusted Decorators"),
  heroHeadingLine1:   str('Home Painting,'),
  heroHeadingLine2:   str('Done Right.'),
  heroCtaText:        str('Get Your Free Quote'),
  heroSubtext:        str('Fully insured. Results guaranteed. Professional painting and decorating tailored to your home.'),
  heroReviewText:     str('Rated by 50+ Homeowners'),
  aboutTagline:       str('Who We Are'),
  aboutHeading:       str('Craft, care & a flawless finish'),
  aboutBody:          str("Premier Painters London has been transforming homes and businesses across the capital for over 12 years. Fully insured, detail-obsessed and always on time, James and his team deliver a showroom finish every time. From feature walls to full property refreshes, no job is too small."),
  brandColor:         str('#7a3520'),
  stat1Value:         str('12+'),  stat1Label: str('Years Experience'),
  stat2Value:         str('350+'), stat2Label: str('Projects Completed'),
  stat3Value:         str('50+'),  stat3Label: str('Five-Star Reviews'),
  stat4Value:         str('100%'), stat4Label: str('Satisfaction Guaranteed'),
  instagramUrl:       str('https://instagram.com/premierpainterslondon'),
  facebookUrl:        str('https://facebook.com/premierpainterslondon'),
  logoUrl:            str('https://images.unsplash.com/photo-1562619425-c307bb83bc42?w=400&h=400&fit=crop'),
  heroImage:          str('https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&h=800&fit=crop'),
  servicesImage:      str('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'),
  portfolioHeading:   str('Recent transformations'),
  portfolioSubtext:   str('See the difference a professional finish makes.'),
  services: arr([
    serviceItem({ name: 'Interior Room Painting', price: 'From £200', description: 'Full prep, prime and two coats of your chosen colour.' }),
    serviceItem({ name: 'Exterior House Painting', price: 'From £500', description: 'Weatherproof finish using premium outdoor paints.' }),
    serviceItem({ name: 'Feature Wall',            price: 'From £150', description: 'Statement walls in bold colours or textured finishes.' }),
    serviceItem({ name: 'Full Property Refresh',   price: 'From £1,200', description: 'Complete interior repaint, all rooms included.' }),
    serviceItem({ name: 'Commercial Painting',     price: 'POA', description: 'Offices, retail units and commercial premises.' }),
    serviceItem({ name: 'Wallpaper Hanging',       price: 'From £180', description: 'Expert hanging of all wallpaper types.' }),
  ]),
  portfolioItems: arr([
    portfolioItem({
      before: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
      after:  'https://images.unsplash.com/photo-1562619425-c307bb83bc42?w=600&h=400&fit=crop',
      title:  'Living Room Transformation',
    }),
    portfolioItem({
      before: 'https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=600&h=400&fit=crop',
      after:  'https://images.unsplash.com/photo-1560440021-33f9b867899d?w=600&h=400&fit=crop',
      title:  'Kitchen Refresh',
    }),
  ]),
};

const PT_PROFILE = {
  businessType:    str('trainer'),
  businessName:    str('DB Fitness'),
  name:            str('Dean Burt'),
  specialty:       str('Strength & Conditioning'),
  heroTagline:     str("South London's #1 Personal Trainer"),
  heroCtaText:     str('BOOK A SESSION'),
  aboutBody:       str("DB Fitness is South London's leading personal training service. With 8+ years of experience coaching clients from complete beginners to elite athletes, Dean combines evidence-based programming with real-world motivation to deliver results that last — inside the gym and out."),
  brandColor:      str('#C9A84C'),
  stat1Value:      str('8+'),   stat1Label: str('Years Experience'),
  stat2Value:      str('200+'), stat2Label: str('Clients Transformed'),
  stat3Value:      str('4.9★'), stat3Label: str('Average Rating'),
  instagramUrl:    str('https://instagram.com/dbfitnesslondon'),
  facebookUrl:     str('https://facebook.com/dbfitnesslondon'),
  logoUrl:         str('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop'),
  heroImage:       str('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=800&fit=crop'),
  services: arr([
    serviceItem({ name: '1-on-1 PT Session (60 min)',         price: '£65',        duration: 60 }),
    serviceItem({ name: 'Small Group Training (up to 4)',     price: '£25 pp',     duration: 60 }),
    serviceItem({ name: 'Online Coaching (Monthly)',          price: '£120/month', description: 'Custom programme + weekly check-ins.' }),
    serviceItem({ name: '6-Week Transformation Package',      price: '£350',       description: '12 sessions + nutrition guidance.' }),
    serviceItem({ name: 'Nutrition Consultation (45 min)',    price: '£50',        duration: 45 }),
  ]),
};

// ── Barber/Hairdresser slots (top-level `slots` collection) ──────────────────
async function seedBarberSlots(token, uid, times) {
  const today = new Date().toISOString().split('T')[0];
  let count = 0;
  for (const date of DATES) {
    if (date < today) continue;
    for (const time of times) {
      const fields = {
        barberId:  str(uid),
        shopId:    str(uid),
        date:      str(date),
        time:      str(time),
        isBooked:  bool(false),
        status:    str('open'),
        isStaff:   bool(false),
        createdAt: str(new Date().toISOString()),
      };
      await addDoc(token, 'slots', fields);
      count++;
      process.stdout.write(`\r  Slots added: ${count}`);
    }
  }
  console.log(`\r  Slots added: ${count} ✓`);
}

// ── PT slots (barbers/{uid}/ptSlots subcollection) ───────────────────────────
async function seedPTSlots(token, uid) {
  const times = ['07:00','08:00','09:00','10:00','17:00','18:00','19:00'];
  const today = new Date().toISOString().split('T')[0];
  let count = 0;
  for (const date of DATES) {
    if (date < today) continue;
    for (const time of times) {
      const fields = {
        date:     str(date),
        time:     str(time),
        duration: num(60),
        price:    num(65),
        status:   str('available'),
      };
      await addDoc(token, `barbers/${uid}/ptSlots`, fields);
      count++;
      process.stdout.write(`\r  PT slots added: ${count}`);
    }
  }
  console.log(`\r  PT slots added: ${count} ✓`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nSeeding demo accounts in project: ${PROJECT_ID}\n`);
  const token = await getToken();
  console.log('✓ Got Google access token\n');

  // 1. Barber — Fade Factory
  console.log('1/4  Fade Factory (barber)...');
  await patchDoc(token, 'barbers', BARBER_UID, BARBER_PROFILE);
  console.log('     Profile updated ✓');

  // 2. Hairdresser — Luxe Hair Studio
  console.log('2/4  Luxe Hair Studio (hairdresser)...');
  await patchDoc(token, 'barbers', HAIRDRESSER_UID, HAIRDRESSER_PROFILE);
  console.log('     Profile updated ✓');

  // 3. Decorator — Premier Painters London
  console.log('3/4  Premier Painters London (decorator)...');
  await patchDoc(token, 'barbers', DECORATOR_UID, DECORATOR_PROFILE);
  console.log('     Profile updated ✓');

  // 4. PT — DB Fitness
  console.log('4/4  DB Fitness (PT)...');
  await patchDoc(token, 'barbers', PT_UID, PT_PROFILE);
  console.log('     Profile updated ✓');

  console.log('\n✅  All 4 demo accounts seeded successfully!\n');
  console.log('Live URLs:');
  console.log(`  Barber:      https://bookrightly.co.uk/barber/${BARBER_UID}`);
  console.log(`  Hairdresser: https://bookrightly.co.uk/hairdresser/${HAIRDRESSER_UID}`);
  console.log(`  Decorator:   https://bookrightly.co.uk/decorator/${DECORATOR_UID}`);
  console.log(`  PT:          https://bookrightly.co.uk/pt-book/${PT_UID}\n`);
}

main().catch(e => { console.error('\n❌ Error:', e.message); process.exit(1); });
