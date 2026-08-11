import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, BottomCTA, FAQSection, DARK, SANS, GOLD, DARK3 , InternalLinks } from "./shared";

const FAQS = [
  { q: "How long does it take to get set up?", a: "Most professionals complete their profile and go live in under an hour. Adding a logo, services, availability, and a bio is all you need." },
  { q: "Do clients need to create an account to book?", a: "No. Clients book directly on your public page — no sign-up, no account, no app download required on their end." },
  { q: "What happens when a client books?", a: "They select a service, choose a slot, pay the deposit via Stripe, and receive a booking confirmation. You receive a push notification instantly." },
  { q: "Can I cancel or reschedule bookings?", a: "Yes. You can manage bookings from your dashboard and send cancellation notifications to clients." },
  { q: "Is there a client-facing app?", a: "Clients book through your public Bookrightly page in any browser. They can install it as a PWA (Progressive Web App) on their home screen — no App Store needed." },
  { q: "What do I get in the dashboard?", a: "Your dashboard includes booking management, client profiles, service management, availability settings, notifications, and — for PTs — PAR-Q forms, food diary, workout plans, and check-ins." },
];

export default function HowItWorksPage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="How It Works"
        title="Online booking for UK service professionals — set up in under an hour"
        subtitle="Bookrightly gives every professional their own branded page, a real-time booking system, and Stripe payments. Here's how it works from sign-up to first booking."
        cta="Get started free"
      />

      {/* For businesses */}
      <Section dark>
        <SectionHead eyebrow="For professionals" title="Your side of Bookrightly" sub="From sign-up to taking your first online booking." />
        <Grid container spacing={3}>
          {[
            ["1", "Create your account", "Sign up as a barber, hairdresser, personal trainer, or decorator. Your business type determines which features and template you get."],
            ["2", "Build your profile", "Add your business name, logo, hero image, brand colour, services with prices and durations, a bio, and social links. It takes about 20 minutes."],
            ["3", "Set your availability", "Open your schedule tab, set your working hours, and block out any days you're unavailable. Clients only see slots when you're genuinely free."],
            ["4", "Go live", "Your booking page is live at bookrightly.co.uk/your-name the moment you save. Share the link on Instagram, WhatsApp, and Google Business."],
            ["5", "Manage from your dashboard", "Accept bookings, view your schedule, manage client profiles, update services, and — for PTs — review PAR-Q forms, food diaries, and check-ins."],
            ["6", "Get paid at booking", "Stripe handles deposit collection. Funds go directly to your connected bank account minus the standard processing fee."],
          ].map(([number, title, body]) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <Box sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3.5, height: "100%" }}>
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "rgba(201,168,76,0.2)", lineHeight: 1, mb: 1.5 }}>{number}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1, color: "#fff" }}>{title}</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.84rem", lineHeight: 1.75 }}>{body}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* For clients */}
      <Section>
        <SectionHead eyebrow="For your clients" title="How your clients experience Bookrightly" sub="A fast, simple booking journey with no account needed." />
        <Grid container spacing={3}>
          {[
            ["🔗", "Find your page", "Clients land on your Bookrightly page from your Instagram bio, a WhatsApp link, a Google search, or the Bookrightly homepage directory."],
            ["📋", "Choose a service", "They browse your service menu — each listing shows the name, duration, price, and description. No confusion about what's included."],
            ["📅", "Pick a slot", "A real-time calendar shows available slots. Clients pick the date and time that suits them — no back-and-forth messaging."],
            ["💳", "Pay the deposit", "Stripe collects the deposit securely. The client pays a small percentage upfront — this reduces no-shows and confirms their intent."],
            ["✅", "Booking confirmed", "Client receives a confirmation instantly. You get a push notification. Everything is logged in your dashboard."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* Industry breakdown */}
      <Section dark>
        <SectionHead eyebrow="By industry" title="What each business type gets" />
        <Grid container spacing={2.5}>
          {[
            ["💈", "Barbers", ["Branded shop page", "Services & pricing", "Slot booking", "Deposit via Stripe", "Reviews", "PWA"]],
            ["💇", "Hairdressers", ["Branded salon page", "Before & after portfolio", "Colour treatments", "Slot booking", "Deposit via Stripe", "Reviews"]],
            ["🏋️", "Personal Trainers", ["PT profile & booking", "PAR-Q forms", "Food diary", "Check-ins", "Workout plans", "Client portal"]],
            ["🎨", "Decorators", ["Portfolio page", "Quote request form", "Site visit booking", "Colour approval", "Before & after images", "Reviews"]],
          ].map(([icon, label, features]) => (
            <Grid item xs={12} sm={6} key={label}>
              <Box sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3.5 }}>
                <Typography sx={{ fontSize: "1.8rem", mb: 1 }}>{icon}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: GOLD, mb: 2 }}>{label}</Typography>
                {features.map((f) => (
                  <Box key={f} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 5, height: 5, bgcolor: GOLD, borderRadius: "50%", flexShrink: 0, opacity: 0.6 }} />
                    <Typography sx={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.6)" }}>{f}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="FAQ" title="How it works — questions answered" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/how-it-works" />
      <BottomCTA
        title="Ready to take your first online booking?"
        sub="90-day free trial. No card. Set up in under an hour and share your booking link today."
      />
    </Box>
  );
}
