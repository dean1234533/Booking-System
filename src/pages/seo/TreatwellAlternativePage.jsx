import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, BottomCTA, FAQSection, DARK, SANS, GOLD , InternalLinks } from "./shared";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const COMPARE = [
  ["No commission on bookings",     true,  false],
  ["Flat predictable monthly fee",  true,  false],
  ["Your own branded page",         true,  false],
  ["Multi-industry (not just beauty)", true, false],
  ["90-day free trial",             true,  false],
  ["Online deposit collection",     true,  true ],
  ["UK-built platform",             true,  true ],
  ["Client portal & intake forms",  true,  false],
  ["PT & decorator support",        true,  false],
  ["Installable PWA app",           true,  false],
];

const FAQS = [
  { q: "How much does Treatwell charge per booking?", a: "Treatwell typically charges a commission of 20–30% on every booking made through their platform. On a £50 appointment, that's up to £15 going to Treatwell before you even account for your costs." },
  { q: "Can I keep my existing clients when I move?", a: "Yes. Your existing clients can rebook directly at bookrightly.co.uk/your-name. You can share the link on Instagram, WhatsApp, or Google — no marketplace needed." },
  { q: "Is Bookrightly only for salons and beauty?", a: "No — that's one of the key differences. Bookrightly supports barbers, hairdressers, personal trainers, and decorators. Treatwell is beauty-only." },
  { q: "How long does it take to set up?", a: "Most professionals are fully set up in under an hour. Add your services, set your availability, upload a photo, and your booking page is live." },
  { q: "What does Bookrightly cost after the trial?", a: "£10/month for most business types, £20/month for personal trainers (who get additional features like PAR-Q forms, food diary, and a client portal)." },
];

export default function TreatwellAlternativePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Treatwell Alternative UK"
        title="Stop giving Treatwell 30% of every booking"
        subtitle="Treatwell takes a commission on every appointment. Bookrightly charges a flat £10–20/month — no percentage, no marketplace, no race to the bottom on price."
      />

      <Section dark>
        <SectionHead
          eyebrow="The Treatwell problem"
          title="A commission model that punishes your success"
          sub="The more bookings you take on Treatwell, the more you pay them. On 20 appointments at £50 each, you could be handing over £200+ a week. That's over £10,000 a year to a platform you don't own."
        />
        <Grid container spacing={3}>
          {[
            ["💸", "Up to 30% commission", "Every booking through Treatwell costs you a percentage. On a £60 colour treatment, that's £12–18 in commission before you've paid for product, rent, or your own time."],
            ["🏬", "You're one of thousands", "On Treatwell, your salon sits next to every other salon in your area. Customers filter by price. You either drop your prices or lose bookings to someone cheaper."],
            ["⏳", "No-shows still cost you", "Treatwell charges commission on confirmed bookings regardless of whether the client shows up. At least with Bookrightly's deposit system, no-shows don't leave you out of pocket."],
            ["🔒", "They own the customer relationship", "Customers book 'via Treatwell'. They return to Treatwell, not your page. Bookrightly gives you a page your clients bookmark directly."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="Bookrightly vs Treatwell" title="Feature comparison" />
        <Box sx={{ maxWidth: 640, mx: "auto" }}>
          {COMPARE.map(([label, book, treat]) => (
            <Box key={label} sx={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", borderBottom: "1px solid rgba(255,255,255,0.05)", py: 1.5, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>{label}</Typography>
              <Box sx={{ textAlign: "center" }}>
                {book ? <CheckCircleIcon sx={{ color: GOLD, fontSize: 20 }} /> : <CancelIcon sx={{ color: "rgba(255,255,255,0.15)", fontSize: 20 }} />}
              </Box>
              <Box sx={{ textAlign: "center" }}>
                {treat ? <CheckCircleIcon sx={{ color: "#4ade80", fontSize: 20 }} /> : <CancelIcon sx={{ color: "rgba(255,255,255,0.15)", fontSize: 20 }} />}
              </Box>
            </Box>
          ))}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", pt: 1.5 }}>
            <Box />
            <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.72rem", color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>Bookrightly</Typography>
            <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Treatwell</Typography>
          </Box>
        </Box>
      </Section>

      <Section dark>
        <SectionHead eyebrow="The maths" title="What the commission actually costs you" sub="A real example for a busy UK salon" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 3, maxWidth: 800, mx: "auto" }}>
          {[
            ["20 bookings/week", "At £50 avg", "£1,000/week revenue"],
            ["Treatwell at 25%", "Commission taken", "£250/week to Treatwell"],
            ["Bookrightly", "£20/month flat", "£5/week. Save £245/week."],
          ].map(([label, sub, value]) => (
            <Box key={label} sx={{ bgcolor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", p: 3, textAlign: "center" }}>
              <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.8rem", color: GOLD, letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>{label}</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", mb: 1 }}>{sub}</Typography>
              <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#fff" }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Section>
        <SectionHead eyebrow="FAQ" title="Common questions" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/treatwell-alternative" />
      <BottomCTA
        title="90 days free. No commission. Ever."
        sub="Set up your Bookrightly profile today and stop handing over a cut of every booking to a marketplace you don't own."
      />
    </Box>
  );
}
