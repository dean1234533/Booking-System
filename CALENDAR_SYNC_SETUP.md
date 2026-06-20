# Calendar Sync Integration — Setup Guide

## Overview

The Calendar Sync feature allows business owners to:
1. Connect their Google Calendar to the booking system
2. Prevent double-booking (clients only see free slots)
3. Automatically add appointments to their Google Calendar
4. Send calendar invites to clients via email

**Cost:** Completely FREE (uses Google Calendar API free tier)

---

## Step 1: Set Up Google OAuth 2.0

### 1.1 Go to Google Cloud Console
1. Visit: [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Name it: "Booking System Calendar"

### 1.2 Enable Google Calendar API
1. Go to **APIs & Services → Library**
2. Search for **"Google Calendar API"**
3. Click on it and press **"Enable"**

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen first:
   - **User Type:** External
   - **App name:** Booking System
   - **User support email:** Your email
   - **Scopes:** Add `https://www.googleapis.com/auth/calendar`
4. For **Application type**, select **"Web application"**
5. Add **Authorized JavaScript origins:**
   - `http://localhost:5173` (development)
   - `https://yourapp.com` (production)
   - `https://www.yourapp.com` (if using www)
6. Add **Authorized redirect URIs:**
   - `http://localhost:5173/dashboard?tab=calendar` (development)
   - `https://yourapp.com/api/google-calendar/callback` (production)

### 1.4 Copy Your Credentials
You'll get a **Client ID** and **Client Secret**. Copy these!

---

## Step 2: Configure Environment Variables

### 2.1 For Development (`.env` or `.env.local`)
```bash
# Google Calendar API
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/dashboard?tab=calendar
```

### 2.2 For Production (Vercel, Cloudflare Pages, etc.)
Set the same environment variables in your hosting provider's dashboard:
- **VITE_GOOGLE_CLIENT_ID** (public, safe to expose)
- **GOOGLE_CLIENT_SECRET** (keep private!)
- **VITE_GOOGLE_REDIRECT_URI** (set to your production domain)

Example for production:
```
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
VITE_GOOGLE_REDIRECT_URI=https://yourbookingapp.com/api/google-calendar/callback
```

---

## Step 3: Firebase Admin SDK Setup (Backend)

The Calendar Sync API requires Firebase Admin credentials to store OAuth tokens securely.

### 3.1 Get Firebase Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Settings → Service Accounts**
3. Click **"Generate New Private Key"**
4. Save the JSON file

### 3.2 Convert to Environment Variable
The JSON needs to be a single-line string:

```bash
# Get the JSON as a single line (all on one line, no newlines)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

For Vercel/Cloudflare, you can also set:
```
FIREBASE_SERVICE_ACCOUNT_KEY=your_full_json_here_on_one_line
```

---

## Step 4: Test the Integration

### 4.1 Start Development Server
```bash
npm run dev
```

### 4.2 Connect Your Calendar
1. Log in to your dashboard
2. Go to **Calendar** tab (new tab)
3. Click **"🔗 Connect Google Calendar"**
4. Follow the Google authorization flow
5. You should see "Connected as your@gmail.com"

### 4.3 Trigger a Test Booking
1. Create a test booking on your site
2. Complete the payment
3. Check your Google Calendar — the event should appear!
4. Check your email — you should receive a calendar invite

### 4.4 Test Display Modes
1. In Calendar tab, try each display mode:
   - "Show only free slots" — Creates a calendar event, then check if slot disappears
   - "Show owner availability blocks" — (requires manual availability marking)
   - "Show all times" — No filtering

---

## Step 5: Deploy to Production

### 5.1 For Vercel
1. Add environment variables in **Settings → Environment Variables**
2. Deploy: `git push` triggers automatic deployment
3. Update **VITE_GOOGLE_REDIRECT_URI** to your production domain

### 5.2 For Cloudflare Pages
1. Go to **Settings → Environment variables**
2. Add the same variables
3. Redeploy your app

### 5.3 Test on Production
1. Visit your production domain
2. Connect Google Calendar again (may need new OAuth consent)
3. Create a test booking
4. Verify event appears in your calendar

---

## Troubleshooting

### "Calendar not connected" error
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly
- Ensure the Firebase service account has Firestore access

### OAuth redirect error
- Verify the redirect URI in `.env` matches **exactly** what's in Google Cloud Console
- Check that your domain is in the authorized origins list
- For local development, make sure `localhost:5173` is authorized

### Calendar event not created
- Check browser console for errors
- Verify client's email address is correct
- Check that the backend API route `/api/google-calendar/create-event` is accessible
- Verify `GOOGLE_CLIENT_SECRET` is correct in environment variables

### "Sync Now" button does nothing
- Check that calendar is connected
- Verify Firebase credentials are loaded
- Check network tab in browser dev tools for API errors

---

## Features Implemented

✅ **OAuth Connect/Disconnect**
- One-click Google Calendar connection
- Secure token storage in Firestore

✅ **Display Modes**
- Show free slots (hide calendar events)
- Show all times (no filtering)
- Availability blocks support (can be added by owner)

✅ **Booking → Calendar Sync**
- Event auto-created in owner's calendar
- iCalendar (.ics) invite emailed to client
- Event includes: date, time, service, client name

✅ **Cancellation Sync**
- Event deleted from calendar when booking cancelled
- Client notified of cancellation

✅ **Manual Sync**
- "Sync Now" button to refresh calendar events
- Last sync timestamp displayed

---

## Architecture Overview

```
Dashboard (Calendar Tab)
    ↓
CalendarSyncTab.jsx (UI)
    ├─ Connect Google → OAuth flow
    ├─ Display Mode selector → updateCalendarSettings()
    ├─ Sync Now → /api/google-calendar/sync
    └─ Disconnect → disconnectCalendar()

CheckoutForm (After Payment)
    ↓
/api/google-calendar/create-event
    ├─ Creates event in owner's calendar
    ├─ Sends iCalendar invite to client
    └─ Stores eventId in booking doc

SlotPicker (Display Available Slots)
    ↓
Filters slots based on:
    ├─ displayMode = "free-slots" → hide booked/busy times
    ├─ displayMode = "availability-blocks" → show only available windows
    └─ displayMode = "all-times" → no filtering

Booking Cancellation (Dashboard)
    ↓
/api/google-calendar/delete-event
    └─ Removes event from owner's calendar
```

---

## Free Tier Quota

**Google Calendar API Free Tier:**
- 1,000,000 requests per day
- ~11,500 requests per second

**Typical Usage:**
- 1 booking = 2 API calls (create event + send invite)
- 1 cancellation = 1 API call (delete event)
- 1 sync = 1 API call (list events)

**At 1,000 bookings/day:** Only ~3,000 API calls = **99.7% under quota** ✅

---

## Security Notes

✅ **Tokens Encrypted at Rest:**
- Stored in Firestore with encryption
- Never logged or exposed in browser

✅ **OAuth 2.0 Security:**
- CSRF state token generated for each auth flow
- Authorization code never exposed to client

✅ **Scope Limiting:**
- Only requests `calendar` scope (can read/write events)
- Users can revoke access anytime

✅ **Per-User Access:**
- Each barber/trainer only accesses their own calendar
- No cross-user calendar access possible

---

## Next Steps (Optional Features)

- [ ] Add Outlook/Microsoft Calendar support (same free API)
- [ ] Auto-refresh calendar events every 6 hours
- [ ] Calendar event templates (custom descriptions)
- [ ] Timezone-aware event creation
- [ ] Calendar availability blocks (owner marks available hours)
- [ ] Two-way sync (changes in calendar reflect in bookings)

---

## Support

If you encounter issues:
1. Check browser console for error messages
2. Verify all environment variables are set
3. Check `/api` routes are accessible (no 404)
4. Verify Firebase service account JSON is valid JSON
5. Check Google Cloud Console for API quota/errors

For debugging, add `console.log()` statements in the API routes to see what's happening.
