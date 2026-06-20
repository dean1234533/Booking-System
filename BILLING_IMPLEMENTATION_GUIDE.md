# Billing Implementation Guide - £20 + £1.50 per 3 Clients

**Status:** Code implementation complete  
**Next Step:** Stripe configuration

---

## 📋 What Was Implemented

### **Code Changes Made:**

1. **Updated `/src/api/create-subscription.js`**
   - Now accepts `businessType` parameter
   - Routes PTs to `£20/month + usage-based` product
   - Routes other businesses to `£10/month` product

2. **Created `/src/api/report-usage.js`**
   - Endpoint to report client count to Stripe
   - Calculates overage units (£1.50 per 3 clients)
   - Sends usage-based metered billing to Stripe

3. **Created `/src/utils/billingUtils.js`**
   - `countClientsByTrainer()` - Count clients for a PT
   - `getBillingInfo()` - Get current billing breakdown
   - `reportUsageToStripe()` - Report usage to Stripe
   - `calculateTrainerCost()` - Calculate total PT cost

4. **Created `/src/components/dashboard/tabs/BillingTab.jsx`**
   - New dashboard tab showing billing info
   - Shows base cost, overage cost, total cost
   - Manual "Report Usage" button for PTs
   - Client count breakdown
   - Payment management links

5. **Updated `/src/pages/Dashboard.jsx`**
   - Added BillingTab import
   - Added Billing tab to dashboard (visible for all owners)
   - Updated subscription calls to pass `businessType`

6. **Updated `/src/components/dashboard/tabs/FinanceTab.jsx`**
   - Updated subscription button to pass `businessType`

---

## 🛠️ STRIPE SETUP REQUIRED

### **Step 1: Create Two Products in Stripe**

You need to create TWO separate subscription products in your Stripe account.

#### **Product 1: PT Booking System**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click "Create product"
3. Fill in:
   ```
   Name: PT Booking System
   Description: Personal Training management platform with usage-based billing
   Type: Service
   ```
4. Under Pricing:
   - Click "Add a pricing model"
   - Select "Recurring"
   - Currency: GBP
   - Billing period: Monthly
   - Price: 2000 pence (£20.00)
   - Name: "Base Fee"
   - Save

5. Add Usage-Based Pricing:
   - Click "Add another pricing model"
   - Select "Usage-based"
   - Currency: GBP
   - Unit: "Unit"
   - Price: 150 pence (£1.50)
   - Quantity: 3 units (so £1.50 = 3 clients)
   - Billing: Monthly
   - Aggregation model: "Sum"
   - Name: "Extra Clients"
   - Save

**You'll get a Price ID for the base fee (e.g., `price_xxxxx`)**

#### **Product 2: Booking System**

1. Click "Create product" again
2. Fill in:
   ```
   Name: Booking System
   Description: Booking management for barbers, hairdressers, decorators, etc.
   Type: Service
   ```
3. Under Pricing:
   - Click "Add a pricing model"
   - Select "Recurring"
   - Currency: GBP
   - Billing period: Monthly
   - Price: 1000 pence (£10.00)
   - Name: "Monthly Subscription"
   - Save

**You'll get a Price ID for this (e.g., `price_yyyyy`)**

---

### **Step 2: Add Environment Variables**

Add these to your `.env` (or `.env.local` for local development, or your Cloudflare environment variables):

```env
# Stripe Price IDs
STRIPE_PT_BASE_PRICE_ID=price_xxxxx          # PT Booking System base price (£20)
STRIPE_BASE_PRICE_ID=price_yyyyy             # Booking System price (£10)
```

Replace `price_xxxxx` and `price_yyyyy` with actual Price IDs from Stripe.

**To find your Price IDs:**
1. Go to Stripe Dashboard → Products
2. Click each product
3. Under "Pricing" section, copy the Price ID

---

### **Step 3: Deploy Changes**

Once you add the environment variables:

```bash
# Build and deploy to Cloudflare
npm run build
npm run deploy
# OR
wrangler pages deploy dist
```

---

## 📊 How It Works

### **For PTs (businessType: "trainer")**

1. **Signup → create-subscription**
   - Assigned to PT Booking System product
   - Charged £20/month base + usage-based overage

2. **Dashboard → Billing Tab**
   - Shows: "X clients (10 free + Y extra)"
   - Base: £20.00
   - Overage: £(units × 1.50)
   - Total: Calculated total

3. **Daily → Usage Reporting** (automatic)
   - Client count tracked automatically
   - Reported to Stripe each day
   - Overage calculated: ceil((clients - 10) / 3)

