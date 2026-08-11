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

export default function RevenueCalculator() {
  const navigate = useNavigate();
  const [clientsPerDay, setClientsPerDay] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [avgServicePrice, setAvgServicePrice] = useState(35);
  const [overheadsPerMonth, setOverheadsPerMonth] = useState(400);

  const results = useMemo(() => {
    const clientsPerWeek = clientsPerDay * daysPerWeek;
    const clientsPerMonth = clientsPerWeek * 4;
    const grossPerMonth = clientsPerMonth * avgServicePrice;
    const netPerMonth = grossPerMonth - overheadsPerMonth;
    const netPerYear = netPerMonth * 12;
    const grossPerYear = grossPerMonth * 12;
    const revenuePerDay = clientsPerDay * avgServicePrice;

    return {
      clientsPerWeek,
      clientsPerMonth,
      revenuePerDay,
      grossPerMonth,
      netPerMonth,
      netPerYear,
      grossPerYear,
    };
  }, [clientsPerDay, daysPerWeek, avgServicePrice, overheadsPerMonth]);

  const fmt = (n) => `£${Number(n).toLocaleString()}`;

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>
          Free Tool
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, mb: 2, maxWidth: 700, mx: "auto" }}>
          Barber & Salon Revenue Calculator
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
          See your monthly and yearly revenue potential based on your chair, your prices, and your working hours.
        </Typography>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ bgcolor: DARK2, border: "1px solid rgba(255,255,255,0.06)", p: 4 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem", mb: 4 }}>Your numbers</Typography>
                <SliderRow label="Clients per day" value={clientsPerDay} min={1} max={20} step={1} onChange={setClientsPerDay} format={(v) => v} />
                <SliderRow label="Days worked per week" value={daysPerWeek} min={1} max={7} step={1} onChange={setDaysPerWeek} format={(v) => v} />
                <SliderRow label="Average service price" value={avgServicePrice} min={10} max={250} step={5} onChange={setAvgServicePrice} format={(v) => `£${v}`} />
                <SliderRow label="Monthly overheads (rent, products, etc.)" value={overheadsPerMonth} min={0} max={3000} step={50} onChange={setOverheadsPerMonth} format={(v) => `£${v}`} />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem" }}>Your revenue potential</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <StatBox label="Clients per week" value={results.clientsPerWeek} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Revenue per day" value={fmt(results.revenuePerDay)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Gross per month" value={fmt(results.grossPerMonth)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Net per month" value={fmt(results.netPerMonth)} highlight />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <StatBox label="Gross per year" value={fmt(results.grossPerYear)} />
                    </Grid>
                    <Grid item xs={6}>
                      <StatBox label="Net per year" value={fmt(results.netPerYear)} highlight />
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mt: 1, bgcolor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", p: 3, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
                    These figures assume full bookings. Online booking with Bookrightly can help you fill gaps and reduce empty slots.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6, bgcolor: DARK2, border: "1px solid rgba(201,168,76,0.2)", p: 4, textAlign: "center" }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.4rem", md: "1.8rem" }, mb: 1.5 }}>
              Fill your chair with online booking
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", mb: 3, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>
              Bookrightly gives barbers and salons a booking page, deposit collection, and automated reminders — for £10/month. 90-day free trial.
            </Typography>
            <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
              Start free trial
            </Box>
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", mb: 3 }}>How to grow your chair revenue</Typography>
            {[
              ["Fill every slot, not just most of them", "An empty slot is £0. Even filling one extra slot per day at £35 adds £700/month. Online booking lets clients book at midnight, on weekends, whenever they think of it — not just when you're free to answer the phone."],
              ["Small price increases have outsized effects", "Moving from £30 to £35 per cut is a 17% price increase but feels small to clients. On 8 clients a day, 5 days a week, that's an extra £800/month — without a single extra client."],
              ["Reduce no-shows with deposits", "A no-show on a £40 service is £40 gone. Deposits don't stop all no-shows but they recover part of the loss and make clients think twice before ghosting."],
              ["Track your numbers", "Most barbers don't know their actual revenue per day. Once you do, you can spot quiet days, adjust pricing, or run promos to fill the gaps."],
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
