import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "./Nav";

const GROUPS = [
  { title: "Product", links: [["Pricing", "/pricing"], ["Compare", "/compare"], ["How it works", "/how-it-works"], ["Tools", "/tools"]] },
  { title: "For your work", links: [["Barbers", "/booking-software/barbers"], ["Hair salons", "/booking-software/salons"], ["Personal trainers", "/booking-software/personal-trainers"], ["Decorators", "/booking-software/decorators"], ["Plumbing & heating", "/signup"]] },
  { title: "Company", links: [["Blog", "/blog"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
];

export default function Footer({ isHomePage = false }) {
  const navigate = useNavigate();
  return (
    <Box component="footer" sx={{ bgcolor: "#111116", color: "#fff", p: { xs: 2, md: 4 } }}>
      <Box sx={{ borderRadius: { xs: 4, md: 7 }, overflow: "hidden", border: "1px solid #ffffff17" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr .85fr" } }}>
          <Box sx={{ p: { xs: 3, md: 6 }, minHeight: { md: 370 }, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <BrandMark inverse />
            <Box sx={{ mt: { xs: 7, md: 10 } }}>
              <Typography sx={{ fontSize: { xs: "2.5rem", md: "4.8rem" }, fontWeight: 950, letterSpacing: "-.075em", lineHeight: .88, maxWidth: 700 }}>Make room for<br/>the work you love.</Typography>
              <Button onClick={() => navigate("/signup")} endIcon={<ArrowOutwardRoundedIcon />} sx={{ mt: 4, bgcolor: "#2563EB", color: "#fff", borderRadius: "5px 18px 18px 18px", px: 2.5, py: 1.25, fontWeight: 900, "&:hover": { bgcolor: "#1D4ED8" } }}>Start 90 days free</Button>
            </Box>
          </Box>
          <Box sx={{ bgcolor: "#93C5FD", color: "#111116", p: { xs: 3, md: 5 }, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", md: "1fr 1fr" }, gap: 4 }}>
            {GROUPS.map(group => <Box key={group.title}><Typography sx={{ fontSize: ".64rem", fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase", mb: 2, opacity: .58 }}>{group.title}</Typography><Stack spacing={1.45}>{group.links.map(([label, path]) => <Typography key={path} onClick={() => navigate(path)} sx={{ fontWeight: 850, fontSize: ".85rem", cursor: "pointer", "&:hover": { transform: "translateX(3px)" }, transition: "transform .2s" }}>{label}</Typography>)}</Stack></Box>)}
            <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}><Typography sx={{ fontSize: ".64rem", fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase", mb: 2, opacity: .58 }}>Account</Typography><Stack spacing={1.45}><Typography onClick={() => navigate("/login")} sx={{ fontWeight: 850, fontSize: ".85rem", cursor: "pointer" }}>Log in</Typography><Typography onClick={() => navigate("/signup")} sx={{ fontWeight: 850, fontSize: ".85rem", cursor: "pointer" }}>Join Bookrightly</Typography></Stack></Box>
          </Box>
        </Box>
        <Box sx={{ borderTop: "1px solid #ffffff17", px: { xs: 3, md: 6 }, py: 2.5, display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.5 }}>
          <Typography sx={{ color: "#ffffff55", fontSize: ".7rem" }}>© {new Date().getFullYear()} Bookrightly. Built for independent UK businesses.</Typography>
          <Typography sx={{ color: "#ffffff55", fontSize: ".7rem" }}>Booking • clients • payments • your website</Typography>
          {/* Launchpadly — Bookrightly (text) — homepage only, per Launchpadly's
              verification requiring the badge on the URL submitted to them. */}
          {isHomePage && (
            <Typography
              component="a"
              href="https://launchpadly.co/startup/bookrightly?ref=badge"
              target="_blank"
              rel="noopener noreferrer"
              data-launchpadly-badge="bookrightly"
              sx={{ color: "#ffffff55", fontSize: ".7rem", textDecoration: "none", "&:hover": { color: "#ffffff88" } }}
            >
              Proudly listed on Launchpadly Startup Directory
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
