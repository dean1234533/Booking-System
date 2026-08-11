import React from "react";
import { Box, Grid } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, StepCard, BottomCTA, FAQSection, DARK, SANS , InternalLinks } from "./shared";

const FAQS = [
  { q: "Is this booking software free for hair salons?", a: "Yes — 90-day free trial with no credit card required. After that, it's £10/month with no commission on any booking." },
  { q: "Can I list all my salon treatments and prices?", a: "Yes. Add every treatment — cuts, colours, balayage, keratin, blowdrys — each with their own price, duration, and description." },
  { q: "Do clients need an account to book?", a: "No. Clients book directly on your public salon page — no sign-up required on their end." },
  { q: "Can I collect a deposit to reduce no-shows?", a: "Yes. Stripe is built in. You set the deposit amount per service, and clients pay it at the point of booking." },
  { q: "How is this different from Treatwell?", a: "Treatwell takes 20–30% commission on every booking. Bookrightly charges a flat £10/month. At 20 bookings a week, that difference is thousands of pounds per year." },
  { q: "Can clients book colour consultations?", a: "Yes. You can add any service including consultations, patch tests, and colour approval sessions." },
];

export default function SalonSoftwarePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Salon Booking Software UK"
        title="Online booking software for UK hair salons"
        subtitle="Give your salon a professional booking page — no marketplace, no 30% commission, no chasing clients over Instagram DM. Just a clean booking flow at £10/month."
        cta="Try free for 90 days"
      />

      <Section dark>
        <SectionHead
          eyebrow="Built for salons"
          title="A full booking system, not just a calendar"
          sub="Your salon page, your brand, your clients — handled end to end."
        />
        <Grid container spacing={3}>
          {[
            ["💇‍♀️", "Branded salon page", "Your salon gets a public profile with your name, logo, hero image, colour palette, treatment menu, and a live booking button. Looks premium on desktop and mobile."],
            ["🎨", "Before & after portfolio", "Showcase your colour work, cuts, and transformations directly on your salon page. Clients see your quality before they book."],
            ["💳", "Deposit booking via Stripe", "Collect a deposit at the point of booking to protect against no-shows. Funds go directly to your bank account via Stripe."],
            ["📩", "Automated booking confirmations", "Clients receive a booking confirmation the moment they book. You get a push notification. No manual follow-up needed."],
            ["⭐", "Client reviews on your page", "Clients leave reviews that show on your public profile, building trust for every new visitor who finds you."],
            ["📱", "Works on every device", "Your booking page is fully responsive and can be installed as a PWA — clients add it to their home screen like a native app."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="How it works" title="Live and taking bookings in under an hour" />
        <Grid container spacing={3}>
          {[
            ["1", "Build your salon page", "Add your salon name, logo, services with prices, your bio, and upload your portfolio images. Your page is live instantly."],
            ["2", "Set your availability", "Add your working hours and any days you're closed. Clients only see real available slots — no double-bookings."],
            ["3", "Share your booking link", "Post your bookrightly.co.uk/your-salon link on Instagram, in your WhatsApp bio, and on Google Business. Start taking bookings 24/7."],
            ["4", "Deposits collected automatically", "Every booking comes with a deposit payment via Stripe. Reduces no-shows and protects your time."],
          ].map(([number, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <StepCard number={number} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section dark>
        <SectionHead eyebrow="FAQ" title="Questions about salon booking software" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/booking-software/salons" />
      <BottomCTA
        title="Your salon, bookable online from today"
        sub="90-day free trial. Flat £10/month after that. No commission, no marketplace, no surprises."
      />
    </Box>
  );
}
