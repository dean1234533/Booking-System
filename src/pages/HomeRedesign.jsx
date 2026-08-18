import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, CircularProgress,
  Container, Grid, IconButton, InputBase, Paper, Stack, Typography,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon, ArrowForward as ArrowForwardIcon,
  Brush as BrushIcon, CalendarMonth as CalendarIcon, Check as CheckIcon,
  ContentCut as ContentCutIcon, Dashboard as DashboardIcon,
  ExpandMore as ExpandMoreIcon, FitnessCenter as FitnessIcon,
  KeyboardArrowLeft as ArrowLeftIcon, KeyboardArrowRight as ArrowRightIcon,
  Language as LanguageIcon, LocationOn as LocationIcon,
  MyLocation as MyLocationIcon, Payments as PaymentsIcon,
  People as PeopleIcon, ReceiptLong as ReceiptIcon, Search as SearchIcon,
  Star as StarIcon, Storefront as StorefrontIcon, TrendingUp as TrendingIcon,
  Verified as VerifiedIcon,
} from "@mui/icons-material";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import BarberCard from "../components/BarberCard";
import { useBarbers } from "../hooks/useBarbers";

const TenantHome = lazy(() => import("./TenantHome"));
const PricingModal = lazy(() => import("../components/PricingModal"));
const FeatureComparisonModal = lazy(() => import("../components/FeatureComparisonModal"));

const C = {
  gold: "#2563EB",
  goldLight: "#93C5FD",
  ink: "#102A25",
  charcoal: "#1D4B42",
  cream: "#F5EFE4",
  canvas: "#F2F6F2",
  muted: "#64716D",
  line: "#DCE5E0",
};

const INDUSTRIES = [
  {
    key: "barber", label: "Barbers", icon: <ContentCutIcon />,
    headline: "Keep every chair busy.",
    text: "Appointments, live queue management, staff profiles and haircut history in one workspace.",
    features: ["Live walk-in queue", "Client haircut history", "Staff and chair scheduling"],
  },
  {
    key: "hairdresser", label: "Hair salons", icon: <ContentCutIcon />,
    headline: "A calmer way to run your salon.",
    text: "Organise services, bookings, deposits and client communication without juggling separate systems.",
    features: ["Service and price management", "Deposits and online payments", "Branded salon website"],
  },
  {
    key: "decorator", label: "Decorators", icon: <BrushIcon />,
    headline: "Take a job from quote to paid.",
    text: "Create quotes, collect colour approvals, plan work and invoice clients from a single project flow.",
    features: ["Shareable quotes", "Colour approval links", "Day planning and invoices"],
  },
  {
    key: "trainer", label: "Personal trainers", icon: <FitnessIcon />,
    headline: "Coach clients, not spreadsheets.",
    text: "Manage availability, client records, check-ins, plans, food diaries and invoices together.",
    features: ["Client hub and check-ins", "Workout and nutrition tools", "Session scheduling"],
  },
];

const FAQS = [
  { q: "Is the trial really free?", a: "Yes. You get 90 days of full access and you do not need to enter card details to start." },
  { q: "What happens after 90 days?", a: "Plans start from £10–£20 per month depending on your business type. You can cancel from your dashboard at any time." },
  { q: "Do I get my own website?", a: "Yes. Your account includes a branded public page with your services, photos, reviews and online booking." },
  { q: "Can clients pay online?", a: "Yes. Connect Stripe to collect deposits, take payments and reduce no-shows." },
  { q: "Can I use Bookrightly on my phone?", a: "Yes. The dashboard is mobile-friendly and can be installed as an app on supported devices." },
];

