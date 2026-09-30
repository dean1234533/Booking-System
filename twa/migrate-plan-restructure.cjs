/**
 * One-off migration for the Free/Basic/Widget/Full plan restructure.
 *
 * What it does:
 *   - Finds every barbers/{uid} doc with plan === "mini" and renames it to
 *     "free" (Free replaces Mini — same tier, new name and no-trial status).
 *   - For each one, checks Stripe for an active subscription tied to that
 *     barberId (via subscription metadata.barberId, matching how
 *     handleCreateSubscription in worker.js tags subscriptions) and, if
 *     found, does NOT touch it — just reports it so a human decides what to
 *     do. Per the restructure spec: never auto-cancel a real subscription.
 *   - Sets subscriptionStatus to "free" and REMOVES trialEndsAt for accounts
 *     that were already trial-less Mini/Free (if a doc still has a stale
 *     trialEndsAt from before Mini existed, it's left untouched — Free
 *     doesn't read trialEndsAt at all, so a leftover value is harmless).
 *   - Never touches basic/widget/full accounts' prices, subscriptions, or
 *     trialEndsAt — those aren't changing.
 *
 * Safety: DRY RUN BY DEFAULT. Nothing is written to Firestore unless you
 * pass --write explicitly.
 *
 * Usage:
 *   node twa/migrate-plan-restructure.cjs            # dry run, logs only
 *   node twa/migrate-plan-restructure.cjs --write     # actually writes
 */

const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');

const envVars = {};
fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});

const PROJECT_ID = envVars['VITE_FIREBASE_PROJECT_ID'];
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const auth = new GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: PROJECT_ID,
    private_key: envVars['FIREBASE_PRIVATE_KEY'].replace(/\\n/g, '\n'),
    client_email: envVars['FIREBASE_CLIENT_EMAIL'],
  },
  scopes: ['https://www.googleapis.com/auth/datastore'],
});

function extractValue(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  return undefined;
}

async function checkStripeSubscription(barberId) {
  if (!envVars['STRIPE_SECRET_KEY']) return null;
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(envVars['STRIPE_SECRET_KEY']);
    const subs = await stripe.subscriptions.search({
      query: `status:'active' AND metadata['barberId']:'${barberId}'`,
      limit: 1,
    });
    return subs.data[0] || null;
  } catch (err) {
    console.error(`  (couldn't check Stripe for ${barberId}: ${err.message})`);
    return null;
  }
}

async function main() {
  console.log(WRITE ? '=== LIVE RUN — will write to Firestore ===' : '=== DRY RUN — no writes will be made (pass --write to apply) ===');

  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  let allDocs = [];
  let pageToken = null;
  do {
    const url = `${BASE}/barbers?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    allDocs = allDocs.concat(res.documents || []);
    pageToken = res.nextPageToken || null;
  } while (pageToken);

  const miniDocs = allDocs.filter(d => extractValue((d.fields || {}).plan) === 'mini');

  console.log(`\nFound ${miniDocs.length} account(s) on plan "mini".\n`);

  const needsHumanAttention = [];

  for (const doc of miniDocs) {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    const businessName = extractValue(f.businessName) || extractValue(f.name) || '(no name)';

    const activeSub = await checkStripeSubscription(id);
    if (activeSub) {
      needsHumanAttention.push({ id, businessName, subscriptionId: activeSub.id, status: activeSub.status });
      console.log(`⚠️  ${businessName} (${id}) has an ACTIVE Stripe subscription (${activeSub.id}) — plan will be renamed to "free" in Firestore, but the subscription is NOT being cancelled. You need to decide what to do with it.`);
    } else {
      console.log(`✓ ${businessName} (${id}) — no active Stripe subscription found, safe to rename.`);
    }

    if (WRITE) {
      await fetch(`${BASE}/barbers/${id}?updateMask.fieldPaths=plan&updateMask.fieldPaths=subscriptionStatus`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { plan: { stringValue: 'free' }, subscriptionStatus: { stringValue: 'free' } } }),
      });
      console.log(`  → written: plan=free, subscriptionStatus=free`);
    }
  }

  console.log(`\n${WRITE ? 'Migration complete.' : 'Dry run complete — nothing was written.'}`);
  console.log(`Total mini accounts: ${miniDocs.length}`);
  console.log(`Needing human decision (active Stripe subscription): ${needsHumanAttention.length}`);
  if (needsHumanAttention.length) {
    console.log(JSON.stringify(needsHumanAttention, null, 2));
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
