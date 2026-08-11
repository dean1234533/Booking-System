import React from "react";
import { Box, Grid, Typography, Stack } from "@mui/material";
import { SEOHero, Section, SectionHead, BottomCTA, FAQSection, CTAButton, DARK, DARK3, SANS, SERIF, GOLD , InternalLinks } from "./shared";
import { useNavigate } from "react-router-dom";

const PLANS = [
  {
    name: "Barber / Hairdresser",
    price: "£10",
    period: "/month",
    trial: "90-day free trial",
    features: [
      "Branded public profile page",
      "Real-time slot availability",
      "Service menu with prices",
      "Stripe deposit collection",
      "Customer reviews",
      "Before & after portfolio",
      "PWA — installs on any phone",
      "Push notification bookings",
    ],
  },
  {
    name: "Personal Trainer",
    price: "£20",
    period: "/month",
    trial: "90-day free trial",
    highlight: true,
    features: [
      "Everything in the standard plan",
      "Digital PAR-Q health screening",
      "Client food diary & logging",
      "Session check-ins & progress tracking",
      "Custom workout plan builder",
      "Client portal",
      "YouTube training video embed",
      "Stripe session & package payments",
    ],
  },
  {
    name: "Decorator / Trades",
    price: "£10",
    period: "/month",
    trial: "90-day free trial",
    features: [
      "Branded public profile page",
      "Before & after portfolio",
      "Quote request form",
      "Site visit slot booking",
      "Colour approval workflow",
      "Service area description",
      "Customer reviews",
      "PWA — installs on any phone",
    ],
  },
];

const FAQS = [
  { q: "Is there a free trial?", a: "Yes. Every plan includes a 90-day free trial with no credit card required. You get full access to every feature from day one." },
  { q: "Is there a contract or minimum term?", a: "No contract. Pay month to month and cancel anytime. No cancellation fees." },
  { q: "Does Bookrightly take commission on my bookings?", a: "No. Bookrightly charges a flat monthly subscription only. The only transaction fee is the standard Stripe processing fee (~2.5%) which is added on top of your service price and paid by the client." },
  { q: "What happens after the 90-day trial?", a: "You'll be prompted to add a payment method. If you don't, your profile remains active but booking will be paused until you subscribe." },
  { q: "Can I switch between plans?", a: "Yes. If your business type changes or you want to upgrade to a PT plan, you can update your plan from the dashboard." },
  { q: "Are there any setup fees?", a: "None. No setup fee, no onboarding fee, no hidden charges." },
  { q: "What does the Stripe processing fee look like?", a: "When a client pays a £20 deposit, they pay £20.50 (2.5% added on top). After Stripe's processing (~39p), you receive approximately £20.11." },
];

export default function PricingPageSEO() {
  const navigate = useNavigate();
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Bookrightly Pricing"
        title="Simple, honest pricing for UK service professionals"
        subtitle="Flat monthly fee. No commission. No contract. 90 days free to start — no credit card needed."
        cta="Start your free trial"
      />

      <Section dark>
        <SectionHead eyebrow="Plans" title="One price. Everything included." sub="No tiers, no feature paywalls, no add-ons. One flat fee covers everything your business type needs." />
        <Grid container spacing={3} justifyContent="center">
          {PLANS.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.name}>
              <Box sx={{
                bgcolor: plan.highlight ? "rgba(201,168,76,0.07)" : DARK3,
                border: `1px solid ${plan.highlight ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.07)"}`,
                p: 3.5, height: "100%", display: "flex", flexDirection: "column",
              }}>
                <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.8rem", color: plan.highlight ? GOLD : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", mb: 2 }}>
                  {plan.name}
                </Typography>
                <Stack direction="row" alignItems="flex-end" spacing={0.5} mb={0.5}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "2.8rem", lineHeight: 1, color: plan.highlight ? GOLD : "#fff" }}>{plan.price}</Typography>
                  <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", pb: 0.5 }}>{plan.period}</Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.75rem", color: GOLD, fontWeight: 600, mb: 3 }}>{plan.trial}</Typography>
                <Box sx={{ flex: 1 }}>
                  {plan.features.map((f) => (
                    <Box key={f} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.25 }}>
                      <Box sx={{ width: 5, height: 5, bgcolor: plan.highlight ? GOLD : "rgba(255,255,255,0.3)", borderRadius: "50%", mt: 0.7, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{f}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ mt: 3 }}>
                  <CTAButton onClick={() => navigate("/signup")}>Start free trial</CTAButton>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="How transaction fees work" title="The only extra cost — and your client pays it" />
        <Box sx={{ maxWidth: 640, mx: "auto", bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.07)", p: 4 }}>
          {[
            ["Your service price", "£20.00", false],
            ["Bookrightly transaction fee (2.5%)", "+ £0.50", false],
            ["What your client pays", "£20.50", false],
            ["Stripe processing fee (~39p)", "− £0.39", false],
            ["What you receive", "≈ £20.11", true],
          ].map(([label, value, highlight]) => (
            <Box key={label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, borderBottom: highlight ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
              <Typography sx={{ fontSize: "0.85rem", color: highlight ? "#fff" : "rgba(255,255,255,0.55)", fontWeight: highlight ? 700 : 400 }}>{label}</Typography>
              <Typography sx={{ fontSize: "0.9rem", color: highlight ? GOLD : "rgba(255,255,255,0.55)", fontWeight: highlight ? 800 : 400, fontFamily: highlight ? SERIF : SANS }}>{value}</Typography>
            </Box>
          ))}
          <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", mt: 2, lineHeight: 1.7 }}>
            The 2.5% fee is added on top of your price — your client pays it, not you. The Stripe processing fee is standard across all payment platforms and cannot be waived.
          </Typography>
        </Box>
      </Section>

      <Section dark>
        <SectionHead eyebrow="FAQ" title="Pricing questions answered" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <InternalLinks current="/pricing" />
      <BottomCTA
        title="90 days free. No card. No commitment."
        sub="Start your free trial today and see how Bookrightly works for your business before you pay anything."
      />
    </Box>
  );
}
