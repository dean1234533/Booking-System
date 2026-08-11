import React from "react";
import { Box, Grid } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, StepCard, BottomCTA, FAQSection, DARK, SANS , InternalLinks } from "./shared";

const FAQS = [
  { q: "Is Bookrightly booking software free for barbers?", a: "Yes — 90-day free trial, no credit card required. After that it's £10/month flat with no commission on bookings." },
  { q: "Can I take deposits when clients book?", a: "Yes. Bookrightly integrates Stripe so you can collect a deposit at the point of booking, which reduces no-shows significantly." },
  { q: "Do clients need to download an app?", a: "No. Clients book directly through your Bookrightly page in any browser. They can optionally install it as a PWA on their home screen." },
  { q: "Can I add all my services and prices?", a: "Yes. Add as many services as you like — fades, hot towel shaves, kids cuts, beard trims — each with their own price, duration, and description." },
  { q: "Will my barber shop have its own page?", a: "Yes. Your shop gets a public profile at bookrightly.co.uk/your-shop-name with your logo, photos, services, reviews, and live booking." },
  { q: "Can I manage multiple barbers in one shop?", a: "Barber management for multiple chairs is on the roadmap. Currently each barber registers their own profile." },
];

export default function BarberSoftwarePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Barber Booking Software UK"
        title="Online booking software built for UK barbers"
        subtitle="Stop taking bookings over WhatsApp. Bookrightly gives your barbershop a professional online presence, real-time slot availability, and deposit collection — for £10/month."
        cta="Start free for 90 days"
      />

      <Section dark>
        <SectionHead
          eyebrow="Built for barbers"
          title="Everything a barbershop needs online"
          sub="From the fade to the payment — the whole booking journey handled for you."
        />
        <Grid container spacing={3}>
          {[
            ["💈", "Your own branded shop page", "A full public profile with your shop name, logo, hero image, service menu with prices, reviews, and a Book Now button. Looks professional on every device."],
            ["📅", "Real-time slot availability", "Set your working hours, block off days off, and let clients see exactly when you're free — without calling or messaging."],
            ["💳", "Deposit collection at booking", "Connected via Stripe. Clients pay a deposit when they book, which goes straight to your account minus the standard Stripe fee. No-shows become rare."],
            ["⭐", "Reviews on your page", "Happy clients can leave a review directly on your Bookrightly page, building social proof for every new visitor who lands on your profile."],
            ["🔔", "Booking notifications", "Get notified the moment a new booking comes in — push notification, no app required on the client side."],
            ["📱", "Installs like an app", "Clients can add your Bookrightly page to their iPhone or Android home screen. It opens instantly, works offline, and feels like a native app."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="How it works" title="Set up your barbershop in under an hour" />
        <Grid container spacing={3}>
          {[
            ["1", "Create your profile", "Add your shop name, logo, hero image, brand colour, services with prices, and a bio. Takes 20 minutes."],
            ["2", "Set your availability", "Block out your working hours and days off. Clients only see slots when you're actually available."],
            ["3", "Share your booking link", "Drop your bookrightly.co.uk/your-shop link in your Instagram bio, WhatsApp status, and Google profile. Clients book 24/7."],
            ["4", "Get paid at booking", "Clients pay a deposit through Stripe. You receive it directly, minus standard processing fees. No chasing payments."],
          ].map(([number, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <StepCard number={number} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section dark>
        <SectionHead eyebrow="Pricing" title="£10/month. Nothing else." sub="No setup fee. No commission. No contract. Cancel anytime." />
        <Box sx={{ maxWidth: 480, mx: "auto", bgcolor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)", p: 4, textAlign: "center" }}>
          {[
            "Public barbershop profile page",
            "Unlimited services and slots",
            "Stripe deposit collection",
            "Push notification bookings",
            "Customer reviews",
            "PWA — installs on any phone",
            "90-day free trial included",
          ].map((item) => (
            <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, textAlign: "left" }}>
              <Box sx={{ width: 6, height: 6, bgcolor: "#C9A84C", borderRadius: "50%", flexShrink: 0 }} />
              <Box component="span" sx={{ fontSize: "0.87rem", color: "rgba(255,255,255,0.7)" }}>{item}</Box>
            </Box>
          ))}
        </Box>
      </Section>

      <Section>
        <SectionHead eyebrow="FAQ" title="Questions about barber booking software" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/booking-software/barbers" />
      <BottomCTA
        title="Your barbershop, bookable online today"
        sub="90 days free. No card needed. Set up in under an hour and start taking bookings tonight."
      />
    </Box>
  );
}
