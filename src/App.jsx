import { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./styles/index.css";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, matchPath } from "react-router-dom";
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Home from "./pages/HomeRebuild";
import { RESERVED_SLUGS } from "./utils/bookingSlug";

// firebase/firestore.js is loaded on demand (dynamic import inside
// identifyTenant, below) rather than imported statically here — App.jsx runs
// on every page including the homepage, and a static import here was forcing
// this ~1,100-line module (and everything it pulls in) into the main bundle
// for every visitor, even though every other page that needs it already
// dynamically imports it.

// Page/Component imports — lazy so Vite splits each route into its own chunk instead of
// bundling all ~35 pages (dashboard, every business template, every SEO page, every
// calculator) into one multi-MB chunk that every visitor had to download before any page
// could render, regardless of which single page they actually landed on. Home is imported
// statically above instead: it's the entry point most visitors land on first, so it stays
// in the main bundle rather than costing every first-time visitor an extra chunk fetch
// (and the render delay that goes with it) before anything paints.
const LegalPage         = lazy(() => import("./pages/LegalPage"));
const ContactPage       = lazy(() => import("./pages/ContactPage"));
const TenantHome        = lazy(() => import("./pages/TenantHome"));
const BarberProfile     = lazy(() => import("./pages/BarberProfile"));
const MinimalBookingPage = lazy(() => import("./pages/MinimalBookingPage"));
const MiniBookingPage = lazy(() => import("./pages/MiniBookingPage"));
const BookingForm       = lazy(() => import("./pages/BookingForm"));
const Confirmation      = lazy(() => import("./pages/Confirmation"));
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Login             = lazy(() => import("./pages/Login"));
const AdLandingPage = lazy(() => import("./pages/AdLandingPage"));
const Signup             = lazy(() => import("./pages/Signup"));
const AdminCreateAccount = lazy(() => import("./pages/AdminCreateAccount"));
const AdminChatLeads     = lazy(() => import("./pages/AdminChatLeads"));
const StaffSignup       = lazy(() => import("./pages/StaffSignup"));
const TenantLogin       = lazy(() => import("./pages/TenantLogin"));
const TenantSignup      = lazy(() => import("./pages/TenantSignup"));
const CancelBooking     = lazy(() => import("./pages/CancelBooking"));
const ManageBooking     = lazy(() => import("./pages/ManageBooking"));
const ReviewPage        = lazy(() => import("./pages/ReviewPage"));
const PTBookingSite       = lazy(() => import("./pages/PTBookingSite"));
const PTStaffProfile      = lazy(() => import("./pages/PTStaffProfile"));
const DecoratorTemplate   = lazy(() => import("./pages/DecoratorTemplate"));
const DecoratorStaffProfile = lazy(() => import("./pages/DecoratorStaffProfile"));
const HairdresserTemplate = lazy(() => import("./pages/HairdresserTemplate"));
const HairdresserStaffProfile = lazy(() => import("./pages/HairdresserStaffProfile"));
const PlumberTemplate     = lazy(() => import("./pages/PlumberTemplateV2"));
const OfflinePage         = lazy(() => import("./pages/OfflinePage"));
const Onboarding        = lazy(() => import("./pages/Onboarding"));
const WorkoutPlanView      = lazy(() => import("./pages/WorkoutPlanView"));
const FoodDiarySubmit      = lazy(() => import("./pages/FoodDiarySubmit"));
const CheckInSubmit        = lazy(() => import("./pages/CheckInSubmit"));
const ParQSubmit           = lazy(() => import("./pages/ParQSubmit"));
const ColourApprovalPage   = lazy(() => import("./pages/ColourApprovalPage"));
const QuoteViewPage        = lazy(() => import("./pages/QuoteViewPage"));
const QueuePage            = lazy(() => import("./pages/QueuePage"));
const FoodGenerator       = lazy(() => import("./pages/FoodGenerator"));
const ClientPortal        = lazy(() => import("./pages/ClientPortal"));
const PTBookingPage        = lazy(() => import("./pages/PTBookingPage"));
const SeoLandingPage           = lazy(() => import("./pages/SeoLandingPage"));
const ComparePage              = lazy(() => import("./pages/ComparePage"));
const FreshaAlternativePage    = lazy(() => import("./pages/seo/FreshaAlternativePage"));
const TreatwellAlternativePage = lazy(() => import("./pages/seo/TreatwellAlternativePage"));
const BarberSoftwarePage       = lazy(() => import("./pages/seo/BarberSoftwarePage"));
const SalonSoftwarePage        = lazy(() => import("./pages/seo/SalonSoftwarePage"));
const PTSoftwarePage           = lazy(() => import("./pages/seo/PTSoftwarePage"));
const PricingPageSEO           = lazy(() => import("./pages/seo/PricingPageSEO"));
const HowItWorksPage           = lazy(() => import("./pages/seo/HowItWorksPage"));
const DecoratorSoftwarePage    = lazy(() => import("./pages/seo/DecoratorSoftwarePage"));
const ElectricianSoftwarePage  = lazy(() => import("./pages/seo/ElectricianSoftwarePage"));
const BlogIndex                = lazy(() => import("./pages/blog/BlogIndex"));
const BlogPost                 = lazy(() => import("./pages/blog/BlogPost"));
const StarterPackGuide         = lazy(() => import("./pages/StarterPackGuide"));
const NoShowCalculator         = lazy(() => import("./pages/tools/NoShowCalculator"));
const RevenueCalculator        = lazy(() => import("./pages/tools/RevenueCalculator"));
const PTRateCalculator         = lazy(() => import("./pages/tools/PTRateCalculator"));
const ServicePricingCalculator = lazy(() => import("./pages/tools/ServicePricingCalculator"));
const ToolsHub               = lazy(() => import("./pages/tools/ToolsHub"));
const OutlookCallback        = lazy(() => import("./pages/auth/OutlookCallback"));
const AuthAction             = lazy(() => import("./pages/auth/AuthAction"));

// Split Nav & Footer imports
import Nav               from "./components/Nav";
import CookieConsent      from "./components/CookieConsent";
import TenantNav         from "./components/TenantNav"; 
import Footer            from "./components/Footer";
import TenantFooter      from "./components/TenantFooter"; 

function BarberRoute({ children }) {
  const { barber, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (!barber) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AppShell() {
  const [tenantBarber, setTenantBarber] = useState(null);
  const [isFetchingTenant, setIsFetchingTenant] = useState(true);
  const hostname = window.location.hostname.toLowerCase();
  const location = useLocation();
  const navigate = useNavigate();

  const lastIdentifiedId = useRef(null);
  // Which path the current tenantBarber/null value actually corresponds to.
  // Without this, a client-side navigation straight into a /:bookingSlug
  // route from a non-tenant page (e.g. clicking "Done" on /confirmation/:id)
  // renders with the PREVIOUS page's stale tenantBarber (null) for one frame,
  // before identifyTenant's effect has re-run for the new path — and the
  // /:bookingSlug route was treating any falsy tenantBarber as "confirmed
  // not found", immediately <Navigate>-ing to "/" before the real lookup
  // ever got a chance to complete. Comparing against this instead of
  // tenantBarber alone tells that route "still loading" vs. "genuinely
  // doesn't exist".
  const [identifiedPath, setIdentifiedPath] = useState(null);

  // The installed PWA's manifest start_url is always "/" (the marketing
  // homepage) — there's no way to point it at "wherever this install was
  // launched from", so a business owner, PT client, or walk-in customer
  // tapping the app icon always landed on the homepage instead of their
  // dashboard/portal/queue. Track the last such route visited and, on a
  // fresh standalone launch at "/", jump straight back into it.
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/dashboard") || path.startsWith("/client-portal/") || path.startsWith("/queue/")) {
      try { localStorage.setItem("br_pwa_last_route", path + location.search); } catch {}
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (!isStandalone || location.pathname !== "/") return;
    try {
      const lastRoute = localStorage.getItem("br_pwa_last_route");
      if (lastRoute) navigate(lastRoute, { replace: true });
    } catch {}
    // Only relevant right when the installed app launches at "/" — deliberately
    // not re-run on later in-app navigation back to "/".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React Router doesn't reset scroll position on navigation by default —
  // without this, following a link while scrolled partway down a page (e.g.
  // the "Free Business Starter Pack" link from a scrolled dashboard card)
  // lands on the new page at that same pixel offset instead of its top.
  // Skip when a hash is present so in-page anchor links (e.g. "/#browse-
  // section") still scroll to their target instead of being overridden.
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const platformDomains = [
    'bookrightly.co.uk',
    'www.bookrightly.co.uk',
    'localhost',
    '127.0.0.1',
  ];

  const isPlatformDomain = platformDomains.some(
    d => hostname === d || hostname.endsWith(`.${d}`)
  );

  const identifyTenant = useCallback(async () => {
    const path = location.pathname;

    // ── FIX: Dashboard is always the logged-in barber's own view.
    // Never resolve a tenant for dashboard routes — doing so causes
    // isAlternativeBookingLayout to fire and strips the nav/shell.
    if (path.startsWith("/dashboard") || path.startsWith("/onboarding")) {
      setIsFetchingTenant(false);
      return;
    }

    // ── FIX: Review page handles its own shopId via useParams.
    // Never resolve a tenant here — if the shop is a decorator/trainer,
    // isAlternativeBookingLayout would fire and break the review page layout.
    if (path.startsWith("/review") || path.startsWith("/food-generator")) {
      setIsFetchingTenant(false);
      return;
    }

    // Client-side navigation from the marketplace happens before the tenant
    // lookup resolves. Mark the transition immediately so tenant templates are
    // never asked to render with a null profile.
    setIsFetchingTenant(true);

    const shopMatch        = matchPath("/shop/:tenantId", path);
    const ptMatch          = matchPath("/pt-booking/:tenantId", path);
    const hairdresserMatch = matchPath("/hairdresser/:tenantId", path);
    const decoratorMatch   = matchPath("/decorator/:tenantId", path);
    const plumberMatch     = matchPath("/plumber/:tenantId", path);
    const barberMatch      = matchPath("/barber/:id", path);
    const bookingMatch     = matchPath("/book/:barberId/*", path);

    const isAuthPath = matchPath("/login", path) || matchPath("/signup", path);

    const targetId =
      shopMatch?.params.tenantId ||
      ptMatch?.params.tenantId ||
      hairdresserMatch?.params.tenantId ||
      decoratorMatch?.params.tenantId ||
      plumberMatch?.params.tenantId ||
      barberMatch?.params.id ||
      bookingMatch?.params.barberId;

    // Bookrightly-hosted vanity booking URL (bookrightly.co.uk/{slug}) — only
    // considered when nothing else matched and the first path segment isn't
    // one of the platform's own static routes (RESERVED_SLUGS is kept a
    // superset of every top-level path in this file's <Routes> table).
    // Platform-domain only: a custom-domain visitor's path resolution is
    // unchanged, still handled entirely by the getBarberByDomain fallback below.
    const firstSegment = path.split("/")[1] || "";
    const slugMatch = (isPlatformDomain && !targetId && firstSegment && !RESERVED_SLUGS.has(firstSegment))
      ? matchPath("/:bookingSlug", path)
      : null;

    try {
      if (isAuthPath && tenantBarber) {
        setIsFetchingTenant(false);
        return;
      }

      if (isPlatformDomain && path === "/" && !targetId) {
        setTenantBarber(null);
        lastIdentifiedId.current = null;
        setIsFetchingTenant(false);
        return;
      }

      // Covers all three ways a tenant gets resolved below (id, slug, custom
      // domain) with one key, not just the id case. Without this, slug and
      // custom-domain routes had no guard at all: this effect depends on
      // tenantBarber, and every resolution below calls setTenantBarber with a
      // brand-new object — so with no guard, each render's "already resolved"
      // check never fires, the effect reruns, refetches, sets a new object,
      // and reruns again forever. That infinite loop was hammering Firestore
      // with hundreds of reconnects a second and leaving the page stuck on
      // its loading spinner permanently (found 2026-08-21 investigating "no
      // card loads").
      const identifyKey = targetId
        || (slugMatch ? `slug:${slugMatch.params.bookingSlug}` : null)
        || (!isPlatformDomain ? `domain:${hostname}` : null);

      if (identifyKey && identifyKey === lastIdentifiedId.current && tenantBarber) {
        setIdentifiedPath(path);
        setIsFetchingTenant(false);
        return;
      }

      const { getBarberById, getBarberByDomain, getBarberBySlug } = await import("./firebase/firestore");

      let data = null;
      if (targetId) {
        data = await getBarberById(targetId);
      } else if (slugMatch) {
        data = await getBarberBySlug(slugMatch.params.bookingSlug);
      } else if (!isPlatformDomain) {
        data = await getBarberByDomain(hostname);
      }

      if (data) {
        const isStaff      = data.role === 'staff' || data.isStaff;
        const parentShopId = data.shopId;

        if (isStaff && parentShopId) {
          const shopData = await getBarberById(parentShopId);
          if (shopData) {
            setTenantBarber({
              ...data,
              id: parentShopId,
              businessType:    shopData.businessType    || data.businessType  || "barber",
              businessName:    shopData.businessName    || shopData.displayName || "Premium Space",
              businessLogo:    shopData.businessLogo    || shopData.logoUrl    || shopData.logo,
              logoUrl:         shopData.logoUrl         || shopData.businessLogo || shopData.logo,
              brandColor:      shopData.brandColor      || data.brandColor     || "#C9A84C",
              address:         shopData.address         || "",
              phone:           shopData.phone           || shopData.businessPhone || "",
              businessEmail:   shopData.businessEmail   || shopData.email     || "",
              email:           shopData.businessEmail   || shopData.email     || "",
              instagramUrl:    shopData.instagramUrl    || null,
              facebookUrl:     shopData.facebookUrl     || null,
              tiktokUrl:       shopData.tiktokUrl       || null,
              privacyPolicy:   shopData.privacyPolicy   || "",
              termsConditions: shopData.termsConditions || "",
            });
          }
        } else {
          setTenantBarber({
            ...data,
            businessType:  data.businessType  || "barber",
            businessName:  data.businessName  || data.displayName || "Premium Space",
            businessLogo:  data.businessLogo  || data.logoUrl     || data.logo,
            logoUrl:       data.logoUrl       || data.businessLogo || data.logo,
            brandColor:    data.brandColor    || "#C9A84C",
            address:       data.address       || "",
            phone:         data.phone         || data.businessPhone || "",
            businessEmail: data.businessEmail || data.email || "",
            email:         data.businessEmail || data.email || "",
            instagramUrl:  data.instagramUrl  || null,
            facebookUrl:   data.facebookUrl   || null,
            tiktokUrl:     data.tiktokUrl     || null,
          });
        }
        lastIdentifiedId.current = identifyKey || hostname;
        setIdentifiedPath(path);
      } else if (!isAuthPath) {
        setTenantBarber(null);
        lastIdentifiedId.current = null;
        setIdentifiedPath(path);
      }
    } catch (err) {
      console.error("Tenant Lookup Error:", err);
    } finally {
      setIsFetchingTenant(false);
    }
  }, [hostname, location.pathname, isPlatformDomain, tenantBarber]);

  useEffect(() => {
    identifyTenant();
  }, [identifyTenant]);

  // Custom-domain business pages (e.g. mpowerelectrics.co.uk) are proxied
  // straight through to Firebase Hosting's index.html by the Worker with no
  // per-business SEO injection (only /barber/:id-style routes and vanity
  // slugs get that server-side) — so the generic Bookrightly favicon baked
  // into index.html never gets swapped for those. Mutate the existing
  // <link> tags directly (rather than via Helmet, which would just append a
  // second, differently-attributed icon tag alongside the static one and
  // leave the browser free to keep using either) so there's only ever one
  // favicon in the document at a time.
  useEffect(() => {
    const logo = tenantBarber?.logoUrl;
    if (!logo) return;
    const faviconUrl = isPlatformDomain ? logo : "/favicon.svg";
    document.querySelectorAll('link[rel="icon"]').forEach(el => {
      el.setAttribute("href", faviconUrl);
      if (isPlatformDomain) {
        el.removeAttribute("type");
        el.removeAttribute("sizes");
      } else {
        el.setAttribute("type", "image/svg+xml");
        el.setAttribute("sizes", "any");
      }
    });
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(el => {
      el.setAttribute("href", faviconUrl);
    });
  }, [tenantBarber?.logoUrl, isPlatformDomain]);

  const dynamicTheme = useMemo(() => {
    const selectedColor = tenantBarber?.brandColor || "#FF735C";
    return createTheme({
      palette: {
        primary:   { main: "#2563EB", dark: "#1D4ED8", contrastText: "#FFFFFF" },
        secondary: { main: selectedColor },
        background: { default: "#F5F3ED", paper: "#FFFFFF" },
        text: { primary: "#111116", secondary: "#696A73" },
        divider: "#DEDDD8",
      },
      shape: { borderRadius: 18 },
      typography: {
        fontFamily: "'DM Sans','Plus Jakarta Sans','Inter',system-ui,sans-serif",
        h1: { fontWeight: 900, letterSpacing: "-0.065em", lineHeight: 0.98 },
        h2: { fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 1 },
        h3: { fontWeight: 900, letterSpacing: "-0.045em", lineHeight: 1.05 },
        h4: { fontWeight: 900, letterSpacing: "-0.035em" },
        h5: { fontWeight: 850, letterSpacing: "-0.025em" },
        h6: { fontWeight: 850, letterSpacing: "-0.02em" },
        button: { textTransform: "none", fontWeight: 850, letterSpacing: 0 },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: "#F5F3ED",
              color: "#111116",
              selection: { background: "#93C5FD", color: "#111116" },
            },
            "*": { scrollbarColor: "#B9B8B3 transparent" },
          },
        },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: { root: { backgroundImage: "none", border: "1px solid #DEDDD8", borderRadius: "6px 22px 22px 22px", boxShadow: "0 14px 40px rgba(17,17,22,.055)" } },
        },
        MuiCard: {
          defaultProps: { elevation: 0 },
          styleOverrides: { root: { borderRadius: "6px 24px 24px 24px", border: "1px solid #DEDDD8", boxShadow: "0 14px 40px rgba(17,17,22,.055)" } },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { minHeight: 42, borderRadius: 999, paddingInline: 20 },
            containedPrimary: { boxShadow: "0 10px 28px rgba(37,99,235,.22)", "&:hover": { boxShadow: "0 12px 32px rgba(37,99,235,.28)" } },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: { root: { borderRadius: 16, backgroundColor: "#FFFFFF", "& fieldset": { borderColor: "#D8D7D2" }, "&:hover fieldset": { borderColor: "#A9A8A3" }, "&.Mui-focused fieldset": { borderWidth: 2 } } },
        },
        MuiInputLabel: { styleOverrides: { root: { fontWeight: 700 } } },
        MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 800 } } },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 28, border: "1px solid #DEDDD8" } } },
        MuiAccordion: { defaultProps: { elevation: 0 }, styleOverrides: { root: { boxShadow: "none", "&:before": { display: "none" } } } },
        MuiAlert: { styleOverrides: { root: { borderRadius: 16, fontWeight: 700 } } },
        MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3 } } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 900, backgroundColor: "#F5F3ED" }, root: { borderColor: "#ECEBE7" } } },
        MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 10, backgroundColor: "#111116", fontWeight: 700 } } },
      }
    });
  }, [tenantBarber]);

  const isDashboard    = location.pathname.startsWith('/dashboard');
  const isHomePage     = location.pathname === '/';
  const isAdPage = location.pathname.startsWith("/go/");
  const isAuthPage     = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/admin/create-account' || location.pathname === '/admin/chat-leads';
  const isReviewPath   = location.pathname.startsWith('/review');
  const isOnboarding   = location.pathname.startsWith('/onboarding');
  const isWorkoutView  = location.pathname.startsWith('/workout')
                      || location.pathname.startsWith('/food-diary')
                      || location.pathname.startsWith('/check-in')
                      || location.pathname.startsWith('/par-q')
                      || location.pathname.startsWith('/colour-approval')
                      || location.pathname.startsWith('/queue')
                      || location.pathname.startsWith('/food-generator')
                      || location.pathname.startsWith('/client-portal')
                      || location.pathname.startsWith('/pt-book')
                      || location.pathname.startsWith('/quote-view');

  const computedPageTitle = useMemo(() => {
    if (tenantBarber) {
      return `${tenantBarber.businessName.toUpperCase()} | Booking Portal`;
    }
    return "Bookrightly | The Multi-Industry Appointment Booking Network";
  }, [tenantBarber]);

  if (isFetchingTenant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#000" }}>
        <CircularProgress sx={{ color: tenantBarber?.brandColor || "#C9A84C" }} />
      </Box>
    );
  }

  // Only apply alternative layout for genuine tenant routes —
  // never for /dashboard or /review (review has its own standalone layout)
  // Basic-plan accounts are excluded from every check below regardless of
  // business type — MinimalBookingPage.jsx (used for Basic on any business
  // type) never renders its own nav/footer, so without this exclusion a
  // Basic account of any non-barber type ends up with neither the global
  // shell nor its own — no nav or footer at all. This used to only be
  // applied to the businessType-based check further down, while the
  // path-based checks above it had no such exclusion — meaning visiting a
  // Basic-plan decorator/hairdresser/plumber/trainer via its legacy
  // /type/:id URL (which still matches these path strings even though
  // renderTenantHome now correctly renders MinimalBookingPage there) still
  // wrongly suppressed the nav. Fixed by gating the whole expression on
  // plan !== "basic" once, up front.
  const isAlternativeBookingLayout = !isDashboard && !isReviewPath && tenantBarber?.plan !== "basic" && (
    location.pathname.includes("/pt-booking/") ||
    location.pathname.includes("/decorator/") ||
    location.pathname.includes("/hairdresser/") ||
    location.pathname.includes("/plumber/") ||
    // Non-barber tenant templates (PT/decorator/hairdresser) render their own
    // nav + footer, so hide the global shell whenever one is shown — including
    // the platform-domain /shop/:id view (where tenantBarber is the tenant).
    (tenantBarber && tenantBarber.businessType && tenantBarber.businessType !== "barber") ||
    // Free-plan pages (MiniBookingPage.jsx) are deliberately standalone —
    // no nav, no footer at all, not even the global TenantNav that Basic-
    // plan pages still use.
    tenantBarber?.plan === "free"
  );

  // A lapsed subscription takes the public site offline (not the dashboard).
  // The Free plan is never taken offline for a stale subscriptionStatus —
  // a lapsed trial moves to Free (see worker.js's handleTrialLifecycle) and
  // must keep its page live, which is the entire point of that change.
  const isTenantOffline = Boolean(
    !tenantBarber?.freeForever &&
    tenantBarber?.plan !== "free" && (
      tenantBarber?.subscriptionStatus === "past_due" ||
      tenantBarber?.subscriptionStatus === "canceled"
    )
  );

  // Choose the right landing component based on business type
  const renderTenantHome = (tenant) => {
    if (tenant.plan === "free")                 return <MiniBookingPage tenant={tenant} />;
    if (tenant.plan === "basic")               return <MinimalBookingPage tenant={tenant} />;
    if (tenant.businessType === "trainer")     return <PTBookingSite barber={tenant} profile={tenant} />;
    if (tenant.businessType === "decorator")   return <DecoratorTemplate tenantData={tenant} />;
    if (tenant.businessType === "hairdresser") return <HairdresserTemplate tenantData={tenant} />;
    if (tenant.businessType === "plumber")     return <PlumberTemplate tenantData={tenant} />;
    return <TenantHome tenant={tenant} />;
  };

  const tenantLoading = (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", bgcolor: "#F5F3ED" }}>
      <CircularProgress sx={{ color: tenantBarber?.brandColor || "#2563EB" }} />
    </Box>
  );

  // ID-based tenant routes are retained for old bookmarks, but the public
  // address is the claimed booking slug. Wait for the tenant record before
  // rendering or redirecting so client-side card clicks cannot white-screen.
  const renderLegacyTenantRoute = (renderer) => {
    if (!tenantBarber) return tenantLoading;
    if (isTenantOffline) return <OfflinePage />;
    if (isPlatformDomain && tenantBarber.bookingSlug) {
      return <Navigate to={`/${tenantBarber.bookingSlug}`} replace />;
    }
    return renderer(tenantBarber);
  };

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <Helmet>
        <title>{computedPageTitle}</title>
      </Helmet>

      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {!isAdPage && !isDashboard && !isOnboarding && !isAuthPage && !isAlternativeBookingLayout && !isReviewPath && !isWorkoutView && (
          tenantBarber ? (
            <TenantNav
              key={`nav-${location.pathname}`} 
              tenant={tenantBarber} 
              businessType={tenantBarber.businessType} 
            /> 
          ) : (
            <Nav isMainSite={true} platformName="Bookrightly" />
          )
        )}

        <Box component="main" sx={{ flex: 1 }}>
          <Suspense fallback={
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
              <CircularProgress sx={{ color: tenantBarber?.brandColor || "#C9A84C" }} />
            </Box>
          }>
          <Routes>
            <Route path="/" element={(!isPlatformDomain && tenantBarber) ? (isTenantOffline ? <OfflinePage /> : renderTenantHome(tenantBarber)) : <Home />} />
            {/* These four used to hardcode their Full-plan template directly,
                bypassing renderTenantHome's plan check entirely — harmless
                while Basic/Free were barber/hairdresser-only (this route
                group never applied to them), but a real bug once the plan
                restructure opened Basic/Free to every business type: a
                Free-plan decorator/hairdresser/plumber/trainer visited via
                one of these legacy URLs got the full template instead of
                their actual plan's page. Now dispatches through
                renderTenantHome like /shop/:tenantId already did. */}
            <Route path="/shop/:tenantId" element={renderLegacyTenantRoute(renderTenantHome)} />
            <Route path="/pt-booking/:tenantId" element={renderLegacyTenantRoute(renderTenantHome)} />
            <Route path="/pt-booking/:tenantId/:staffId" element={isTenantOffline ? <OfflinePage /> : <PTStaffProfile tenant={tenantBarber} />} />
            <Route path="/decorator/:tenantId" element={renderLegacyTenantRoute(renderTenantHome)} />
            <Route path="/decorator/:tenantId/:staffId" element={isTenantOffline ? <OfflinePage /> : <DecoratorStaffProfile tenant={tenantBarber} />} />
            <Route path="/hairdresser/:tenantId" element={renderLegacyTenantRoute(renderTenantHome)} />
            <Route path="/hairdresser/:tenantId/:staffId" element={isTenantOffline ? <OfflinePage /> : <HairdresserStaffProfile tenant={tenantBarber} />} />
            <Route path="/plumber/:tenantId" element={renderLegacyTenantRoute(renderTenantHome)} />
            <Route path="/barber/:id" element={
              tenantBarber?.plan === "free" ? <MiniBookingPage tenant={tenantBarber} /> :
              tenantBarber?.plan === "basic" ? <MinimalBookingPage tenant={tenantBarber} /> :
              <BarberProfile tenant={tenantBarber} />
            } />
            <Route path="/book/:barberId/:slotId" element={<BookingForm tenant={tenantBarber} />} />
            <Route path="/confirmation/:bookingId?" element={<Confirmation />} />
            <Route path="/auth/outlook/callback" element={<OutlookCallback />} />
            <Route path="/auth/action" element={<AuthAction />} />
            <Route path="/review/:shopId" element={<ReviewPage />} />
            <Route path="/review/:shopId/:barberId" element={<ReviewPage />} />
            <Route path="/login" element={tenantBarber ? <TenantLogin tenant={tenantBarber} /> : <Login />} />
            <Route path="/signup" element={tenantBarber ? <TenantSignup tenant={tenantBarber} /> : <Signup />} />
            <Route path="/admin/create-account" element={<AdminCreateAccount />} />
            <Route path="/admin/chat-leads" element={<AdminChatLeads />} />
            <Route path="/staff-signup/:shopId/:staffId" element={<StaffSignup />} />
            <Route path="/cancel-booking/:bookingId" element={<CancelBooking />} />
            <Route path="/manage-booking/:bookingId" element={<ManageBooking />} />
            <Route path="/website-design/:industry/:city" element={<SeoLandingPage />} />
            <Route path="/compare"                           element={<ComparePage />} />
            <Route path="/fresha-alternative"             element={<FreshaAlternativePage />} />
            <Route path="/treatwell-alternative"          element={<TreatwellAlternativePage />} />
            <Route path="/go/:audience" element={<AdLandingPage />} />
            <Route path="/booking-software/barbers"       element={<BarberSoftwarePage />} />
            <Route path="/booking-software/salons"        element={<SalonSoftwarePage />} />
            <Route path="/booking-software/personal-trainers" element={<PTSoftwarePage />} />
            <Route path="/pricing"                        element={<PricingPageSEO />} />
            <Route path="/how-it-works"                   element={<HowItWorksPage />} />
            <Route path="/booking-software/decorators"    element={<DecoratorSoftwarePage />} />
            <Route path="/booking-software/electricians"  element={<ElectricianSoftwarePage />} />
            <Route path="/blog"                           element={<BlogIndex />} />
            <Route path="/blog/:slug"                     element={<BlogPost />} />
            <Route path="/starter-pack"                   element={<StarterPackGuide />} />
            <Route path="/tools"                            element={<ToolsHub />} />
            <Route path="/tools/no-show-calculator"        element={<NoShowCalculator />} />
            <Route path="/tools/revenue-calculator"        element={<RevenueCalculator />} />
            <Route path="/tools/pt-rate-calculator"        element={<PTRateCalculator />} />
            <Route path="/tools/service-pricing-calculator" element={<ServicePricingCalculator />} />
            <Route path="/terms"   element={<LegalPage kind="terms" />} />
            <Route path="/privacy" element={<LegalPage kind="privacy" />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/workout/:trainerId/:planId"                element={<WorkoutPlanView />} />
            <Route path="/food-diary/:trainerId"                  element={<FoodDiarySubmit />} />
            <Route path="/check-in/:trainerId"                    element={<CheckInSubmit />} />
            <Route path="/par-q/:trainerId"                       element={<ParQSubmit />} />
            <Route path="/colour-approval/:tradieId/:paletteId"   element={<ColourApprovalPage />} />
            <Route path="/quote-view/:tradeId/:quoteId"           element={<QuoteViewPage />} />
            <Route path="/queue/:shopId"                          element={<QueuePage />} />
            <Route path="/food-generator/:barberId/:token"        element={<FoodGenerator />} />
            <Route path="/client-portal/:trainerId/:clientId"    element={<ClientPortal />} />
            <Route path="/pt-book/:ptId"                         element={<PTBookingPage />} />
            <Route path="/onboarding" element={<BarberRoute><Onboarding /></BarberRoute>} />
            <Route path="/dashboard/*" element={<BarberRoute><Dashboard onProfileUpdate={identifyTenant} /></BarberRoute>} />
            <Route
              path="/:bookingSlug"
              element={
                isTenantOffline ? <OfflinePage /> :
                identifiedPath !== location.pathname ? tenantLoading :
                tenantBarber ? (
                  tenantBarber._redirectFromOldSlug
                    ? <Navigate to={`/${tenantBarber.bookingSlug}`} replace />
                    : renderTenantHome(tenantBarber)
                ) : <Navigate to="/" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Box>

        {!isAdPage && !isDashboard && !isOnboarding && !isAuthPage && !isAlternativeBookingLayout && !isReviewPath && !isWorkoutView && (
          tenantBarber ? (
            <TenantFooter
              key={`footer-${location.pathname}`} 
              tenant={tenantBarber} 
              businessType={tenantBarber.businessType} 
            />
          ) : (
            <Footer isMainSite={true} isHomePage={isHomePage} />
          )
        )}
      </Box>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <AppShell />
          <CookieConsent />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}
