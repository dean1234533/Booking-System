import React from "react";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import {
  CalendarMonth as CalendarIcon,
  CreditCard as CreditCardIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";
import { BrandMark } from "../Nav";

const ACCENT = "#93C5FD";

const benefits = [
  { icon: <CalendarIcon />, title: "Bookings in one place", text: "Manage your diary without the back-and-forth." },
  { icon: <CreditCardIcon />, title: "Get paid professionally", text: "Take deposits, payments and send invoices." },
  { icon: <LanguageIcon />, title: "Your own business website", text: "A branded page clients can book from 24/7." },
];

export default function AuthShell({ eyebrow, title, description, children, compact = false }) {
  return (
    <Box sx={{
      width: "100%", maxWidth: "100%", minHeight: "100vh", bgcolor: "#F5F3ED",
      display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(360px, 46%) minmax(0, 54%)" },
      overflowX: "hidden",
    }}>
      <Box sx={{
        position: { xs: "relative", md: "sticky" }, top: 0, height: { md: "100vh" },
        bgcolor: "#2563EB", color: "#fff", overflow: "hidden",
        display: "flex", flexDirection: "column", p: { xs: 2.5, sm: 4, md: 6 },
        minWidth: 0, maxWidth: "100%", minHeight: { xs: compact ? 170 : 220, md: "100vh" },
        isolation: "isolate",
      }}>
        <Box aria-hidden="true" sx={{ position: "absolute", zIndex: 0, width: 520, height: 520, borderRadius: "50%", bgcolor: "rgba(147,197,253,.14)", right: -250, top: -220, pointerEvents: "none" }} />
        <Box aria-hidden="true" sx={{ position: "absolute", zIndex: 0, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,.18)", left: -160, bottom: -130, pointerEvents: "none" }} />
        <Box aria-hidden="true" sx={{ position: "absolute", zIndex: 0, display: { xs: "none", md: "block" }, width: 110, height: 110, borderRadius: 4, bgcolor: "#FF735C", right: 45, bottom: 65, transform: "rotate(12deg)", opacity: .72, pointerEvents: "none" }} />

        <Box component={Link} to="/" aria-label="Bookrightly home" sx={{ position: "relative", zIndex: 1, display: "inline-flex", textDecoration: "none", width: "fit-content" }}>
          <BrandMark inverse />
        </Box>

        <Box sx={{ position: "relative", zIndex: 1, my: { xs: 3, md: "auto" }, maxWidth: 470 }}>
          <Typography sx={{ color: ACCENT, fontWeight: 950, fontSize: ".69rem", letterSpacing: ".14em", textTransform: "uppercase" }}>{eyebrow}</Typography>
          <Typography component="h1" sx={{ mt: 1.25, fontWeight: 950, fontSize: { xs: "1.8rem", sm: "2.35rem", md: "3.35rem" }, lineHeight: .98, letterSpacing: "-.065em" }}>{title}</Typography>
          <Typography sx={{ mt: 1.5, color: "rgba(255,255,255,.78)", fontSize: { xs: ".83rem", md: ".95rem" }, lineHeight: 1.7, maxWidth: 410 }}>{description}</Typography>

          {!compact && (
            <Stack spacing={2.2} sx={{ mt: 4, display: { xs: "none", md: "flex" } }}>
              {benefits.map(item => (
                <Box key={item.title} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2.5, flexShrink: 0, bgcolor: "rgba(147,197,253,.18)", color: ACCENT, display: "grid", placeItems: "center", "& svg": { fontSize: 19 } }}>{item.icon}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: ".85rem" }}>{item.title}</Typography>
                    <Typography sx={{ color: "rgba(255,255,255,.45)", fontSize: ".72rem", mt: .25 }}>{item.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Typography sx={{ position: "relative", zIndex: 1, display: { xs: "none", md: "block" }, color: "rgba(255,255,255,.25)", fontSize: ".66rem" }}>
          Built for independent UK service professionals.
        </Typography>
      </Box>

      <Box sx={{ width: "100%", maxWidth: "100%", display: "flex", alignItems: compact ? "center" : "flex-start", py: { xs: 3, sm: 5, md: 7 }, minWidth: 0, overflow: "hidden", background: "radial-gradient(circle at 90% 5%, rgba(37,99,235,.09), transparent 28%)" }}>
        <Container maxWidth="sm" sx={{ width: "100%", minWidth: 0, px: { xs: 2, sm: 4 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

export { ACCENT as AUTH_GOLD };
