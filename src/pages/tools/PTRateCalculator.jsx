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

export default function PTRateCalculator() {
  const navigate = useNavigate();
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(3000);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(20);
  const [overheadsPerMonth, setOverheadsPerMonth] = useState(300);
  const [holidayWeeks, setHolidayWeeks] = useState(4);

  const results = useMemo(() => {
    const workingWeeks = 52 - holidayWeeks;
    const sessionsPerYear = sessionsPerWeek * workingWeeks;
    const sessionsPerMonth = sessionsPerYear / 12;
    const totalRequired = targetMonthlyIncome + overheadsPerMonth;
    const minRatePerSession = totalRequired / sessionsPerMonth;
    const recommendedRate = Math.ceil(minRatePerSession / 5) * 5;
    const actualMonthlyGross = recommendedRate * sessionsPerMonth;
    const actualMonthlyNet = actualMonthlyGross - overheadsPerMonth;
    const annualNet = actualMonthlyNet * 12;

    return {
      sessionsPerMonth: Math.round(sessionsPerMonth),
      minRatePerSession: minRatePerSession.toFixed(2),
      recommendedRate,
      actualMonthlyGross: actualMonthlyGross.toFixed(0),
      actualMonthlyNet: actualMonthlyNet.toFixed(0),
      annualNet: annualNet.toFixed(0),
      workingWeeks,
    };
  }, [targetMonthlyIncome, sessionsPerWeek, overheadsPerMonth, holidayWeeks]);

  const fmt = (n) => `£${Number(n).toLocaleString()}`;

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>
          Free Tool
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, mb: 2, maxWidth: 700, mx: "auto" }}>
          Personal Trainer Session Rate Calculator
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
          Work out exactly what to charge per session to hit your income target — after overheads, holidays, and slow weeks.
        </Typography>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ bgcolor: DARK2, border: "1px solid rgba(255,255,255,0.06)", p: 4 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem", mb: 4 }}>Your targets</Typography>
                <SliderRow label="Target monthly take-home" value={targetMonthlyIncome} min={500} max={10000} step={100} onChange={setTargetMonthlyIncome} format={(v) => `£${v.toLocaleString()}`} />
                <SliderRow label="Sessions per week" value={sessionsPerWeek} min={1} max={40} step={1} onChange={setSessionsPerWeek} format={(v) => v} />
                <SliderRow label="Monthly overheads (gym rent, insurance, etc.)" value={overheadsPerMonth} min={0} max={2000} step={50} onChange={setOverheadsPerMonth} format={(v) => `£${v}`} />
                <SliderRow label="Holiday weeks per year" value={holidayWeeks} min={0} max={12} step={1} onChange={setHolidayWeeks} format={(v) => `${v} wks`} />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem" }}>What you need to charge</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <StatBox label="Sessions per month" value={results.sessionsPerMonth} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Working weeks/year" value={results.workingWeeks} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Minimum rate/session" value={fmt(results.minRatePerSession)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Recommended rate" value={fmt(results.recommendedRate)} highlight />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <StatBox label="Monthly gross at that rate" value={fmt(results.actualMonthlyGross)} />
                    </Grid>
                    <Grid item xs={6}>
                      <StatBox label="Monthly net take-home" value={fmt(results.actualMonthlyNet)} highlight />
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mt: 1, bgcolor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", p: 3, textAlign: "center" }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1.6rem", color: GOLD }}>{fmt(results.annualNet)}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", mt: 1 }}>annual net income at recommended rate</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6, bgcolor: DARK2, border: "1px solid rgba(201,168,76,0.2)", p: 4, textAlign: "center" }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.4rem", md: "1.8rem" }, mb: 1.5 }}>
              Take bookings and payments online
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", mb: 3, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>
              Bookrightly gives personal trainers a booking page, deposit collection via Stripe, automated reminders, and a client dashboard — for £10/month. 90-day free trial.
            </Typography>
            <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
              Start free trial
            </Box>
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", mb: 3 }}>Setting your PT rate with confidence</Typography>
            {[
              ["Don't undercharge to win clients", "New PTs often set rates too low to attract clients quickly. The problem is low rates attract price-sensitive clients who leave when you raise them. Set a rate you can sustain and be selective about who you work with."],
              ["Overheads eat more than people expect", "Gym floor rental, insurance, CPD courses, and equipment add up fast. A PT charging £40/session in a gym that charges £15/session net is earning £25 — less than it looks."],
              ["Package pricing protects your income", "Selling 10-session blocks upfront smooths out cancellations and gives clients a commitment incentive. It also simplifies your admin — fewer individual transactions to track."],
              ["Online booking fills your calendar", "Clients forget to book, life gets busy, and gaps appear in your week. An online booking page with deposit collection means clients can commit at midnight on a Sunday when motivation is high."],
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