function Eyebrow({ children, dark = false }) {
  return (
    <Typography sx={{ color: C.gold, fontSize: ".68rem", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>
      {children}
    </Typography>
  );
}

function ProductPreview() {
  return (
    <Box sx={{ position: "relative", width: "100%", maxWidth: 650, mx: "auto" }}>
      <Box sx={{ position: "absolute", inset: "10% -5% -6% 8%", bgcolor: C.gold + "18", filter: "blur(45px)", borderRadius: "50%" }} />
      <Paper sx={{ position: "relative", overflow: "hidden", borderRadius: { xs: 3, md: 4 }, bgcolor: "#f5f6f8", border: "1px solid rgba(255,255,255,.13)", boxShadow: "0 32px 80px rgba(0,0,0,.38)" }}>
        <Box sx={{ height: 48, bgcolor: "#111216", px: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "3px solid " + C.gold }}>
          <Typography sx={{ color: "#fff", fontSize: ".72rem", fontWeight: 850 }}>Bookrightly</Typography>
          <Box sx={{ width: 70, height: 20, bgcolor: C.gold, borderRadius: 1 }} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "125px 1fr" }, minHeight: { xs: 355, sm: 390 } }}>
          <Box sx={{ display: { xs: "none", sm: "block" }, bgcolor: "#fff", borderRight: "1px solid " + C.line, p: 1.5 }}>
            <Typography sx={{ color: "#a0a4ac", fontSize: ".43rem", fontWeight: 900, letterSpacing: ".12em", mb: 1.5 }}>WORKSPACE</Typography>
            {[
              [<DashboardIcon />, "Today", true], [<AccessTimeIcon />, "Schedule"],
              [<PeopleIcon />, "Clients"], [<PaymentsIcon />, "Finance"],
            ].map(([icon, label, active]) => (
              <Box key={label} sx={{ display: "flex", alignItems: "center", gap: .8, px: .8, py: .8, mb: .35, borderRadius: 1.5, bgcolor: active ? C.gold + "16" : "transparent", color: active ? "#202124" : "#858a94" }}>
                {React.cloneElement(icon, { sx: { fontSize: 12, color: active ? C.gold : "inherit" } })}
                <Typography sx={{ fontSize: ".52rem", fontWeight: active ? 900 : 700 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: { xs: 2, sm: 2.25 } }}>
            <Box sx={{ bgcolor: C.charcoal, borderRadius: 2.5, p: 2.25, color: "#fff", mb: 1.5 }}>
              <Typography sx={{ color: C.gold, fontSize: ".43rem", fontWeight: 900, letterSpacing: ".1em" }}>MONDAY 17 AUGUST</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.1rem", sm: "1.25rem" }, mt: .55 }}>Good morning, Jamie</Typography>
              <Typography sx={{ color: "rgba(255,255,255,.5)", fontSize: ".55rem", mt: .4 }}>You have 4 bookings today. Your next appointment is at 09:30.</Typography>
            </Box>
            <Grid container spacing={1}>
              {[["Today", "4", "Bookings"], ["Open", "6", "Slots"], ["Ahead", "12", "Active"]].map(item => (
                <Grid item xs={4} key={item[0]}>
                  <Paper sx={{ p: 1.25, borderRadius: 2 }}>
                    <Typography sx={{ color: "#8c919a", fontSize: ".4rem", fontWeight: 900, textTransform: "uppercase" }}>{item[0]}</Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: item[0] === "Today" ? C.gold : C.ink }}>{item[1]}</Typography>
                    <Typography sx={{ color: "#777c85", fontSize: ".42rem" }}>{item[2]}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Typography sx={{ mt: 1.6, mb: .7, fontSize: ".6rem", fontWeight: 900 }}>Today’s diary</Typography>
            <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
              {[["09:30", "Alex Morgan", "Consultation"], ["12:00", "Sam Taylor", "Signature service"], ["15:30", "Jordan Lee", "Follow-up"]].map((row, index) => (
                <Box key={row[0]} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.3, py: 1, borderBottom: index < 2 ? "1px solid " + C.line : 0 }}>
                  <Typography sx={{ color: C.gold, fontSize: ".55rem", fontWeight: 900, width: 32 }}>{row[0]}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: ".52rem", fontWeight: 900 }}>{row[1]}</Typography>
                    <Typography sx={{ fontSize: ".42rem", color: C.muted }}>{row[2]}</Typography>
                  </Box>
                  <Chip label="Booked" size="small" sx={{ height: 17, fontSize: ".38rem" }} />
                </Box>
              ))}
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

function CarouselRail({ items, renderItem, dark = false, itemWidth = { xs: "86%", sm: "48%", md: "32%" }, label, stackOnMobile = false }) {
  const railRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  function move(direction) {
    const next = (activeSlide + direction + items.length) % items.length;
    goTo(next);
  }

  function updateActive() {
    const rail = railRef.current;
    if (!rail) return;
    const cards = Array.from(rail.children);
    const closest = cards.reduce((best, card, index) => {
      const distance = Math.abs(card.offsetLeft - rail.scrollLeft);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity });
    setActiveSlide(closest.index);
  }

  function goTo(index) {
    const rail = railRef.current;
    const card = rail?.children[index];
    if (!card) return;
    rail.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  }

  return (
    <Box role="region" aria-label={label}>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2, display: stackOnMobile ? { xs: "none", sm: "flex" } : "flex" }}>
        <IconButton aria-label={`Previous ${label}`} onClick={() => move(-1)} sx={{ border: "1px solid " + (dark ? "rgba(255,255,255,.16)" : C.line), color: dark ? "#fff" : C.ink }}><ArrowLeftIcon /></IconButton>
        <IconButton aria-label={`Next ${label}`} onClick={() => move(1)} sx={{ border: "1px solid " + (dark ? "rgba(255,255,255,.16)" : C.line), color: dark ? "#fff" : C.ink }}><ArrowRightIcon /></IconButton>
      </Stack>
      <Box ref={railRef} onScroll={updateActive} sx={{ display: stackOnMobile ? { xs: "block", sm: "flex" } : "flex", gap: 2.5, overflowX: stackOnMobile ? { xs: "visible", sm: "auto" } : "auto", scrollSnapType: stackOnMobile ? { xs: "none", sm: "x mandatory" } : "x mandatory", pb: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        {items.map((item, index) => (
          <Box key={item.title || item[0] || item.id || item.uid || index} sx={{ flex: "0 0 auto", width: stackOnMobile ? { xs: "100%", sm: itemWidth.sm, md: itemWidth.md } : itemWidth, scrollSnapAlign: "start", mb: stackOnMobile ? { xs: 1.4, sm: 0 } : 0 }}>{renderItem(item, index)}</Box>
        ))}
      </Box>
      <Stack direction="row" justifyContent="center" spacing={.8} sx={{ mt: 2.5, display: stackOnMobile ? { xs: "none", sm: "flex" } : "flex" }}>
        {items.map((item, index) => (
          <Box component="button" key={item.title || item[0] || item.id || item.uid || index} aria-label={`Go to slide ${index + 1}`} onClick={() => goTo(index)} sx={{ border: 0, p: 0, cursor: "pointer", width: activeSlide === index ? 24 : 7, height: 7, borderRadius: 8, transition: "width .2s ease", bgcolor: activeSlide === index ? C.gold : (dark ? "rgba(255,255,255,.22)" : "#cfd2d8") }} />
        ))}
      </Stack>
    </Box>
  );
}

function ContinuousRail({ items, renderItem, label, stackOnMobile = false, duration = 82 }) {
  return (
    <Box role="region" aria-label={label} sx={{ overflow: stackOnMobile ? { xs: "visible", sm: "hidden" } : "hidden", mx: stackOnMobile ? 0 : { xs: -2, sm: 0 }, px: stackOnMobile ? 0 : { xs: 2, sm: 0 }, py: 3, perspective: "1400px", maskImage: stackOnMobile ? { xs: "none", sm: "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)" } : "linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)" }}>
      <Box
        sx={{
          display: stackOnMobile ? { xs: "block", sm: "flex" } : "flex", width: stackOnMobile ? { xs: "100%", sm: "max-content" } : "max-content", gap: 2.5,
          animation: stackOnMobile
            ? { xs: "none", sm: `connectedMarquee ${duration}s linear infinite` }
            : { xs: `connectedMarquee ${Math.round(duration * .83)}s linear infinite`, md: `connectedMarquee ${duration}s linear infinite` },
          "@keyframes connectedMarquee": {
            from: { transform: "translateX(0)" },
            to: { transform: "translateX(calc(-50% - 10px))" },
          },
        }}
      >
        {[0, 1].map(group => (
          <Box key={group} aria-hidden={group === 1 ? "true" : undefined} sx={{ display: stackOnMobile ? { xs: group === 1 ? "none" : "block", sm: "flex" } : "flex", gap: 2.5, flexShrink: 0 }}>
            {items.map((item, index) => (
              <Box
                key={item.title || index}
                sx={{
                  width: stackOnMobile ? { xs: "100%", sm: 340, md: 360 } : { xs: 285, sm: 340, md: 360 }, flexShrink: 0,
                  mb: stackOnMobile ? { xs: 1.7, sm: 0 } : 0,
                  transformStyle: "preserve-3d",
                  transform: `perspective(950px) rotateY(${index % 2 ? "4deg" : "-4deg"}) rotateX(1.5deg) translateZ(10px)`,
                  filter: "drop-shadow(0 22px 18px rgba(20,24,32,.16))",
                  "& > .MuiPaper-root": {
                    position: "relative", overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.9)",
                    borderBottom: "4px solid rgba(35,38,45,.12)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.95), inset -8px -10px 24px rgba(26,30,38,.045)",
                    "&::after": {
                      content: "\"\"", position: "absolute", inset: 0, pointerEvents: "none",
                      background: "linear-gradient(120deg, rgba(255,255,255,.22), transparent 32%, transparent 72%, rgba(37,99,235,.08))",
                    },
                  },
                }}
              >
                {renderItem(item, index)}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function HomeRedesign({ tenant }) {
  const navigate = useNavigate();
  const { barbers, loading } = useBarbers();
  const [industry, setIndustry] = useState("barber");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [draftService, setDraftService] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [locating, setLocating] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [tenant]);
  if (tenant) return <Suspense fallback={null}><TenantHome tenant={tenant} /></Suspense>;

  const selectedIndustry = INDUSTRIES.find(item => item.key === industry) || INDUSTRIES[0];
  const filteredBusinesses = useMemo(() => {
    return barbers.filter(item => {
      const type = item.businessType || "barber";
      const service = searchService.toLowerCase().trim();
      const location = searchLocation.toLowerCase().trim();
      const matchesCategory = category === "all" || type === category;
      const matchesService = !service || [
        item.businessName, item.displayName, item.specialty, item.aboutUs, type,
      ].some(value => value?.toLowerCase().includes(service));
      const matchesLocation = !location || [
        item.address, item.city, item.area, item.borough, item.postcode,
      ].some(value => value?.toLowerCase().includes(location));
      return matchesCategory && matchesService && matchesLocation;
    });
  }, [barbers, category, searchService, searchLocation]);

  function runSearch() {
    setSearchService(draftService);
    setSearchLocation(draftLocation);
    document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function useLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(
          "https://nominatim.openstreetmap.org/reverse?lat=" + coords.latitude + "&lon=" + coords.longitude + "&format=json",
          { headers: { "Accept-Language": "en" } },
        );
        const data = await response.json();
        const area = data.address?.suburb || data.address?.town || data.address?.city || "";
        if (area) {
          setDraftLocation(area);
          setSearchLocation(area);
        }
      } catch {
        // Location is optional; leave the field unchanged if lookup fails.
      } finally {
        setLocating(false);
      }
    }, () => setLocating(false), { timeout: 8000 });
  }

  return (
    <Box sx={{ bgcolor: C.cream, color: C.ink, overflowX: "hidden" }}>
      <Helmet>
        <title>Bookrightly | Run Your Service Business in One Place</title>
        <meta name="description" content="Your website, bookings, clients, payments and trade-specific business tools in one simple workspace. Start free for 90 days." />
        <link rel="canonical" href="https://bookrightly.co.uk/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: "Bookrightly",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: "https://bookrightly.co.uk/",
              description: "Business websites, online booking, payments and trade-specific tools for UK service professionals.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", description: "90-day free trial" },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQS.map(item => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            },
          ],
        })}</script>
      </Helmet>

      <Box sx={{ bgcolor: C.cream, color: C.ink, position: "relative", overflow: "hidden" }}>
        <Box sx={{ position: "absolute", width: 720, height: 720, borderRadius: "50%", bgcolor: "#DDE9DF", top: -380, right: -150 }} />
        <Box sx={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "1px solid " + C.gold, opacity: .3, bottom: -130, left: "34%" }} />
        <Container maxWidth="xl" sx={{ position: "relative", pt: { xs: 14, md: 17 }, pb: { xs: 9, md: 14 }, px: { xs: 2, md: 5 } }}>
          <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Eyebrow>Built for UK service professionals</Eyebrow>
              <Typography component="h1" sx={{ maxWidth: 720, mt: 1.5, fontWeight: 950, fontSize: { xs: "2.8rem", sm: "4rem", lg: "5.35rem" }, letterSpacing: "-.07em", lineHeight: .94 }}>
                Your business,<br /><Box component="span" sx={{ color: C.charcoal, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 500 }}>beautifully run.</Box>
              </Typography>
              <Typography sx={{ mt: 2.7, maxWidth: 545, color: C.muted, fontSize: { xs: ".95rem", md: "1.08rem" }, lineHeight: 1.75 }}>
                A polished website, an organised diary and every client detail in one calm place—built around the way your trade actually works.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.3} sx={{ mt: 3.5 }}>
                <Button variant="contained" size="large" onClick={() => navigate("/signup")} endIcon={<ArrowForwardIcon />} sx={{ bgcolor: C.ink, color: "#fff", fontWeight: 900, px: 3, minHeight: 56, borderRadius: 99, "&:hover": { bgcolor: C.charcoal } }}>
                  Start free for 90 days
                </Button>
                <Button size="large" onClick={() => document.getElementById("browse-section")?.scrollIntoView({ behavior: "smooth" })} sx={{ color: C.ink, border: "1px solid " + C.line, bgcolor: "rgba(255,255,255,.45)", px: 3, minHeight: 56, borderRadius: 99 }}>
                  Book a professional
                </Button>
              </Stack>
              <Stack direction="row" spacing={{ xs: 2, sm: 3 }} sx={{ mt: 3, flexWrap: "wrap", rowGap: 1 }}>
                {["No card required", "Live in minutes", "Cancel anytime"].map(item => (
                  <Box key={item} sx={{ display: "flex", alignItems: "center", gap: .65 }}>
                    <CheckIcon sx={{ color: C.gold, fontSize: 16 }} />
                    <Typography sx={{ color: C.muted, fontSize: ".7rem", fontWeight: 750 }}>{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}><ProductPreview /></Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: C.cream }}>
        <Container maxWidth="lg" sx={{ transform: { md: "translateY(-34px)" }, mb: { md: -4.25 } }}>
          <Paper sx={{ bgcolor: C.ink, color: "#fff", borderRadius: { xs: 0, sm: 4 }, overflow: "hidden", boxShadow: "0 24px 70px rgba(16,42,37,.18)" }}>
          <Grid container>
            {[
              ["90 days", "Free trial"], ["4", "Business types"], ["£0", "Setup cost"], ["24/7", "Online booking"],
            ].map((item, index) => (
              <Grid item xs={6} md={3} key={item[1]}>
                <Box sx={{ py: 3, px: { xs: 1, md: 3 }, borderRight: { md: index < 3 ? "1px solid rgba(255,255,255,.1)" : 0 }, textAlign: "center" }}>
                  <Typography sx={{ color: C.goldLight, fontWeight: 950, fontSize: "1.3rem" }}>{item[0]}</Typography>
                  <Typography sx={{ color: "rgba(255,255,255,.55)", fontSize: ".7rem", mt: .2 }}>{item[1]}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          </Paper>
        </Container>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 13 } }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 650, mb: 5 }}>
            <Eyebrow>A workspace shaped around your trade</Eyebrow>
            <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2rem", md: "3.1rem" }, letterSpacing: "-.05em", lineHeight: 1.05 }}>
              The tools you need.<br />None of the clutter you don’t.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 2, mb: 2, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                {INDUSTRIES.map(item => {
                  const active = industry === item.key;
                  return (
                    <Button key={item.key} onClick={() => setIndustry(item.key)} aria-pressed={active} startIcon={item.icon}
                      sx={{ flexShrink: 0, px: 2.4, py: 1.3, borderRadius: 99, color: active ? "#fff" : C.muted, bgcolor: active ? C.ink : C.canvas, border: "1px solid " + (active ? C.ink : C.line), fontWeight: active ? 900 : 750, "&:hover": { bgcolor: active ? C.charcoal : C.cream } }}>
                      {item.label}
                    </Button>
                  );
                })}
          </Stack>
              <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 5, minHeight: 330, position: "relative", overflow: "hidden", bgcolor: C.canvas, boxShadow: "none", border: "1px solid " + C.line }}>
                <Box sx={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", bgcolor: "#DCE9E2", right: -130, bottom: -230 }} />
                <Grid container spacing={4} alignItems="center" sx={{ position: "relative" }}>
                  <Grid item xs={12} md={7}>
                  <Box sx={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: C.gold, mb: 2.5 }}>
                    {selectedIndustry.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 950, fontSize: { xs: "1.6rem", md: "2.2rem" }, letterSpacing: "-.04em" }}>{selectedIndustry.headline}</Typography>
                  <Typography sx={{ color: C.muted, mt: 1.2, maxWidth: 580, lineHeight: 1.75 }}>{selectedIndustry.text}</Typography>
                  <Stack spacing={1.1} sx={{ mt: 2.5 }}>
                    {selectedIndustry.features.map(feature => (
                      <Box key={feature} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: C.gold + "20", display: "grid", placeItems: "center" }}><CheckIcon sx={{ fontSize: 13, color: C.gold }} /></Box>
                        <Typography sx={{ fontSize: ".82rem", fontWeight: 750 }}>{feature}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 3 }}>
                    <Button variant="contained" onClick={() => navigate("/signup")} sx={{ bgcolor: C.ink, color: "#fff", fontWeight: 850, borderRadius: 99, px: 2.5, "&:hover": { bgcolor: C.charcoal } }}>Start as a {selectedIndustry.label.toLowerCase()}</Button>
                    <Button onClick={() => setFeaturesOpen(true)} sx={{ color: C.ink }}>Compare all features</Button>
                  </Stack>
                  </Grid>
                  <Grid item xs={12} md={5} sx={{ display: { xs: "none", md: "block" } }}>
                    <Box sx={{ bgcolor: C.ink, color: "#fff", borderRadius: 4, p: 3, transform: "rotate(2deg)", boxShadow: "0 24px 60px rgba(16,42,37,.2)" }}>
                      <Typography sx={{ color: C.goldLight, fontSize: ".67rem", fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase" }}>Built into your plan</Typography>
                      <Typography sx={{ mt: 1.2, fontSize: "1.35rem", fontWeight: 900, lineHeight: 1.2 }}>Your tools appear from day one.</Typography>
                      <Typography sx={{ mt: 1.2, color: "rgba(255,255,255,.58)", fontSize: ".8rem", lineHeight: 1.7 }}>No modules to assemble. No extra software to connect before you can begin.</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
        </Container>
      </Box>

      <Box sx={{ bgcolor: C.canvas, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 680, mx: "auto", mb: 6 }}>
            <Eyebrow>One login, one clear view</Eyebrow>
            <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2rem", md: "3rem" }, letterSpacing: "-.05em" }}>Everything connected around your day.</Typography>
          </Box>
          <ContinuousRail
            label="platform benefits"
            items={[
              { icon: <CalendarIcon />, title: "Bookings that organise themselves", text: "Clients choose a slot, pay their deposit and receive confirmations without waiting for a reply." },
              { icon: <PaymentsIcon />, title: "Money without the awkward chase", text: "Take card payments, send invoices and see what is outstanding from the same workspace." },
              { icon: <LanguageIcon />, title: "A website that earns its keep", text: "Show your work, services, reviews and availability on a branded page that is ready to share." },
              { icon: <PeopleIcon />, title: "Client details where you need them", text: "Keep notes, preferences and appointment history close without searching through old messages." },
              { icon: <TrendingIcon />, title: "A clearer view of growth", text: "See bookings, revenue and availability at a glance so your next decision is based on the full picture." },
            ]}
            renderItem={item => (
                <Paper sx={{ p: 3.5, height: 235, borderRadius: 3 }}>
                  <Box sx={{ color: C.gold, mb: 2, "& svg": { fontSize: 28 } }}>{item.icon}</Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>{item.title}</Typography>
                  <Typography sx={{ color: C.muted, fontSize: ".82rem", lineHeight: 1.75, mt: 1 }}>{item.text}</Typography>
                </Paper>
            )}
          />
        </Container>
      </Box>

      <Box sx={{ bgcolor: C.ink, color: "#fff", py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid item xs={12} md={4}>
              <Eyebrow>From signup to taking bookings</Eyebrow>
              <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2rem", md: "2.8rem" }, letterSpacing: "-.05em", lineHeight: 1.05 }}>Live before your next client arrives.</Typography>
              <Typography sx={{ color: "rgba(255,255,255,.55)", mt: 1.5, lineHeight: 1.7 }}>No coding, no agency and no complicated setup process.</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <ContinuousRail
                label="setup steps"
                stackOnMobile
                duration={54}
                items={[
                  ["01", "Choose your business type", "We tailor the dashboard and public page around how you work."],
                  ["02", "Add your brand and services", "Upload your logo, set prices and choose when clients can book."],
                  ["03", "Share your link and get paid", "Your website goes live and new bookings appear in your dashboard."],
                ]}
                renderItem={step => (
                  <Paper sx={{ display: "flex", gap: 2, p: 3, borderRadius: 3, minHeight: 158 }}>
                    <Typography sx={{ color: C.gold, fontWeight: 950, fontSize: "1.1rem" }}>{step[0]}</Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>{step[1]}</Typography>
                      <Typography sx={{ color: C.muted, fontSize: ".78rem", mt: .4, lineHeight: 1.6 }}>{step[2]}</Typography>
                    </Box>
                  </Paper>
                )}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: C.cream, color: C.ink, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 680, mx: "auto", textAlign: "center", mb: 2 }}>
            <Eyebrow>Made for real working days</Eyebrow>
            <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2rem", md: "3rem" }, letterSpacing: "-.055em" }}>Loved by people who do the work.</Typography>
          </Box>
          <CarouselRail
            label="customer stories"
            itemWidth={{ xs: "100%", sm: "100%", md: "100%" }}
            items={[
              ["Jamie L.", "Barber", "I wake up to a full diary now instead of a list of messages I still need to answer."],
              ["Mark T.", "Decorator", "Quotes, approval and invoicing finally feel like one professional process."],
              ["Chloe R.", "Personal trainer", "My clients have a proper portal and I spend far less time chasing forms."],
              ["Amelia S.", "Salon owner", "My team can see what is happening without calling me between every appointment."],
            ]}
            renderItem={review => (
              <Paper sx={{ maxWidth: 900, minHeight: { xs: 330, md: 350 }, mx: "auto", px: { xs: 3, sm: 6, md: 9 }, py: { xs: 4, md: 6 }, borderRadius: "48px 48px 48px 10px", bgcolor: "#fff", color: C.ink, border: "1px solid " + C.line, boxShadow: "0 28px 80px rgba(16,42,37,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative" }}>
                <Typography aria-hidden="true" sx={{ color: C.gold, fontFamily: "Georgia, serif", fontSize: "4.5rem", height: 55, lineHeight: 1 }}>“</Typography>
                <Stack direction="row" spacing={.2} sx={{ mb: 2 }}>{[1,2,3,4,5].map(item => <StarIcon key={item} sx={{ color: C.gold, fontSize: 17 }} />)}</Stack>
                <Typography component="blockquote" sx={{ m: 0, maxWidth: 730, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: { xs: "1.25rem", sm: "1.55rem", md: "1.8rem" }, lineHeight: 1.45 }}>
                  {review[2]}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mt: 3 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: "50%", bgcolor: C.ink, color: C.goldLight, display: "grid", placeItems: "center", fontWeight: 950, fontSize: ".75rem" }}>{review[0].split(" ").map(part => part[0]).join("")}</Box>
                  <Box sx={{ textAlign: "left" }}>
                    <Typography sx={{ fontWeight: 950, fontSize: ".82rem" }}>{review[0]}</Typography>
                    <Stack direction="row" alignItems="center" spacing={.45}><VerifiedIcon sx={{ color: C.gold, fontSize: 14 }} /><Typography sx={{ color: C.muted, fontSize: ".68rem" }}>{review[1]}</Typography></Stack>
                  </Box>
                </Stack>
              </Paper>
            )}
          />
        </Container>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
            <Grid item xs={12} md={5}>
              <Eyebrow>Simple pricing</Eyebrow>
              <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2.15rem", md: "3.4rem" }, letterSpacing: "-.06em", lineHeight: 1 }}>Less than one missed booking.</Typography>
              <Typography sx={{ color: C.muted, mt: 2, maxWidth: 430, lineHeight: 1.75 }}>Try every feature for 90 days, with no card details and no setup fee.</Typography>
              <Button onClick={() => setPricingOpen(true)} endIcon={<ArrowForwardIcon />} sx={{ mt: 2, color: C.ink, p: 0, fontWeight: 900 }}>Compare every plan</Button>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: { xs: 3, sm: 4.5 }, borderRadius: 5, bgcolor: C.ink, color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 30px 80px rgba(16,42,37,.2)" }}>
                <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", bgcolor: "rgba(211,166,47,.12)", right: -90, top: -130 }} />
                <Typography sx={{ position: "relative", color: C.goldLight, fontSize: ".68rem", textTransform: "uppercase", fontWeight: 900, letterSpacing: ".12em" }}>Complete workspace</Typography>
                <Typography sx={{ position: "relative", mt: 1, fontWeight: 950, fontSize: "3.4rem", letterSpacing: "-.07em" }}>£10<Box component="span" sx={{ fontSize: ".85rem", color: "rgba(255,255,255,.5)", letterSpacing: 0 }}>/month</Box></Typography>
                <Stack spacing={1.2} sx={{ position: "relative", mt: 2.5 }}>
                  {["Branded website and online booking", "Payments, deposits and invoices", "All tools for your chosen business type"].map(item => (
                    <Box key={item} sx={{ display: "flex", gap: 1, alignItems: "center" }}><Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: C.gold, color: C.ink, display: "grid", placeItems: "center" }}><CheckIcon sx={{ fontSize: 14 }} /></Box><Typography sx={{ color: "rgba(255,255,255,.78)", fontSize: ".82rem" }}>{item}</Typography></Box>
                  ))}
                </Stack>
                <Button fullWidth variant="contained" onClick={() => navigate("/signup")} sx={{ position: "relative", mt: 3.5, bgcolor: C.gold, color: C.ink, fontWeight: 950, minHeight: 52, borderRadius: 99, "&:hover": { bgcolor: C.goldLight } }}>Start your 90-day trial</Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box id="browse-section" sx={{ bgcolor: C.canvas, py: { xs: 8, md: 11 }, borderTop: "1px solid " + C.line, scrollMarginTop: 80 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="flex-end" sx={{ mb: 4 }}>
            <Grid item xs={12} md={5}>
              <Eyebrow>Looking to book?</Eyebrow>
              <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2rem", md: "2.7rem" }, letterSpacing: "-.05em" }}>Find a professional near you.</Typography>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Paper sx={{ flex: 1, display: "flex", alignItems: "center", px: 1.5, minHeight: 48, borderRadius: 2.5 }}>
                  <SearchIcon sx={{ color: "#9aa0a9", fontSize: 19, mr: 1 }} />
                  <InputBase fullWidth placeholder="Service or business" value={draftService} onChange={event => setDraftService(event.target.value)} onKeyDown={event => event.key === "Enter" && runSearch()} />
                </Paper>
                <Paper sx={{ flex: 1, display: "flex", alignItems: "center", px: 1.5, minHeight: 48, borderRadius: 2.5 }}>
                  <LocationIcon sx={{ color: "#9aa0a9", fontSize: 19, mr: 1 }} />
                  <InputBase fullWidth placeholder="Town or area" value={draftLocation} onChange={event => setDraftLocation(event.target.value)} onKeyDown={event => event.key === "Enter" && runSearch()} />
                  <IconButton aria-label="Use my location" size="small" onClick={useLocation}>{locating ? <CircularProgress size={16} /> : <MyLocationIcon sx={{ fontSize: 18 }} />}</IconButton>
                </Paper>
                <Button variant="contained" onClick={runSearch} sx={{ bgcolor: C.ink, color: "#fff", px: 3, "&:hover": { bgcolor: C.gold, color: C.ink } }}>Search</Button>
              </Stack>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mb: 3, overflowX: "auto", pb: .5 }}>
            {[["all", "All"], ...INDUSTRIES.map(item => [item.key, item.label])].map(item => (
              <Chip key={item[0]} label={item[1]} onClick={() => setCategory(item[0])} sx={{ flexShrink: 0, bgcolor: category === item[0] ? C.gold : "#fff", fontWeight: 800 }} />
            ))}
          </Stack>
          {loading ? (
            <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress sx={{ color: C.gold }} /></Box>
          ) : filteredBusinesses.length ? (
            <CarouselRail
              label="professionals"
              items={filteredBusinesses.slice(0, 8)}
              renderItem={item => <BarberCard barber={item} isMarketplace />}
            />
          ) : (
            <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
              <StorefrontIcon sx={{ color: "#b1b5bd", fontSize: 36 }} />
              <Typography sx={{ fontWeight: 900, mt: 1 }}>No matching professionals yet</Typography>
              <Typography sx={{ color: C.muted, fontSize: ".8rem", mt: .5 }}>Try another service, location or category.</Typography>
            </Paper>
          )}
        </Container>
      </Box>

      <Box sx={{ bgcolor: "#fff", py: { xs: 8, md: 11 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }}>
            <Grid item xs={12} md={4}>
              <Eyebrow>Questions</Eyebrow>
              <Typography component="h2" sx={{ mt: 1, fontWeight: 950, fontSize: { xs: "2rem", md: "3rem" }, letterSpacing: "-.055em", lineHeight: 1 }}>Small print,<br />plain English.</Typography>
              <Typography sx={{ mt: 2, color: C.muted, fontSize: ".84rem", lineHeight: 1.75 }}>Still unsure? Our team can talk you through the platform before you start.</Typography>
              <Button component={Link} to="/contact" sx={{ mt: 1.5, color: C.ink, p: 0, fontWeight: 900 }}>Ask us anything</Button>
            </Grid>
            <Grid item xs={12} md={8}>
              {FAQS.map(item => (
                <Accordion key={item.q} disableGutters elevation={0} sx={{ bgcolor: "transparent", borderBottom: "1px solid " + C.line, "&:before": { display: "none" } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, py: 1 }}><Typography sx={{ fontWeight: 850 }}>{item.q}</Typography></AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pb: 2.5 }}><Typography sx={{ color: C.muted, lineHeight: 1.75, fontSize: ".85rem" }}>{item.a}</Typography></AccordionDetails>
                </Accordion>
              ))}
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: C.cream, py: { xs: 3, md: 5 } }}>
        <Container maxWidth="lg">
          <Box sx={{ bgcolor: C.gold, borderRadius: { xs: 4, md: 6 }, p: { xs: 4, sm: 6, md: 8 }, position: "relative", overflow: "hidden" }}>
            <Box sx={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(16,42,37,.18)", right: -120, top: -160 }} />
            <Grid container spacing={3} alignItems="center" sx={{ position: "relative" }}>
              <Grid item xs={12} md={8}>
                <Typography sx={{ fontWeight: 950, fontSize: { xs: "2rem", md: "3.5rem" }, letterSpacing: "-.065em", lineHeight: .98 }}>Make tonight the last night you organise bookings by message.</Typography>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { md: "right" } }}>
                <Button variant="contained" onClick={() => navigate("/signup")} endIcon={<ArrowForwardIcon />} sx={{ bgcolor: C.ink, color: "#fff", minHeight: 56, px: 3.5, borderRadius: 99, fontWeight: 900, "&:hover": { bgcolor: C.charcoal } }}>Start free today</Button>
                <Typography sx={{ mt: 1.2, color: "rgba(16,42,37,.62)", fontSize: ".7rem" }}>No card required · 90 days free</Typography>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      <Box component="footer" sx={{ bgcolor: C.ink, color: "#fff", py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Typography sx={{ fontWeight: 950, fontSize: "1.15rem" }}>Bookrightly</Typography>
              <Typography sx={{ color: "rgba(255,255,255,.4)", maxWidth: 390, fontSize: ".78rem", lineHeight: 1.75, mt: 1 }}>The all-in-one business platform for independent UK service professionals.</Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography sx={{ color: C.gold, fontSize: ".65rem", fontWeight: 900, mb: 1.5 }}>PLATFORM</Typography>
              <Stack spacing={1}>{[["Sign up", "/signup"], ["Log in", "/login"], ["Contact", "/contact"]].map(item => <Link key={item[0]} to={item[1]} style={{ color: "rgba(255,255,255,.55)", textDecoration: "none", fontSize: ".78rem" }}>{item[0]}</Link>)}</Stack>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography sx={{ color: C.gold, fontSize: ".65rem", fontWeight: 900, mb: 1.5 }}>RESOURCES</Typography>
              <Stack spacing={1}>{[["How it works", "/how-it-works"], ["Pricing", "/pricing"], ["Blog", "/blog"]].map(item => <Link key={item[0]} to={item[1]} style={{ color: "rgba(255,255,255,.55)", textDecoration: "none", fontSize: ".78rem" }}>{item[0]}</Link>)}</Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography sx={{ color: C.gold, fontSize: ".65rem", fontWeight: 900, mb: 1.5 }}>SUPPORT</Typography>
              <Typography component="a" href="mailto:support@bookrightly.com" sx={{ color: "rgba(255,255,255,.55)", textDecoration: "none", fontSize: ".78rem" }}>support@bookrightly.com</Typography>
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mt: 5, pt: 3, borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <Typography sx={{ color: "rgba(255,255,255,.25)", fontSize: ".68rem" }}>© {new Date().getFullYear()} Bookrightly. All rights reserved.</Typography>
            <Stack direction="row" spacing={2}><Link to="/terms" style={{ color: "rgba(255,255,255,.35)", fontSize: ".68rem" }}>Terms</Link><Link to="/privacy" style={{ color: "rgba(255,255,255,.35)", fontSize: ".68rem" }}>Privacy</Link></Stack>
          </Stack>
        </Container>
      </Box>

      <Suspense fallback={null}>
        <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
        <FeatureComparisonModal open={featuresOpen} onClose={() => setFeaturesOpen(false)} />
      </Suspense>
    </Box>
  );
}

export default HomeRedesign;
