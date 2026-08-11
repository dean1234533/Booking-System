import React, { useState, useMemo } from "react";
import { Box, Typography, Slider, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

const GOLD = "#C9A84C";
const DARK = "#0d0d0d";
const DARK2 = "#111";
const DARK3 = "#1a1a1a";
const SERIF = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";

function StatBox({ label, value, highlight }) {
  return (
    <Box sx={{ bgcolor: highlight ? "rgba(201,168,76,0.08)" : DARK3, border: `1px solid ${highlight ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}`, p: 3, textAlign: "center" }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "2.6rem" }, color: highlight ? GOLD : "#fff", lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", mt: 1, lineHeight: 1.5 }}>{label}</Typography>
    </Box>
  );
}

function SliderRow({ label, value, min, max, step, onChange, format }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.85rem", color: GOLD, fontWeight: 700 }}>{format(value)}</Typography>
      </Box>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(v)}
        sx={{ color: GOLD, "& .MuiSlider-thumb": { bgcolor: GOLD }, "& .MuiSlider-rail": { bgcolor: "rgba(255,255,255,0.1)" } }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
        <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)" }}>{format(min)}</Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)" }}>{format(max)}</Typography>
      </Box>
    </Box>
  );
}

export default function NoShowCalculator() {
  const navigate = useNavigate();
  const [bookingsPerWeek, setBookingsPerWeek] = useState(20);
  const [avgServicePrice, setAvgServicePrice] = useState(30);
  const [noShowRate, setNoShowRate] = useState(10);
  const [depositAmount, setDepositAmount] = useState(5);

  const results = useMemo(() => {
    const noShowsPerWeek = (bookingsPerWeek * noShowRate) / 100;
    const lostPerWeek = noShowsPerWeek * avgServicePrice;
    const lostPerMonth = lostPerWeek * 4;
    const lostPerYear = lostPerMonth * 12;

    const depositRecoveredPerWeek = noShowsPerWeek * depositAmount;
    const depositRecoveredPerYear = depositRecoveredPerWeek * 52;
    const netLossPerYear = lostPerYear - depositRecoveredPerYear;

    const bookrightlyCostPerYear = 10 * 12;
    const savingsVsCost = depositRecoveredPerYear - bookrightlyCostPerYear;

    return {
      noShowsPerWeek: noShowsPerWeek.toFixed(1),
      lostPerWeek: lostPerWeek.toFixed(0),
      lostPerMonth: lostPerMonth.toFixed(0),
      lostPerYear: lostPerYear.toFixed(0),
      depositRecoveredPerYear: depositRecoveredPerYear.toFixed(0),
      netLossPerYear: netLossPerYear.toFixed(0),
      savingsVsCost: savingsVsCost.toFixed(0),
      roiPositive: savingsVsCost > 0,
    };
  }, [bookingsPerWeek, avgServicePrice, noShowRate, depositAmount]);

  const fmt = (n) => `£${Number(n).toLocaleString()}`;

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      {/* Hero */}
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>
          Free Tool
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, mb: 2, maxWidth: 700, mx: "auto" }}>
          No-Show Cost Calculator
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
          See exactly how much no-shows are costing your business per year — and how much a deposit system would recover.
        </Typography>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
          <Grid container spacing={4}>
            {/* Sliders */}
            <Grid item xs={12} md={6}>
              <Box sx={{ bgcolor: DARK2, border: "1px solid rgba(255,255,255,0.06)", p: 4 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem", mb: 4 }}>Your numbers</Typography>
                <SliderRow label="Bookings per week" value={bookingsPerWeek} min={1} max={100} step={1} onChange={setBookingsPerWeek} format={(v) => v} />
                <SliderRow label="Average service price" value={avgServicePrice} min={10} max={200} step={5} onChange={setAvgServicePrice} format={(v) => `£${v}`} />
                <SliderRow label="Estimated no-show rate" value={noShowRate} min={1} max={40} step={1} onChange={setNoShowRate} format={(v) => `${v}%`} />
                <SliderRow label="Deposit you'd charge" value={depositAmount} min={1} max={50} step={1} onChange={setDepositAmount} format={(v) => `£${v}`} />
              </Box>
            </Grid>

            {/* Results */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem" }}>What it's costing you</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <StatBox label="No-shows per week" value={results.noShowsPerWeek} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Lost per week" value={fmt(results.lostPerWeek)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Lost per month" value={fmt(results.lostPerMonth)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Lost per year" value={fmt(results.lostPerYear)} highlight />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", mb: 2 }}>With a deposit system</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <StatBox label={`Recovered/yr (£${depositAmount} deposit)`} value={fmt(results.depositRecoveredPerYear)} highlight />
                    </Grid>
                    <Grid item xs={6}>
                      <StatBox label="Bookrightly costs/yr" value="£120" />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, bgcolor: results.roiPositive ? "rgba(76,175,128,0.08)" : "rgba(224,92,92,0.08)", border: `1px solid ${results.roiPositive ? "rgba(76,175,128,0.3)" : "rgba(224,92,92,0.3)"}`, p: 3, textAlign: "center" }}>
                    <Typography sx={{ fontFamily: SERIF, fontSize: "2rem", color: results.roiPositive ? "#4caf80" : "#e05c5c", lineHeight: 1 }}>
                      {fmt(Math.abs(results.savingsVsCost))}
                    </Typography>
                    <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", mt: 1 }}>
                      {results.roiPositive
                        ? "net gain per year after Bookrightly subscription"
                        : "net cost even after deposit recovery — increase your deposit amount"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* CTA */}
          <Box sx={{ mt: 6, bgcolor: DARK2, border: "1px solid rgba(201,168,76,0.2)", p: 4, textAlign: "center" }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.4rem", md: "1.8rem" }, mb: 1.5 }}>
              Stop losing {fmt(results.lostPerYear)} a year to no-shows
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", mb: 3, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>
              Bookrightly collects deposits at booking via Stripe, sends automatic reminders, and costs £10/month for barbers, salons, and decorators. 90-day free trial.
            </Typography>
            <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
              Start free trial
            </Box>
          </Box>

          {/* How no-shows happen */}
          <Box sx={{ mt: 6 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", mb: 3 }}>Why no-shows happen — and how deposits fix it</Typography>
            {[
              ["Phone bookings have no commitment", "When someone books over the phone or by DM, there's no financial stake. Cancelling feels effortless because it is. A deposit changes the psychology — they've invested, so they show up or they cancel in advance."],
              ["Deposits don't need to be large", "A £5 deposit on a £30 haircut is enough to create commitment without feeling like a barrier. Most clients accept it without question. The ones who push back are often the same ones who would have no-showed."],
              ["Reminders catch the honest forgetters", "Not all no-shows are intentional. An automated reminder the day before and on the morning of the appointment recovers most of them. Combine it with a deposit and you've addressed both causes."],
              ["The slot refills automatically", "When a client cancels with notice, the slot becomes bookable again. No manual admin, no wasted time. Your schedule fills itself."],
            ].map(([title, body]) => (
              <Box key={title} sx={{ mb: 3, pl: 3, borderLeft: "2px solid rgba(201,168,76,0.25)" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", mb: 0.75, color: "#fff" }}>{title}</Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>{body}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
