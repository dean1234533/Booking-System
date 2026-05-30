# Billing Migration Plan

**Current Setup:**
- 30-day free trial → then £10/month subscription
- Platform fees: 2.5% (online), 1% (in-person)
- £9 domain charge (one-time)
- Client limits: PTs only

**Goal:** Update PT pricing while keeping other businesses unchanged

---

## 📊 CURRENT STATE ANALYSIS

### **Revenue Breakdown (Assumed 150 customers):**

```
Assumption: Mix of PTs + other businesses
├─ 100 PTs @ £10/month = £1,000/month
├─ 50 other businesses @ £10/month = £500/month
├─ Bookings revenue (2.5% online + 1% in-person fees)
└─ Domain purchases (£9 one-time)

Total subscription: £1,500/month
```

---

## 🎯 RECOMMENDED MIGRATION

### **STEP 1: Two Different Products in Stripe**

**Product 1: PT Booking Site**
```
Name: "PT Booking System"
Price: £29/month (base, includes 10 clients)
Overage: £1.50 per extra client/month
Billing cycle: Monthly
Free trial: 30 days (same as now)

Stripe Setup:
├─ Recurring price: £29/month
├─ Usage-based metric: "pt_clients_over_10"
├─ Usage price: £1.50 per unit
├─ Aggregation: Sum over billing period
└─ Trial: 30 days
```

**Product 2: Other Businesses (Barbers, Hairdressers, etc.)**
```
Name: "Booking System"
Price: £10/month (unchanged)
Billing cycle: Monthly
Free trial: 30 days (same as now)
No client limits
No overage fees

Stripe Setup:
├─ Recurring price: £10/month
├─ No usage-based billing
└─ Trial: 30 days
```

---

## 💷 NEW REVENUE PROJECTION AT 150 CUSTOMERS

### **Scenario: 100 PTs + 50 Other Businesses**

**Other Businesses (Unchanged):**
```
50 × £10/month = £500/month
```

**PTs (New Model):**
```
Assuming mix of sizes:
├─ 30 PTs with 10 clients (no overage): 30 × £29 = £870
├─ 40 PTs with 25 clients (15 extra): 40 × (£29 + £22.50) = 2,060
├─ 20 PTs with 50 clients (40 extra): 20 × (£29 + £60) = 1,780
├─ 10 PTs with 75 clients (65 extra): 10 × (£29 + £97.50) = 1,265
─────────────────────────────────────
PT Subscription Total: £5,975/month
```

**Total Subscription Revenue:**
```
Other businesses: £500/month
PTs: £5,975/month
─────────────────────────────
Total: £6,475/month (vs £1,500 before) ✅

+332% increase! 🚀
```

---

## 📋 MIGRATION STRATEGY

### **For EXISTING Customers:**

**Option A: Grandfather Existing PTs (Recommended)**
```
Existing PTs stay on £10/month indefinitely
├─ Reward loyalty
├─ No shock to existing customers
├─ New sign-ups get £29 + overage
└─ Smooth transition

Cost: Some revenue loss, but customer retention is worth it
```

**Option B: Tier Existing PTs Up (Aggressive)**
```
Existing PTs transition to £29 + overage after 30 days
├─ Email them 30 days before: "Thanks for being a customer!
     We're adding advanced features, upgrading you to..."
├─ Show what they get (voice notes, nutrition, automation)
├─ Offer 50% off for first 3 months as thank you
└─ 80% will stay

Estimated churn: 20%
Additional revenue: +270% (only lose a small %)
```

**Option C: Hybrid (Best)**
```
Existing PTs get choice:
├─ Stay on £10/month (no new features)
├─ Upgrade to £29 (new features) with 50% off for 3 months
└─ See email: "We've added voice recording, automation,
     nutrition planning. Want to upgrade? First 3 months at £14.50."

Expected: 70% will upgrade
```

---

## 🔄 IMPLEMENTATION ROADMAP

