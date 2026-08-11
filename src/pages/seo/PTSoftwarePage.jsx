import React from "react";
import { Box, Grid } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, StepCard, BottomCTA, FAQSection, DARK, SANS , InternalLinks } from "./shared";

const FAQS = [
  { q: "Is Bookrightly free for personal trainers?", a: "Yes — 90-day free trial, no card required. The PT plan is £20/month after that, which includes all the client management features barbers and salons don't need." },
  { q: "Does Bookrightly support PAR-Q forms?", a: "Yes. Clients fill in a digital PAR-Q health screening form before their first session. Submissions are saved in your client dashboard." },
  { q: "Can I create workout plans for clients?", a: "Yes. Build and assign custom workout plans to individual clients. Clients access them through their own portal." },
  { q: "Can I track client check-ins and progress?", a: "Yes. Clients log check-ins, body stats, and progress notes. You see everything in your dashboard." },
  { q: "Does it have a food diary feature?", a: "Yes. Clients can log daily food entries which you can review and comment on as part of their programme." },
  { q: "Can I take payment for PT sessions?", a: "Yes. Bookrightly uses Stripe for deposits and session payments. Clients pay when they book a slot through your PT booking page." },
  { q: "How is this different from Mindbody?", a: "Mindbody costs £100–400+/month and is primarily designed for large US gym businesses. Bookrightly is £20/month, built for UK PTs, and includes every feature a solo or small-team trainer needs." },
];

export default function PTSoftwarePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Personal Trainer Booking Software UK"
        title="Booking and client management software for UK personal trainers"
        subtitle="PAR-Q forms, workout plans, food diary, client check-ins, Stripe payments, and a public PT profile — all for £20/month. No other platform at this price comes close."
        cta="Start free for 90 days"
      />

      <Section dark>
        <SectionHead
          eyebrow="Built for PTs"
          title="More than a booking calendar"
          sub="Bookrightly gives personal trainers the tools to manage the full client journey — from first enquiry to long-term progress tracking."
        />
        <Grid container spacing={3}>
          {[
            ["🏋️", "Public PT profile & booking page", "Your own branded page with your bio, services, pricing, YouTube training video, reviews, and a live slot booking system. Clients book and pay in one flow."],
            ["📋", "Digital PAR-Q health screening", "Clients complete a PAR-Q health questionnaire before their first session. Stored permanently in your dashboard — no paper forms, no printing."],
            ["📓", "Food diary", "Clients log their daily nutrition from their phone. You review it in your dashboard and use it in their next session — no separate app needed."],
            ["✅", "Client check-ins", "Clients check in after each session. Track attendance, progress notes, and consistency over time from one place."],
            ["💪", "Custom workout plans", "Build and assign individual workout programmes to each client. They access them through their own client portal on any device."],
            ["💳", "Stripe session payments", "Clients pay for sessions or packages at booking. Funds land in your account via Stripe — no chasing invoices."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="How it works" title="Up and running in under an hour" />
        <Grid container spacing={3}>
          {[
            ["1", "Create your PT profile", "Add your name, bio, services, pricing, a YouTube training video, and your brand colours. Your booking page goes live immediately."],
            ["2", "Set your session slots", "Add your available training slots — 1-to-1s, group sessions, online coaching. Clients book the slot that suits them."],
            ["3", "Clients complete PAR-Q & intake", "New clients fill in a PAR-Q form and any other intake info before their first session — all stored in your dashboard."],
            ["4", "Track progress over time", "Assign workout plans, review food diaries, monitor check-ins, and build a complete picture of each client's progress."],
          ].map(([number, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <StepCard number={number} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section dark>
        <SectionHead eyebrow="Pricing" title="£20/month for the full PT suite" sub="No other platform gives you this much for this price." />
        <Box sx={{ maxWidth: 500, mx: "auto", bgcolor: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.25)", p: 4, textAlign: "center" }}>
          {[
            "Public PT profile with booking page",
            "Digital PAR-Q health screening",
            "Client food diary & nutrition logging",
            "Session check-ins & progress tracking",
            "Custom workout plan builder",
            "Client portal (clients access their own data)",
            "Stripe session & package payments",
            "YouTube training video embed",
            "Push notification bookings",
            "90-day free trial",
          ].map((item) => (
            <Box key={item} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, textAlign: "left" }}>
              <Box sx={{ width: 6, height: 6, bgcolor: "#C9A84C", borderRadius: "50%", flexShrink: 0 }} />
              <Box component="span" sx={{ fontSize: "0.87rem", color: "rgba(255,255,255,0.7)" }}>{item}</Box>
            </Box>
          ))}
        </Box>
      </Section>

      <Section>
        <SectionHead eyebrow="FAQ" title="Questions about PT booking software" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/booking-software/personal-trainers" />
      <BottomCTA
        title="The complete toolkit for serious UK personal trainers"
        sub="PAR-Q, food diary, workout plans, bookings, and payments — all in one platform at £20/month. 90 days free to start."
      />
    </Box>
  );
}
