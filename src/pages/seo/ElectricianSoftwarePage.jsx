import React from "react";
import { Box, Grid } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, StepCard, BottomCTA, FAQSection, DARK, SANS, InternalLinks, PricingTiers } from "./shared";
import { LANDING_PAGES } from "../../seo/landingPages.js";

// Content lives in src/seo/landingPages.js — the same object src/worker.js
// reads from to pre-render this page's body HTML for crawlers that don't
// run JavaScript. One source, so the two never drift apart.
const PAGE = LANDING_PAGES["/booking-software/electricians"];

const FEATURE_ICONS = ["booking", "warning", "pound", "location", "assignment"];

export default function ElectricianSoftwarePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Electrician Booking Software UK"
        title={PAGE.h1}
        subtitle={PAGE.intro}
        cta="Start free for 90 days"
      />

      <Section dark>
        <SectionHead
          eyebrow="Built for electricians"
          title="Fixed-slot inspections and call-outs, handled properly"
          sub="Bookable appointments for planned work, a proper request form for anything urgent, and your rates shown upfront."
        />
        <Grid container spacing={3}>
          {PAGE.features.map(({ h2, p }, i) => (
            <Grid item xs={12} sm={6} md={4} key={h2}>
              <FeatureCard icon={FEATURE_ICONS[i] || "energy"} title={h2} body={p} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="How it works" title="Set up in under 15 minutes" />
        <Grid container spacing={3}>
          {[
            ["1", "Build your profile", "Add your business name, logo, service areas and standard charges — call-out fee, hourly rate, minimum charge, emergency rate."],
            ["2", "List your bookable work", "Add fixed-slot services like EICRs and PAT testing with a price and duration, so clients can book a real appointment."],
            ["3", "Open your call-out form", "Anything that isn't a fixed slot comes through as a job request — problem, urgency, photos — ready for you to quote or schedule."],
            ["4", "Share your link", "Put your Bookrightly link in your Google Business profile and van signage. Clients book or request work 24/7."],
          ].map(([number, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <StepCard number={number} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="More options" title="Not ready for the full plan?" sub="Three lighter, cheaper ways to get started — all with a 90-day free trial." />
        <PricingTiers />
      </Section>

      <Section dark>
        <SectionHead eyebrow="FAQ" title="Questions about electrician booking software" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={PAGE.faq} />
        </Box>
      </Section>

      <InternalLinks current="/booking-software/electricians" />
      <BottomCTA
        title="Your call-outs and inspections, bookable online"
        sub="90 days free. No card needed. Standard charges on your page so clients already know the cost before they call."
      />
    </Box>
  );
}