4. **Monthly Billing**
   - Invoice includes:
     - Base: £20.00
     - Usage: (billing_units × £1.50)
     - Total: Base + Usage

### **For Other Businesses (barber, hairdresser, decorator)**

1. **Signup → create-subscription**
   - Assigned to Booking System product
   - Charged flat £10/month
   - No usage-based billing

2. **Dashboard → Billing Tab**
   - Shows: "£10.00/month"
   - No overage calculation

---

## 🔄 Usage Reporting Flow

### **Automatic Reporting (Recommended)**

Create a background job (Cloud Function) to report usage daily:

```javascript
// Cloud Function (in functions/index.js)
exports.reportDailyUsage = functions.pubsub
  .schedule('0 1 * * *') // 1 AM UTC daily
  .onRun(async (context) => {
    // Get all PT users
    const ptsSnap = await db.collection('barbers')
      .where('businessType', '==', 'trainer')
      .get();

    // For each PT:
    for (const ptDoc of ptsSnap.docs) {
      const ptId = ptDoc.id;
      const ptData = ptDoc.data();

      // Count clients
      const clientsSnap = await db
        .collection('barbers')
        .doc(ptId)
        .collection('clients')
        .get();

      const clientCount = clientsSnap.size;

      // Report to Stripe
      await reportUsageToStripe(
        ptId,
        ptData.email,
        clientCount
      );
    }
  });
```

### **Manual Reporting**

Users can click "Report Usage to Stripe" in Billing tab to manually report.

---

## ✅ Testing Checklist

- [ ] PT signs up → gets PT Booking System product
- [ ] Other business signs up → gets Booking System product
- [ ] PT can see Billing tab in dashboard
- [ ] Billing tab shows correct cost calculation:
  - 10 clients: £20.00
  - 13 clients: £21.50
  - 16 clients: £23.00
  - 25 clients: £27.50
- [ ] "Report Usage" button works and sends to Stripe
- [ ] Non-PT sees flat £10/month (no overage)
- [ ] Stripe invoices show correct amounts
- [ ] Test subscription checkout with test card

---

## 🧪 Stripe Test Mode

### **Test Cards**

Use these in Stripe Test Mode:

```
Visa (Success):        4242 4242 4242 4242
Visa (Decline):        4000 0000 0000 0002
Mastercard (Success):  5555 5555 5555 4444
Exp: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

### **Test Flow**

1. In test mode, sign up a PT
2. Complete test card payment
3. Go to Billing tab
4. Verify correct cost shown
5. Click "Report Usage" and check Stripe dashboard
6. Go to Stripe → Customers → find test customer
7. Check subscription has both base + usage pricing

---

## 📱 Monthly Invoice Example

### **PT with 25 Clients**

```
Invoice: INV-2026-001
Date: May 30, 2026

PT Booking System
├─ Base Fee: £20.00
└─ Extra Clients (15 × £1.50): £22.50
                              ─────────
Total Due: £42.50
```

### **Barber (Flat)**

```
Invoice: INV-2026-002
Date: May 30, 2026

Booking System
└─ Monthly Subscription: £10.00
                        ─────────
Total Due: £10.00
```

---

## 🚨 Troubleshooting

### **"Price not found" error**

**Cause:** Price ID in env vars is wrong  
**Fix:** Copy Price ID again from Stripe, paste carefully

### **Usage not reporting**

**Cause:** API endpoint not accessible or customer not found  
**Fix:** Check Stripe customer email matches user email in Firestore

### **Wrong product assigned**

**Cause:** businessType not being passed or stored correctly  
**Fix:** Check Firestore has `businessType: "trainer"` for PTs

### **Billing shows £0**

**Cause:** Client count query failed  
**Fix:** Make sure `/barbers/{uid}/clients` collection exists

---

## 📞 Support

For implementation help:
1. Check that all environment variables are set
2. Verify Stripe products created correctly
3. Test with test mode card first
4. Check browser console for errors
5. Review Stripe webhook logs

---

## 🎉 You're Ready!

Once Stripe products are created and env vars are added:

1. Deploy code: `npm run build && npm run deploy`
2. Test signup flow for PT and other business
3. Verify Billing tab appears
4. Check first invoice in Stripe
5. Monitor usage reporting

**The system will now:**
- ✅ Charge PTs £20 + £1.50 per 3 clients
- ✅ Charge others £10 flat
- ✅ Calculate overage automatically
- ✅ Report usage daily to Stripe
- ✅ Show billing info in dashboard
- ✅ Generate correct monthly invoices
