import React from "react";
import { Box, Grid } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, BottomCTA, FAQSection, DARK, SERIF, SANS, GOLD , InternalLinks } from "./shared";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { Typography, Stack } from "@mui/material";

const COMPARE = [
  ["Flat monthly fee",          true,  false],
  ["No commission per booking", true,  false],
  ["Multi-industry support",    true,  false],
  ["Your own branded page",     true,  false],
  ["90-day free trial",         true,  true ],
  ["Stripe deposits built in",  true,  true ],
  ["UK-built",                  true,  true ],
  ["Full client portal",        true,  false],
  ["PT & decorator support",    true,  false],
  ["Installable PWA",           true,  false],
];

const FAQS = [
  { q: "Is Bookrightly really free for 90 days?", a: "Yes. No credit card required. You get full access to every feature for 90 days before you pay anything." },
  { q: "Does Bookrightly take a cut of my bookings?", a: "No. Bookrightly charges a flat monthly subscription of £10–20. The only transaction fee is the standard Stripe processing fee (which your client pays on top at checkout)." },
  { q: "Can I migrate from Fresha to Bookrightly?", a: "Yes. You can set up your Bookrightly profile in under an hour. Your existing clients can rebook directly through your new branded page." },
  { q: "Does Bookrightly work for beauty businesses?", a: "Yes — hairdressers and barbers are fully supported with service menus, slot availability, deposit booking, and a public profile page." },
  { q: "What industries does Bookrightly support?", a: "Barbers, hairdressers, personal trainers, and decorators — all with industry-specific pages and features." },
];

export default function FreshaAlternativePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Fresha Alternative UK"
        title="The Fresha alternative that keeps your earnings yours"
        subtitle="Fresha's 'free' plan charges a commission on every online payment. Bookrightly charges £10–20/month flat — no cuts, no surprises, no race to the bottom on price."
      />

      <Section dark>
        <SectionHead
          eyebrow="The problem with Fresha"
          title="Free until your customers pay online"
          sub="Fresha's Pay Now feature charges a percentage of every transaction. The more you earn, the more they take. That's not a platform fee — it's a silent business partner taking a cut of your work."
        />
        <Grid container spacing={3}>
          {[
            ["💸", "Hidden transaction fees", "Fresha's 'free' model only works if you never take online payments. The moment a customer pays through Fresha, they take a percentage. At £500/week that quickly adds up to thousands per year."],
            ["🏪", "You're inside their marketplace", "Your Bookrightly page is yours — bookrightly.co.uk/your-name. On Fresha, customers book 'via Fresha'. You build their platform, not your brand."],
            ["💇", "Beauty-only platform", "Fresha was built for salons and beauty. If you're a personal trainer, decorator, or barber looking for more than a cut-and-colour service menu, Fresha doesn't serve you properly."],
            ["📉", "Marketplace pricing pressure", "Being on Fresha means competing against every other salon on the platform. Customers compare prices side-by-side. That race to the bottom hurts your margins."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="Bookrightly vs Fresha" title="Feature comparison" />
        <Box sx={{ maxWidth: 640, mx: "auto" }}>
          {COMPARE.map(([label, book, fresha]) => (
            <Box key={label} sx={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", borderBottom: "1px solid rgba(255,255,255,0.05)", py: 1.5, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>{label}</Typography>
              <Box sx={{ textAlign: "center" }}>
                {book ? <CheckCircleIcon sx={{ color: GOLD, fontSize: 20 }} /> : <CancelIcon sx={{ color: "rgba(255,255,255,0.15)", fontSize: 20 }} />}
              </Box>
              <Box sx={{ textAlign: "center" }}>
                {fresha ? <CheckCircleIcon sx={{ color: "#4ade80", fontSize: 20 }} /> : <CancelIcon sx={{ color: "rgba(255,255,255,0.15)", fontSize: 20 }} />}
              </Box>
            </Box>
          ))}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", pt: 1.5 }}>
            <Box />
            <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.72rem", color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Bookrightly</Typography>
            <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Fresha</Typography>
          </Box>
        </Box>
      </Section>

      <Section dark>
        <SectionHead eyebrow="Why switch" title="What Bookrightly does differently" />
        <Grid container spacing={3}>
          {[
            ["🏷️", "Your brand, your page", "bookrightly.co.uk/fade-factory is yours. Not Fresha's. Customers bookmark you, not the marketplace."],
            ["💰", "£10–20/month, nothing more", "That's the whole fee. Whether you take 5 bookings or 50 in a week, you pay the same. No percentage, no surcharges."],
            ["📱", "Installs like a real app", "Customers can add Bookrightly to their home screen — it works offline, sends push notifications, and feels like a native app."],
            ["📋", "Client management built in", "PAR-Q forms, food diaries, check-ins, colour approvals — features no other platform at this price includes."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="FAQ" title="Common questions" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/fresha-alternative" />
      <BottomCTA
        title="Switch from Fresha in under an hour"
        sub="Set up your Bookrightly profile, share your new booking link with clients, and stop losing a cut of every payment."
      />
    </Box>
  );
}
