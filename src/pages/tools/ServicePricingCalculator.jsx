import React, { useState, useMemo } from "react";
import { Box, Typography, Slider, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

const GOLD = "#C9A84C";
const DARK = "#0d0d0d";
const DARK2 = "#111";
const DARK3 = "#1a1a1a";
const SERIF = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";

function StatBox({ label, value, highlight, sub }) {
  return (
    <Box sx={{ bgcolor: highlight ? "rgba(201,168,76,0.08)" : DARK3, border: `1px solid ${highlight ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}`, p: 3, textAlign: "center" }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.8rem", md: "2.4rem" }, color: highlight ? GOLD : "#fff", lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", mt: 1, lineHeight: 1.5 }}>{label}</Typography>
      {sub && <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", mt: 0.5 }}>{sub}</Typography>}
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

export default function ServicePricingCalculator() {
  const navigate = useNavigate();
  const [serviceDurationMins, setServiceDurationMins] = useState(60);
  const [materialCost, setMaterialCost] = useState(8);
  const [hourlyOverhead, setHourlyOverhead] = useState(15);
  const [targetMargin, setTargetMargin] = useState(40);

  const results = useMemo(() => {
    const durationHours = serviceDurationMins / 60;
    const labourAndOverhead = durationHours * hourlyOverhead;
    const totalCost = materialCost + labourAndOverhead;
    const minPrice = totalCost / (1 - targetMargin / 100);
    const recommendedPrice = Math.ceil(minPrice / 5) * 5;
    const profit = recommendedPrice - totalCost;
    const marginActual = ((profit / recommendedPrice) * 100).toFixed(0);
    const profitPerHour = profit / durationHours;

    return {
      totalCost: totalCost.toFixed(2),
      minPrice: minPrice.toFixed(2),
      recommendedPrice,
      profit: profit.toFixed(2),
      marginActual,
      profitPerHour: profitPerHour.toFixed(2),
    };
  }, [serviceDurationMins, materialCost, hourlyOverhead, targetMargin]);

  const fmt = (n) => `£${Number(n).toLocaleString()}`;

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <Box sx={{ pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 }, textAlign: "center", position: "relative" }}>
        <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, mb: 2 }}>
          Free Tool
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 400, mb: 2, maxWidth: 700, mx: "auto" }}>
          Service Pricing Calculator
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "1rem", maxWidth: 520, mx: "auto", lineHeight: 1.8 }}>
          Work out the right price for any service — factoring in materials, overheads, and your target profit margin.
        </Typography>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ bgcolor: DARK2, border: "1px solid rgba(255,255,255,0.06)", p: 4 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem", mb: 4 }}>Service details</Typography>
                <SliderRow label="Service duration" value={serviceDurationMins} min={15} max={240} step={15} onChange={setServiceDurationMins} format={(v) => v >= 60 ? `${Math.floor(v/60)}h${v%60>0?` ${v%60}m`:""}` : `${v}m`} />
                <SliderRow label="Material cost per service (products, dye, etc.)" value={materialCost} min={0} max={100} step={1} onChange={setMaterialCost} format={(v) => `£${v}`} />
                <SliderRow label="Hourly overhead rate (rent, utilities, insurance)" value={hourlyOverhead} min={0} max={60} step={1} onChange={setHourlyOverhead} format={(v) => `£${v}/hr`} />
                <SliderRow label="Target profit margin" value={targetMargin} min={10} max={80} step={5} onChange={setTargetMargin} format={(v) => `${v}%`} />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.2rem" }}>Your pricing breakdown</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <StatBox label="Total cost per service" value={fmt(results.totalCost)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Minimum viable price" value={fmt(results.minPrice)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Profit per service" value={fmt(results.profit)} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatBox label="Profit per hour" value={fmt(results.profitPerHour)} />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 1, bgcolor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.35)", p: 4, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", mb: 1, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recommended price</Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "3.5rem", color: GOLD, lineHeight: 1 }}>{fmt(results.recommendedPrice)}</Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", mt: 1 }}>{results.marginActual}% actual margin</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 6, bgcolor: DARK2, border: "1px solid rgba(201,168,76,0.2)", p: 4, textAlign: "center" }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.4rem", md: "1.8rem" }, mb: 1.5 }}>
              List your services online with Bookrightly
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", mb: 3, maxWidth: 480, mx: "auto", lineHeight: 1.8 }}>
              Add your services, set your prices, and let clients book and pay a deposit online — in minutes. Built for barbers, hairdressers, PTs and decorators.
            </Typography>
            <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
              Start free trial
            </Box>
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", mb: 3 }}>Pricing your services correctly</Typography>
            {[
              ["Cost-plus is the right foundation", "Start with what it costs you — materials, a fair share of rent and utilities, your time. Then add your margin. Most service providers guess at prices or copy competitors without knowing whether those prices are profitable."],
              ["Margin and markup are not the same", "A 40% margin means 40% of the selling price is profit. A 40% markup means you added 40% to cost. On a £20 cost, 40% margin = £33.33 price; 40% markup = £28. Most people mean margin when they say markup."],
              ["Charge more for specialist services", "A basic haircut and a full colour treatment don't just differ in time — they differ in skill, materials, and demand. Price them separately and accurately. Blended averages hide where your money is actually made."],
              ["Review your pricing annually", "Material costs rise. Overheads go up. If your prices stay the same, your margins shrink. A small annual increase — even 5% — compounds meaningfully over a few years."],
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