### **Week 1: Stripe Setup**
1. Create two Stripe products:
   - "PT Booking System" (£29 + usage)
   - "Booking System" (£10 flat)
2. Ensure both have 30-day free trial
3. Test both billing flows

### **Week 2: Code Updates**
1. Detect business type (PT vs other)
2. Assign correct Stripe product at signup
3. Report client count usage to Stripe (PTs only)
4. Display billing breakdown on dashboard:
   ```
   PT Dashboard shows:
   ├─ Current clients: X
   ├─ Base fee: £29.00
   ├─ Overage: (X-10) × £1.50 = £Y
   └─ Total: £Z
   
   Other business shows:
   ├─ Subscription: £10.00
   └─ (No overage calculation)
   ```

### **Week 3: Communication**
1. Send email to existing PTs:
   - (Option B or C)
2. Update pricing page
3. Update FAQ
4. Update onboarding flow

### **Week 4: Monitor & Adjust**
1. Track churn rate
2. Monitor conversion of free → paid
3. Adjust messaging if needed

---

## 💷 FINANCIAL IMPACT

### **Current (Assuming 150 customers: 100 PTs + 50 other):**
```
Subscription: £1,500/month
Platform fees: ~£500-1,000/month (varies by bookings)
Domain charges: ~£100-200/month (variable)
─────────────────────────────
Total: ~£2,100-2,700/month
```

### **After Migration (same customer mix):**

**Using Option C (70% PTs upgrade):**
```
Subscription:
├─ Other businesses: £500/month (unchanged)
├─ 30 PTs still on £10: £300
├─ 70 PTs on £29 (avg 30 clients): £3,640
─────────────────────────────
Subscription total: £4,440/month (+196%)

Platform fees: ~£500-1,000/month (same)
Domain charges: ~£100-200/month (same)
─────────────────────────────
Total: ~£5,040-5,640/month (+95% increase!)
```

**Even with 20% churn, you double revenue.** ✅

---

## 🎯 PRICING IN GBP vs USD

### **Current:** £10/month (GBP only)

### **New Recommendation:**

**Option 1: Keep GBP (Simplest)**
```
PT Booking Site: £29/month + £1.50/extra client
Other Businesses: £10/month
```

**Option 2: Add USD (Better for US Market)**
```
UK customers:
├─ PT Booking Site: £29/month + £1.50/extra client
├─ Other Businesses: £10/month

US customers (auto-detect by IP):
├─ PT Booking Site: $36/month + $1.85/extra client
│  (1.24x GBP for currency conversion + payment processing)
├─ Other Businesses: $12/month
│  (1.2x GBP)
```

**Option 3: Simple USD Parity (Recommended)**
```
UK and international customers in GBP:
├─ PT Booking Site: £29/month + £1.50/extra
├─ Other Businesses: £10/month

US customers in USD (same effective price):
├─ PT Booking Site: $35/month + $1.75/extra
├─ Other Businesses: $12/month
```

**I recommend Option 3:** Keeps it simple, same effective pricing globally.

---

## 🔐 STRIPE CONFIGURATION

### **Product 1: PT Booking System**

**Recurring Price:**
- Currency: GBP
- Amount: £29/month
- Trial period: 30 days
- Billing interval: Monthly

**Usage-Based Pricing:**
- Metric name: `pt_clients_over_10`
- Price: £1.50 per unit
- Aggregation model: Sum
- Report usage daily from your app

**Stripe Billing Portal:**
- Allow subscription management
- Show usage/overage in invoice preview
- Allow pause/resume

### **Product 2: Booking System**

**Recurring Price:**
- Currency: GBP
- Amount: £10/month
- Trial period: 30 days
- Billing interval: Monthly

**No usage-based pricing**

---

## 📊 EXAMPLE INVOICES

### **PT Customer: 35 Clients**

