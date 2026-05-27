import React, { useState } from "react";
import { Box, Grid, Typography, Button } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BarberCard from "./BarberCard";

const G = { gold: "#C9A84C", goldLight: "#e8c97a", dark: "#0d0d0d", warmWhite: "#faf8f4", border: "#e8e2d8" };
const SERIF = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";

export default function CategoryRow({ label, title, businessType, businesses = [] }) {
  const [showAll, setShowAll] = useState(false);

  const filtered = businesses.filter(b => (b.businessType || "barber") === businessType);

  if (filtered.length === 0) return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <Typography sx={{ fontFamily: SANS, fontSize: "0.9rem", color: "rgba(0,0,0,0.35)", fontWeight: 300 }}>
        No {label.toLowerCase()} found matching your search.
      </Typography>
    </Box>
  );

  const INITIAL = 3;
  const displayed = showAll ? filtered : filtered.slice(0, INITIAL);

  return (
    <Box sx={{ mb: 8 }}>
      {/* Heading row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box sx={{ width: 24, height: 1, bgcolor: G.gold }} />
            <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: G.gold }}>
              {label}
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.5rem", md: "1.9rem" }, fontWeight: 400, color: G.dark, lineHeight: 1.15 }}>
            {title}
          </Typography>
        </Box>

        {filtered.length > INITIAL && (
          <Button
            onClick={() => setShowAll(v => !v)}
            endIcon={
              showAll
                ? <KeyboardArrowDownIcon sx={{ transform: "rotate(180deg)", transition: "transform .25s" }} />
                : <ArrowForwardIcon sx={{ fontSize: 16 }} />
            }
            sx={{
              color: G.gold, fontFamily: SANS, fontWeight: 600, fontSize: "0.78rem",
              letterSpacing: "0.05em", textTransform: "none",
              "&:hover": { bgcolor: "transparent", color: G.goldLight },
            }}
          >
            {showAll ? "Show less" : `View all (${filtered.length})`}
          </Button>
        )}
      </Box>

      {/* Cards grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {displayed.map(barber => (
          <Grid item xs={12} sm={6} md={4} key={barber.id || barber.uid}>
            <BarberCard barber={barber} isMarketplace />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
