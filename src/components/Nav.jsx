import React, { useEffect, useRef } from "react";
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";

function BookrightlyWordmark({ inverse = false }) {
  const ink = inverse ? "#fff" : "#111116";
  const blue = inverse ? "#93C5FD" : "#2563EB";

  return (
    <Box
      role="img"
      aria-label="Bookrightly"
      sx={{ position: "relative", display: "inline-flex", alignItems: "baseline", color: ink, whiteSpace: "nowrap", pb: .8 }}
    >
      <Typography component="span" aria-hidden="true" sx={{ color: ink, fontFamily: "'DM Sans', sans-serif", fontWeight: 950, fontSize: "1.42rem", letterSpacing: "-.085em", lineHeight: 1 }}>book</Typography>
      <Typography component="span" aria-hidden="true" sx={{ ml: .2, color: blue, fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: "1.68rem", letterSpacing: "-.065em", lineHeight: .9, transform: "rotate(-2deg)", transformOrigin: "left bottom" }}>rightly</Typography>
      <Box aria-hidden="true" sx={{ position: "absolute", height: 5, width: "48%", right: -3, bottom: -1, bgcolor: "#FF765C", borderRadius: "80% 18% 72% 22%", transform: "rotate(-3deg) skewX(-16deg)", transformOrigin: "right center", opacity: .95 }} />
      <Box aria-hidden="true" sx={{ position: "absolute", height: 2, width: "31%", right: 8, bottom: -4, bgcolor: blue, borderRadius: 99, transform: "rotate(1.5deg)", opacity: .45 }} />
    </Box>
  );
}

export function BrandMark({ inverse = false, compact = false }) {
  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <BookrightlyWordmark inverse={inverse} />
      {!compact && <Typography sx={{ color: inverse ? "#ffffff66" : "#6d6e76", fontWeight: 850, fontSize: ".46rem", letterSpacing: ".22em", textTransform: "uppercase", mt: .6, ml: .3 }}>time made yours</Typography>}
    </Box>
  );
}

const LINKS = [["How it works", "/how-it-works"], ["Compare", "/compare"], ["Pricing", "/pricing"], ["Tools", "/tools"]];

export default function HomeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const go = (path) => { setOpen(false); navigate(path); };
  const browse = () => {
    setOpen(false);
    if (location.pathname !== "/") return navigate("/#browse-section");
    document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" });
  };

  // Publish the bar's real rendered height (including the safe-area inset
  // and however tall the two-line wordmark actually needs) as a CSS variable
  // so pages that sit below it can clear it exactly, instead of guessing a
  // fixed pixel offset that drifts out of sync whenever this bar's own
  // content/height changes — that guessing is what kept landing pages'
  // headings partly hidden behind it.
  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const setVar = () => document.documentElement.style.setProperty("--nav-height", `${el.offsetHeight}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <AppBar ref={barRef} position="fixed" elevation={0} sx={{ bgcolor: "#f4f1e9ee", color: "#111116", backdropFilter: "blur(18px)", borderBottom: "1px solid #d9d6ce", pt: "env(safe-area-inset-top, 0px)" }}>
        <Toolbar sx={{ minHeight: { xs: 68, md: 76 }, px: { xs: 2, md: 4 } }}>
          <Box onClick={() => go("/")} sx={{ cursor: "pointer", flex: { md: 1 } }}><BrandMark /></Box>
          <Stack direction="row" spacing={.5} sx={{ display: { xs: "none", md: "flex" }, bgcolor: "#fff", border: "1px solid #dedbd3", p: .55, borderRadius: 99 }}>
            {LINKS.map(([label, path]) => <Button key={path} onClick={() => go(path)} sx={{ borderRadius: 99, px: 2, color: location.pathname === path ? "#fff" : "#5f6067", bgcolor: location.pathname === path ? "#111116" : "transparent", fontSize: ".76rem", fontWeight: 850, "&:hover": { bgcolor: location.pathname === path ? "#111116" : "#f0eee8" } }}>{label}</Button>)}
          </Stack>
          <Box sx={{ ml: "auto", flex: { md: 1 }, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
            <Button onClick={() => go("/login")} sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#111116", fontWeight: 850 }}>Log in</Button>
            <Button onClick={browse} endIcon={<ArrowOutwardRoundedIcon />} sx={{ display: { xs: "none", md: "inline-flex" }, bgcolor: "#2563EB", color: "#fff", borderRadius: "5px 18px 18px 18px", px: 2.2, py: 1, fontWeight: 900, "&:hover": { bgcolor: "#1D4ED8" } }}>Find a service</Button>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              sx={{
                display: { md: "none" },
                bgcolor: "#111116",
                color: "#fff",
                transition: "background-color .2s ease, color .2s ease, transform .2s ease",
                "&:hover": { bgcolor: "#93C5FD", color: "#111116", transform: "rotate(3deg)" },
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: "min(92vw, 390px)", bgcolor: "#111116", color: "#fff", p: 2.5, pt: "max(20px, env(safe-area-inset-top, 0px))", pb: "max(20px, env(safe-area-inset-bottom, 0px))" } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><BrandMark inverse /><IconButton onClick={() => setOpen(false)} sx={{ color: "#fff", border: "1px solid #ffffff2b" }}><CloseRoundedIcon /></IconButton></Box>
        <Typography sx={{ color: "#ffffff55", fontSize: ".66rem", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", mt: 6, mb: 1.5 }}>Explore</Typography>
        {LINKS.map(([label, path], index) => <Box key={path} onClick={() => go(path)} sx={{ py: 2.1, borderBottom: "1px solid #ffffff17", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}><Typography sx={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-.04em" }}>{label}</Typography><Typography sx={{ color: "#ffffff44", fontSize: ".7rem" }}>0{index + 1}</Typography></Box>)}
        <Stack spacing={1.2} sx={{ mt: "auto", pt: 6 }}><Button onClick={browse} sx={{ bgcolor: "#93C5FD", color: "#111116", py: 1.5, borderRadius: 3, fontWeight: 900 }}>Find a service</Button><Button onClick={() => go("/login")} sx={{ color: "#fff", border: "1px solid #ffffff2b", py: 1.5, borderRadius: 3 }}>Log in</Button></Stack>
      </Drawer>
    </>
  );
}
