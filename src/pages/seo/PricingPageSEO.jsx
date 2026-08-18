import React from "react";
import { Box, Typography, Stack, Button } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { useNavigate } from "react-router-dom";
import { BottomCTA, FAQSection, InternalLinks, SANS } from "./shared";

const PLANS = [
  { name: "Barber / Hairdresser", short: "Hair & barber", price: "10", accent: "#2563EB", features: ["Branded booking website", "Live availability and deposits", "Services, portfolio and reviews", "Client history and notifications", "PWA and social booking link"] },
  { name: "Personal Trainer", short: "Personal trainer", price: "20", accent: "#ff765c", features: ["Everything in Hair & barber", "PAR-Q and digital check-ins", "Food diary and workout plans", "Progress tracking and client portal", "Session and package payments"] },
  { name: "Decorator / Trades", short: "Decorator", price: "10", accent: "#93C5FD", features: ["Branded project website", "Portfolio and quote requests", "Site-visit scheduling", "Colour approval workflow", "Reviews and service areas"] },
];

const FAQS = [
  { q: "Is there a free trial?", a: "Yes. Every plan includes a 90-day free trial with no credit card required." },
  { q: "Is there a contract?", a: "No. Pay month to month and cancel whenever you need to." },
  { q: "Does Bookrightly take commission?", a: "No booking commission. A small platform fee applies only when a payment is processed." },
  { q: "What happens after the trial?", a: "Add a payment method to stay live. Without one, new bookings pause until you subscribe." },
  { q: "Are there setup fees?", a: "No setup, onboarding or cancellation fees." },
];

