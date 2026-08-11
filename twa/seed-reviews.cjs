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

function str(v) { return { stringValue: v }; }
function num(v) { return { integerValue: String(v) }; }
function map(obj) { return { mapValue: { fields: obj } }; }

async function addDoc(token, collPath, fields) {
  const res = await fetch(`${BASE}/${collPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${collPath}: ${JSON.stringify(json)}`);
}

const REVIEWS = {
  // Barber — Fade Factory
  S5s1FWMaz1XuAEo8gDSTTIqlqgL2: [
    { customerName: 'Jordan P.', rating: 5, comment: "Best fade in East London, no question. Marcus takes his time and the attention to detail is unreal. Been coming every two weeks for a year now." },
    { customerName: 'Tyrese M.', rating: 5, comment: "Clean shop, great vibes, and the cut speaks for itself. The hot towel shave is an experience everyone needs to try at least once." },
    { customerName: 'Aaron C.', rating: 5, comment: "Booked online which was dead easy. Marcus remembered exactly how I like my fade even from the first visit. Proper professional." },
    { customerName: 'Liam R.', rating: 5, comment: "Kids cut was brilliant — my son hates haircuts but Marcus made him feel comfortable straight away. Will be our regular spot now." },
  ],

  // Hairdresser — Luxe Hair Studio
  xyPHCqfFgoYympmcqUAzNS37URG3: [
    { customerName: 'Emma T.', rating: 5, comment: "Sophie completely transformed my hair. The balayage is exactly what I showed her and the colour is stunning. Everyone has been asking who did it." },
    { customerName: 'Priya K.', rating: 5, comment: "I've tried so many salons in London and Luxe is by far the best. The consultation was thorough and the result was better than I imagined." },
    { customerName: 'Chloe B.', rating: 5, comment: "The keratin treatment changed my life. My hair has never been this smooth and manageable. Worth every penny." },
    { customerName: 'Natasha W.', rating: 5, comment: "From the moment I walked in I felt looked after. Attention to detail at every step. My go-to salon from now on." },
  ],

  // Decorator — Premier Painters London
  cKyzLBNBHuYKBS439GuE74UYEUv1: [
    { customerName: 'Sarah L.', rating: 5, comment: "James and his team did our whole house in four days. Meticulous prep work, no mess left behind, and the finish is flawless. Couldn't be happier." },
    { customerName: 'David H.', rating: 5, comment: "Had three quotes and James wasn't the cheapest but he was the most professional. You can see why — the results are incredible." },
    { customerName: 'Claire M.', rating: 5, comment: "Our living room has been completely transformed. The feature wall looks like something from a magazine. Highly recommend." },
    { customerName: 'Tom B.', rating: 5, comment: "Very reliable, turned up exactly when promised, kept me updated throughout. The paintwork is perfect. Will definitely use again." },
  ],

  // PT — DB Fitness
  Ih8OFcRzvuS3QbwtsYPeUFCnUEo1: [
    { customerName: 'Michael S.', rating: 5, comment: "Dean helped me lose 18kg in 4 months without killing myself at the gym. His programming is smart, his nutrition advice is practical, and he genuinely cares about results." },
    { customerName: 'Kezia O.', rating: 5, comment: "I was completely new to the gym and Dean made the whole experience approachable and fun. I've gained so much confidence in just 8 weeks." },
    { customerName: 'Ryan A.', rating: 5, comment: "Six week transformation package was the best investment I've made in myself. Dean pushed me when I needed it and dialled it back when I was struggling. Perfect balance." },
    { customerName: 'Jade F.', rating: 5, comment: "The online coaching is brilliant for my schedule. Custom programme, weekly check-ins, and Dean responds to questions same day. Feels like he's in your corner 24/7." },
  ],
};

async function main() {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  console.log('✓ Token obtained\n');

  for (const [uid, reviews] of Object.entries(REVIEWS)) {
    const label = { S5s1FWMaz1XuAEo8gDSTTIqlqgL2: 'Barber', xyPHCqfFgoYympmcqUAzNS37URG3: 'Hairdresser', cKyzLBNBHuYKBS439GuE74UYEUv1: 'Decorator', Ih8OFcRzvuS3QbwtsYPeUFCnUEo1: 'PT' }[uid];
    for (const r of reviews) {
      await addDoc(token, `barbers/${uid}/reviews`, {
        customerName: str(r.customerName),
        rating:       num(r.rating),
        comment:      str(r.comment),
      });
      process.stdout.write('.');
    }
    console.log(` ✓ ${label} (${reviews.length} reviews)`);
  }

  console.log('\n✅  Demo reviews seeded across all 4 accounts.\n');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });
