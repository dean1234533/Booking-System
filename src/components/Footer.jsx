import React from "react";
import { Box, Typography, Container, Stack, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  const businessName = "Bookrightly";
  const G = { gold: "#C9A84C", dark: "#0d0d0d" };

  const navLinks = [
    { label: "Login",           action: () => navigate("/login") },
    { label: "Join the network", action: () => navigate("/signup") },
  ];
  const legalLinks = [
    { label: "Terms & Conditions", action: () => navigate("/terms") },
    { label: "Privacy Policy",     action: () => navigate("/privacy") },
  ];

  const linkSx = {
    color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: "0.8rem",
    fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em",
    "&:hover": { color: G.gold },
  };

  return (
    <Box component="footer" sx={{ bgcolor: G.dark, color: "#fff", borderTop: "1px solid rgba(255,255,255,0.08)", py: { xs: 5, md: 7 }, px: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg" disableGutters>
        {/* Top: brand + nav */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "center", md: "flex-start" }}
          spacing={{ xs: 3, md: 4 }}
          sx={{ textAlign: { xs: "center", md: "left" } }}
        >
          <Box>
            <Typography sx={{ fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "1.1rem", color: "#fff" }}>
              {businessName}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", mt: 0.75 }}>
              The UK's premium service marketplace.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.5, sm: 3.5 }} alignItems="center">
            {navLinks.map((l) => (
              <Link key={l.label} onClick={l.action} sx={linkSx}>{l.label}</Link>
            ))}
          </Stack>
        </Stack>

        {/* Divider */}
        <Box sx={{ height: "1px", bgcolor: "rgba(255,255,255,0.08)", my: { xs: 3, md: 4 } }} />

        {/* Bottom: copyright + legal */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ textAlign: "center" }}
        >
          <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.74rem" }}>
            © {new Date().getFullYear()} {businessName}. All rights reserved.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.22)", fontSize: "0.72rem" }}>
            Built by{" "}
            <Link href="https://dean-da-dev.co.uk" target="_blank" rel="noopener noreferrer" sx={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", "&:hover": { color: G.gold } }}>
              Dean Da Dev
            </Link>
          </Typography>
          <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap", justifyContent: "center", rowGap: 1 }}>
            {legalLinks.map((l) => (
              <Link key={l.label} onClick={l.action} sx={{ ...linkSx, fontWeight: 500, fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>
                {l.label}
              </Link>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
