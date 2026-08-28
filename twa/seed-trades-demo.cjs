/**
 * Seed the clickable Plumbing, Heating & Electrical marketplace demo.
 *
 * Run: node twa/seed-trades-demo.cjs
 */

const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");
const env = {};
fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const projectId = env.VITE_FIREBASE_PROJECT_ID;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const demoId = "bookrightly-trades-demo";

const auth = new GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: projectId,
    private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: env.FIREBASE_CLIENT_EMAIL,
  },
  scopes: ["https://www.googleapis.com/auth/datastore"],
});

function encode(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
  }
  return { stringValue: String(value) };
}

function fields(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, encode(value)]));
}

async function patch(token, documentPath, record) {
  const response = await fetch(`${base}/${documentPath}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: fields(record) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${documentPath}: ${JSON.stringify(result)}`);
}

const profile = {
  uid: demoId,
  businessType: "plumber",
  businessName: "Northstar Plumbing, Heating & Electrical",
  name: "Daniel Morgan",
  specialty: "Plumbing, Heating & Electrical",
  isDemo: true,
  freeForever: true,
  brandColor: "#E85D2A",
  address: "Birmingham & the West Midlands",
  area: "Birmingham",
  phone: "01632 960 148",
  businessEmail: "demo@example.com",
  openingHours: "Mon–Fri: 8am–6pm\nSat: 9am–2pm\nEmergency call-outs available",
  heroTagline: "Plumbing, heating & electrical",
  heroHeadingLine1: "One trusted team.",
  heroHeadingLine2: "Every essential trade.",
  heroSubtext: "From leaking pipes and boiler faults to electrical repairs, get clear advice and dependable local workmanship.",
  heroReviewText: "What can we help with?",
  heroCardBody: "Choose a service, describe the job and add photos. We’ll review everything before confirming the next step.",
  primaryCtaLabel: "Request a job",
  heroTrustText: "Nothing is booked until the work and price are agreed",
  heroImage: "/images/demo/plumber/hero.jpg",
  logoUrl: "/images/plumber/service-heating-v2.jpg",
  aboutHeading: "Three trades. One reliable team.",
  aboutBody: "Northstar brings qualified plumbing, heating and electrical expertise under one roof. Customers get straightforward communication, tidy work and a clear price before every job begins.",
  servicesHeading: "Help for every essential system in your home.",
  servicesBody: "Choose the closest service below and send the details. We’ll confirm the right engineer, timing and price.",
  serviceCategories: [
    {
      category: "Plumbing",
      image: "/images/plumber/service-plumbing-v2.jpg",
      items: [
        { name: "Leak and pipe repairs", description: "Find and repair leaks in pipework, taps and fittings.", startingPrice: "85", bookableOnline: false },
        { name: "Blocked sinks and drains", description: "Clear domestic blockages and identify recurring problems.", startingPrice: "95", bookableOnline: false },
        { name: "Bathroom installation", description: "Plumbing for bathroom refits, showers and new fixtures.", startingPrice: "", bookableOnline: false },
      ],
    },
    {
      category: "Gas & Heating",
      image: "/images/plumber/service-heating-v2.jpg",
      items: [
        { name: "Boiler service", description: "Annual boiler servicing and safety checks.", startingPrice: "110", bookableOnline: true },
        { name: "Boiler and heating repair", description: "Diagnosis for boiler faults, cold radiators and pressure issues.", startingPrice: "120", bookableOnline: false },
        { name: "Central heating installation", description: "New boilers, radiators and complete heating systems.", startingPrice: "", bookableOnline: false },
      ],
    },
    {
      category: "Electrical",
      image: "/images/plumber/service-electrical-v2.jpg",
      items: [
        { name: "Electrical fault finding", description: "Trace faults, trips and power loss safely.", startingPrice: "95", bookableOnline: false },
        { name: "Sockets, switches and lighting", description: "Install and replace domestic electrical fittings.", startingPrice: "75", bookableOnline: false },
        { name: "Consumer units and rewiring", description: "Upgrades, partial rewires and full property rewiring.", startingPrice: "", bookableOnline: false },
      ],
    },
  ],
  standardCharges: {
    calloutFee: 85,
    hourlyRate: 75,
    minimumCharge: 85,
    diagnosticFee: 95,
    emergencyRate: 145,
    extraNote: "Parts are quoted separately. You will approve the price before work starts.",
  },
  serviceAreas: ["Birmingham", "Solihull", "Sutton Coldfield", "West Bromwich", "Walsall"],
  portfolioHeading: "Recent repairs",
  portfolioSubtext: "Drag the slider to see the job before and after professional repair.",
  portfolioItems: [
    {
      before: "/images/demo/plumber/pipe-repair-before.jpg",
      after: "/images/demo/plumber/pipe-repair-after.jpg",
      label: "Leaking Waste Pipe Repair",
    },
    {
      before: "/images/demo/plumber/shower-reseal-before.jpg",
      after: "/images/demo/plumber/shower-reseal-after.jpg",
      label: "Shower Reseal & Grout Refresh",
    },
  ],
  emergencyCallouts: true,
  insured: true,
  insuranceText: "Fully insured and qualified",
  stat1Value: "15+",
  stat1Label: "Years of experience",
  stat2Value: "1,200+",
  stat2Label: "Jobs completed",
  stat3Value: "4.9",
  stat3Label: "Average rating",
  stat4Value: "3",
  stat4Label: "Skilled trades",
};

const reviews = [
  { customerName: "Amelia R.", rating: 5, comment: "Quick diagnosis, clear price and the leak was fixed neatly on the first visit." },
  { customerName: "Marcus T.", rating: 5, comment: "Northstar serviced the boiler and sorted an electrical fault in the same week. Excellent communication." },
  { customerName: "Priya S.", rating: 5, comment: "Professional from the first message to the finished bathroom work. Everything was left spotless." },
];

async function main() {
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  const token = accessToken.token;

  await patch(token, `barbers/${demoId}`, profile);
  await Promise.all(reviews.map((review, index) => patch(token, `barbers/${demoId}/reviews/review-${index + 1}`, review)));

  console.log("Plumbing, Heating & Electrical demo created.");
  console.log(`Profile: https://bookrightly.co.uk/plumber/${demoId}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
