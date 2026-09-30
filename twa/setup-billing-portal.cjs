/**
 * One-off setup: turns on Stripe's built-in "why are you cancelling?" survey
 * on the Billing Portal, so that when a business cancels their Bookrightly
 * subscription (handleBillingPortal in src/worker.js sends them to Stripe's
 * hosted portal — there's no custom cancel flow in this app to add a form
 * to), Stripe itself shows a reason picker before letting the cancellation
 * go through.
 *
 * This updates the ACCOUNT'S DEFAULT portal configuration in place (the one
 * handleBillingPortal already uses — it never passes a `configuration` id,
 * so it always gets whatever is marked is_default). No worker.js or env
 * changes are needed for this half; run it once and you're done.
 *
 * The reasons the customer picks (plus any free-text comment they add) land
 * on the Subscription object as `cancellation_details.{feedback,comment}` —
 * src/worker.js's Stripe webhook handler reads those and saves them to
 * Firestore (barbers/{id}/churnFeedback), viewable via
 * GET /api/admin-churn-feedback (see CLAUDE.md / README for the admin key).
 *
 * Usage:
 *   node twa/setup-billing-portal.cjs                 (reads STRIPE_SECRET_KEY from .env — test key)
 *   STRIPE_SECRET_KEY=sk_live_... node twa/setup-billing-portal.cjs   (live key, passed inline —
 *     lives only in your shell for this one command, never written to .env or shared anywhere)
 */

const fs = require('fs');
const path = require('path');

let secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  const envVars = {};
  fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });
  secretKey = envVars.STRIPE_SECRET_KEY;
}

if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY — pass it inline (see Usage above) or set it in .env');
  process.exit(1);
}
console.log(`Using a ${secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST'} key.`);

const Stripe = require('stripe');
const stripe = new Stripe(secretKey);

// Every reason Stripe's portal supports — deliberately not narrowed down, so
// nothing about why someone left is invisible.
const CANCELLATION_REASON_OPTIONS = [
  'too_expensive',
  'missing_features',
  'switched_service',
  'unused',
  'customer_service',
  'too_complex',
  'low_quality',
  'other',
];

(async () => {
  const list = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  const current = list.data[0];

  if (!current) {
    console.error(
      'No default Billing Portal configuration found on this Stripe account.\n' +
      'Visit https://dashboard.stripe.com/settings/billing/portal once first ' +
      '(Stripe creates the default configuration the first time that page is ' +
      'opened, or the first time a portal session is created), then re-run this script.'
    );
    process.exit(1);
  }

  console.log(`Found default configuration ${current.id}. Current subscription_cancel:`,
    JSON.stringify(current.features.subscription_cancel, null, 2));

  const updated = await stripe.billingPortal.configurations.update(current.id, {
    features: {
      // Preserve whatever cancel mode/proration behaviour is already set
      // (e.g. "cancel at period end" vs "immediately") — only the reason
      // survey is new. Fall back to sensible defaults if this is the very
      // first time subscription_cancel has been configured at all.
      subscription_cancel: {
        enabled: true,
        mode: current.features.subscription_cancel?.mode || 'at_period_end',
        proration_behavior: current.features.subscription_cancel?.proration_behavior || 'none',
        cancellation_reason: {
          enabled: true,
          options: CANCELLATION_REASON_OPTIONS,
        },
      },
    },
  });

  console.log('\nDone. Cancellation reason survey is now live on the Billing Portal.');
  console.log('New subscription_cancel config:', JSON.stringify(updated.features.subscription_cancel, null, 2));
})().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
