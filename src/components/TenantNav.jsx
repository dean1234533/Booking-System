import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Box, IconButton,
  Menu, MenuItem, Avatar, Button, Container, Divider, Drawer, List, ListItem
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

const NAV_LINKS = [
  { label: "Our Team", id: "barber-section" },
  { label: "About",    id: "about" },
  { label: "Find Us",  id: "find-us" },
  { label: "Reviews",  id: "reviews" },
];

export default function TenantNav({ tenant }) {
  const { barber } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const brandColor   = tenant?.brandColor  || "#C9A84C";
  const businessName = (tenant?.businessName || "PREMIUM BARBER SHOP").toUpperCase();
  const logo         = tenant?.businessLogo || tenant?.logoUrl;
  const shopRouteId  = tenant?.shopId || tenant?.id || tenant?.uid;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    try {
      await signOut(auth);
      setAnchor(null);
      navigate("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  const scrollTo = (id) => {
    setDrawerOpen(false);
    setTimeout(() => {
      const section = document.getElementById(id);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        navigate(`/shop/${shopRouteId}`);
      }
    }, drawerOpen ? 300 : 0);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled ? "rgba(10,10,10,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "background-color 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: "space-between", height: 68 }}>

            {/* Logo / name */}
            <Box
              component={Link}
              to={`/shop/${shopRouteId}`}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none", color: "inherit", "&:hover": { opacity: 0.8 } }}
            >
              {logo ? (
                <Avatar
                  src={logo}
                  alt={businessName}
                  variant="square"
                  sx={{ width: 38, height: 38, borderRadius: "4px", bgcolor: "transparent", border: `1px solid rgba(255,255,255,0.15)` }}
                  imgProps={{ style: { objectFit: "cover", width: "100%", height: "100%" } }}
                />
              ) : (
                <Box sx={{ width: 38, height: 38, borderRadius: "4px", bgcolor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: brandColor }}>
                  <ContentCutIcon sx={{ fontSize: 20 }} />
                </Box>
              )}
              <Typography
                sx={{
                  fontWeight: 700, letterSpacing: "0.12em", fontSize: "0.8rem",
                  fontFamily: "'Playfair Display', serif", color: "#fff",
                  display: { xs: "none", sm: "block" },
                }}
              >
                {businessName}
              </Typography>
            </Box>

            {/* Nav links — desktop centre */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 4 }}>
              {NAV_LINKS.map(({ label, id }) => (
                <Typography
                  key={id}
                  onClick={() => scrollTo(id)}
                  sx={{
                    cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "rgba(255,255,255,0.88)",
                    transition: "color 0.2s",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>

            {/* Right side */}
            <Box display="flex" alignItems="center" gap={1.5}>
              {barber ? (
                <>
                  <Button
                    component={Link}
                    to="/dashboard"
                    sx={{
                      color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: "0.7rem",
                      letterSpacing: "0.12em", display: { xs: "none", md: "inline-flex" },
                      "&:hover": { color: brandColor, bgcolor: "transparent" },
                    }}
                  >
                    DASHBOARD
                  </Button>

                  <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
                    <Avatar
                      src={barber.profilePic}
                      sx={{ width: 36, height: 36, bgcolor: brandColor, fontSize: "0.85rem", fontWeight: 700 }}
                    >
                      {barber.name?.[0] || barber.displayName?.[0]}
                    </Avatar>
                  </IconButton>

                  <Menu
                    anchorEl={anchor}
                    open={Boolean(anchor)}
                    onClose={() => setAnchor(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    PaperProps={{
                      sx: { mt: 1.5, borderRadius: "4px", minWidth: 200, border: "1px solid #222", bgcolor: "#111", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#fff" }}>
                        {barber.name || barber.displayName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                        {barber.role === "admin" ? "Shop Owner" : "Staff Member"}
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                    <MenuItem component={Link} to="/dashboard" sx={{ fontSize: "0.82rem", fontWeight: 600, py: 1.5, color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.06)" } }}>
                      <DashboardIcon sx={{ mr: 1.5, fontSize: 16 }} /> Dashboard
                    </MenuItem>
                    <MenuItem onClick={handleSignOut} sx={{ fontSize: "0.82rem", fontWeight: 600, py: 1.5, color: "#e57373", "&:hover": { bgcolor: "rgba(255,255,255,0.06)" } }}>
                      <LogoutIcon sx={{ mr: 1.5, fontSize: 16 }} /> Logout
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  onClick={() => scrollTo("barber-section")}
                  startIcon={<CalendarMonthIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    bgcolor: "#fff", color: "#111", fontWeight: 800,
                    borderRadius: "2px", px: { xs: 2, sm: 3 }, py: 0.9,
                    fontSize: "0.7rem", letterSpacing: "0.12em",
                    boxShadow: "none",
                    "&:hover": { bgcolor: brandColor, boxShadow: "none" },
                    display: { xs: "none", md: "inline-flex" },
                  }}
                >
                  BOOK NOW
                </Button>
              )}

              {/* Hamburger — mobile only */}
              <IconButton
                aria-label="Open navigation menu"
                onClick={() => setDrawerOpen(true)}
                sx={{ display: { xs: "flex", md: "none" }, color: "#fff", p: 1 }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: "75vw", maxWidth: 300, bgcolor: "#0a0a0a", border: "none" }
        }}
      >
        <Box sx={{ p: 2.5 }}>
          {/* Close + brand */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography sx={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em", color: "#fff" }}>
              {businessName}
            </Typography>
            <IconButton aria-label="Close navigation menu" onClick={() => setDrawerOpen(false)} sx={{ color: "rgba(255,255,255,0.5)", p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Links */}
          <List disablePadding>
            {NAV_LINKS.map(({ label, id }) => (
              <ListItem key={id} disablePadding sx={{ mb: 0.5 }}>
                <Box
                  onClick={() => scrollTo(id)}
                  sx={{
                    width: "100%", py: 1.5, px: 1,
                    cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.15em",
                    textTransform: "uppercase", color: "rgba(255,255,255,0.7)",
                    transition: "color 0.2s",
                    "&:hover": { color: "#fff" },
                  }}
                >
                  {label}
                </Box>
              </ListItem>
            ))}
          </List>

          {/* Book Now */}
          {!barber && (
            <Button
              onClick={() => scrollTo("barber-section")}
              startIcon={<CalendarMonthIcon sx={{ fontSize: 15 }} />}
              fullWidth
              sx={{
                mt: 4, bgcolor: "#fff", color: "#111", fontWeight: 800,
                borderRadius: "2px", py: 1.4, fontSize: "0.75rem", letterSpacing: "0.12em",
                boxShadow: "none", "&:hover": { bgcolor: brandColor, boxShadow: "none" },
              }}
            >
              BOOK NOW
            </Button>
          )}
        </Box>
      </Drawer>
    </>
  );
}