export default function PricingPageSEO() {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState(0);
  const plan = PLANS[selected];

  return (
    <Box sx={{ bgcolor: "#f4f1e9", color: "#111116", minHeight: "100vh", fontFamily: SANS }}>
      <Box sx={{ px: { xs: 2, md: 5 }, pt: { xs: 13, md: 17 }, pb: { xs: 6, md: 8 }, maxWidth: 1260, mx: "auto" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr .95fr" }, gap: { xs: 5, md: 8 }, alignItems: "end" }}>
          <Box>
            <Typography sx={{ color: "#2563EB", fontWeight: 950, fontSize: ".7rem", letterSpacing: ".15em", textTransform: "uppercase" }}>Pricing without the puzzle</Typography>
            <Typography component="h1" sx={{ fontSize: { xs: "3rem", sm: "4.4rem", md: "6rem" }, fontWeight: 950, letterSpacing: "-.075em", lineHeight: .88, mt: 2 }}>One plan.<br />Your whole business.</Typography>
          </Box>
          <Box sx={{ pb: .5 }}>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, lineHeight: 1.65, color: "#696a73", maxWidth: 520 }}>Start with every tool for 90 days. No card, no feature maze, no long contract. Pick the work you do and see the exact price.</Typography>
            <Stack direction="row" spacing={1.25} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={() => navigate("/signup")} sx={{ borderRadius: 99, px: 3, py: 1.3, bgcolor: "#111116" }}>Start free</Button>
              <Button onClick={() => navigate("/compare")} endIcon={<ArrowOutwardRoundedIcon />} sx={{ color: "#111116", fontWeight: 850 }}>Compare tools</Button>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "#111116", color: "#fff", borderRadius: { xs: "32px 32px 0 0", md: "56px 56px 0 0" }, px: { xs: 2, md: 5 }, py: { xs: 5, md: 8 } }}>
        <Box sx={{ maxWidth: 1160, mx: "auto" }}>
          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 2, mb: 3 }}>
            {PLANS.map((item, index) => (
              <Button key={item.name} onClick={() => setSelected(index)} sx={{ whiteSpace: "nowrap", borderRadius: 99, px: 2.5, py: 1.2, color: selected === index ? "#111116" : "#fff", bgcolor: selected === index ? item.accent : "#ffffff0b", border: "1px solid", borderColor: selected === index ? item.accent : "#ffffff20", "&:hover": { bgcolor: selected === index ? item.accent : "#ffffff16" } }}>{item.short}</Button>
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.2fr" }, minHeight: 430, overflow: "hidden", borderRadius: { xs: 4, md: 7 }, border: "1px solid #ffffff1f" }}>
            <Box sx={{ p: { xs: 3, md: 5 }, bgcolor: plan.accent, color: plan.accent === "#93C5FD" ? "#111116" : "#fff", display: "flex", flexDirection: "column" }}>
              <Typography sx={{ fontWeight: 900, fontSize: ".72rem", letterSpacing: ".12em", textTransform: "uppercase" }}>{plan.name}</Typography>
              <Box sx={{ display: "flex", alignItems: "flex-start", mt: "auto" }}><Typography sx={{ fontSize: { xs: "6rem", md: "9rem" }, fontWeight: 950, letterSpacing: "-.1em", lineHeight: .8 }}>£{plan.price}</Typography><Typography sx={{ mt: 1.5, fontWeight: 800 }}>/mo</Typography></Box>
              <Typography sx={{ mt: 3, fontWeight: 800 }}>90 days free. Then monthly. Cancel anytime.</Typography>
            </Box>
            <Box sx={{ p: { xs: 3, md: 5 }, bgcolor: "#191a20", display: "flex", flexDirection: "column" }}>
              <Typography sx={{ color: "#ffffff77", fontSize: ".7rem", fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>Everything you need</Typography>
              <Stack spacing={2.1} sx={{ mt: 3 }}>
                {plan.features.map(item => <Box key={item} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}><Box sx={{ width: 28, height: 28, borderRadius: 2, bgcolor: `${plan.accent}22`, color: plan.accent, display: "grid", placeItems: "center" }}><CheckRoundedIcon sx={{ fontSize: 17 }} /></Box><Typography sx={{ fontWeight: 750 }}>{item}</Typography></Box>)}
              </Stack>
              <Button onClick={() => navigate("/signup")} endIcon={<ArrowOutwardRoundedIcon />} sx={{ mt: "auto", alignSelf: "flex-start", color: plan.accent, fontWeight: 900, px: 0, pt: 4 }}>Start this plan free</Button>
            </Box>
          </Box>

          <Box sx={{ mt: { xs: 7, md: 10 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: ".8fr 1.2fr" }, gap: 5 }}>
            <Box><Typography sx={{ color: "#9da6ff", fontWeight: 900, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase" }}>When you get paid</Typography><Typography sx={{ fontSize: { xs: "2.2rem", md: "3.5rem" }, fontWeight: 950, letterSpacing: "-.06em", lineHeight: 1, mt: 1.5 }}>Fees you can see at a glance.</Typography><Typography sx={{ color: "#ffffff77", lineHeight: 1.7, mt: 2 }}>A real £20 online booking from checkout to payout.</Typography></Box>
            <Box sx={{ bgcolor: "#f4f1e9", color: "#111116", borderRadius: "8px 36px 36px 36px", p: { xs: 3, md: 4 } }}>
              {[["Your service", "£20.00"], ["Platform fee (5%)", "+ £1.00"], ["Card processing", "+ £0.84"], ["Client pays", "£21.84"]].map(([a, b]) => <Box key={a} sx={{ display: "flex", justifyContent: "space-between", py: 1.4, borderBottom: "1px solid #d9d6cd" }}><Typography sx={{ color: "#696a73" }}>{a}</Typography><Typography sx={{ fontWeight: 850 }}>{b}</Typography></Box>)}
              <Box sx={{ display: "flex", justifyContent: "space-between", pt: 2.5 }}><Typography sx={{ fontWeight: 950, fontSize: "1.05rem" }}>You receive</Typography><Typography sx={{ color: "#2563EB", fontWeight: 950, fontSize: "1.8rem" }}>£20.00</Typography></Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 8, md: 11 }, maxWidth: 1000, mx: "auto" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: ".7fr 1.3fr" }, gap: 5 }}><Typography sx={{ fontSize: { xs: "2.2rem", md: "3.5rem" }, fontWeight: 950, letterSpacing: "-.06em", lineHeight: 1 }}>Straight answers.</Typography><FAQSection faqs={FAQS} /></Box>
        <InternalLinks current="/pricing" />
      </Box>
      <BottomCTA title="Put it to work for 90 days." sub="Build your page, open your diary and take real bookings before you pay anything." />
    </Box>
  );
}