```
INVOICE #1234

PT Booking System
├─ Base: £29.00
└─ Clients 11-35: 25 × £1.50 = £37.50
                                ─────────
Total: £66.50

Billing date: May 30, 2026
Next billing: June 30, 2026
```

### **Other Business Customer**

```
INVOICE #1235

Booking System
└─ Monthly subscription: £10.00
                         ─────────
Total: £10.00

Billing date: May 30, 2026
Next billing: June 30, 2026
```

---

## 🚀 CUSTOMER COMMUNICATION

### **Email to Existing PT Customers (Option C)**

Subject: "✨ New Features Unlocked + Special Offer Inside"

```
Hi [Name],

We've been listening to feedback from our PT community, and we're 
excited to announce new features for the PT Booking System:

🎤 Voice Recording & Auto-Transcription
   Record consultations, automatically transcribed and categorized

📊 Progress Tracking with Charts
   Beautiful visualizations to show clients their progress

🥗 Nutrition Planning
   Build custom meal plans for each client

🔄 Automation
   Monthly reminders, workout plans, check-ins (on a schedule)

These features are now available, and we're upgrading all PT customers 
to access them.

Here's the deal:
├─ New price: £29/month (was £10)
├─ Includes: 10 clients
├─ Extra clients: £1.50 each/month
├─ Special offer: First 3 months at 50% off (£14.50/month)
└─ No change to your bookings or payments

→ [Accept offer] [Learn more] [Contact support]

If you have questions, reply to this email!

Thanks for being a valued customer,
[Your name]
```

### **Email to New Signups (PTs)**

Subject: "Welcome! Your PT Booking System is Ready"

```
Hi [Name],

Your 30-day free trial is active. Try everything:

✅ Client profiles and messaging
✅ Voice recording & transcription
✅ Progress tracking with charts
✅ Nutrition planning
✅ Automation & reminders
✅ Full team collaboration

When your trial ends (in 30 days), you'll pay just £29/month for up to 
10 clients. Add more clients? Just £1.50 per client/month.

That's it. No surprises. No hidden fees.

→ [Get started] [View pricing] [Contact us]
```

---

## ✅ IMPLEMENTATION CHECKLIST

**Stripe:**
- [ ] Create "PT Booking System" product with £29 base + usage
- [ ] Create "Booking System" product with £10 flat
- [ ] Set both to 30-day trial
- [ ] Test both subscription flows
- [ ] Configure billing portal

**Code:**
- [ ] Detect business type (isTrainer vs other)
- [ ] Assign correct Stripe product at signup
- [ ] Track and report client count to Stripe (daily)
- [ ] Add billing dashboard showing:
  - Base fee
  - Usage/overage
  - Total monthly cost
  - Next billing date

**Communication:**
- [ ] Write email to existing PTs (choose Option A/B/C)
- [ ] Update pricing page
- [ ] Update FAQ with examples
- [ ] Update onboarding flow

**Testing:**
- [ ] Test PT signup → gets correct product
- [ ] Test other business signup → gets different product
- [ ] Test overage billing (add clients mid-month)
- [ ] Test invoice generation
- [ ] Test Stripe portal display

---

## 🎯 GO-LIVE CHECKLIST

1. ✅ All Stripe products created and tested
2. ✅ Code changes deployed (business type detection)
3. ✅ Billing dashboard working
4. ✅ Email templates ready
5. ✅ Pricing page updated
6. ✅ FAQ updated
7. ✅ Support team briefed
8. ✅ Send email to existing customers (migration offer)
9. ✅ Monitor churn/conversion rates
10. ✅ Adjust communication if needed

---

## 📈 SUCCESS METRICS TO TRACK

- [ ] Churn rate on existing PT subscriptions (target: <10%)
- [ ] Upgrade rate from £10 to £29 tier (target: 70%+)
- [ ] New PT signup → paid conversion (target: 85%+)
- [ ] Average client count per PT (tracks overage revenue)
- [ ] Monthly recurring revenue growth (target: +100%)

