import { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./styles/index.css";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, matchPath } from "react-router-dom";
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Home from "./pages/Home";

// Firebase imports
import { getBarberByDomain, getBarberById } from "./firebase/firestore";

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
const BookingForm       = lazy(() => import("./pages/BookingForm"));
const Confirmation      = lazy(() => import("./pages/Confirmation"));
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Login             = lazy(() => import("./pages/Login"));
const Signup             = lazy(() => import("./pages/Signup"));
const TenantLogin       = lazy(() => import("./pages/TenantLogin"));
const TenantSignup      = lazy(() => import("./pages/TenantSignup"));
const CancelBooking     = lazy(() => import("./pages/CancelBooking"));
const ReviewPage        = lazy(() => import("./pages/ReviewPage"));
const PTBookingSite       = lazy(() => import("./pages/PTBookingSite"));
const DecoratorTemplate   = lazy(() => import("./pages/DecoratorTemplate"));
const HairdresserTemplate = lazy(() => import("./pages/HairdresserTemplate"));
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
const BlogIndex                = lazy(() => import("./pages/blog/BlogIndex"));
const BlogPost                 = lazy(() => import("./pages/blog/BlogPost"));
const NoShowCalculator         = lazy(() => import("./pages/tools/NoShowCalculator"));
const RevenueCalculator        = lazy(() => import("./pages/tools/RevenueCalculator"));
const PTRateCalculator         = lazy(() => import("./pages/tools/PTRateCalculator"));
const ServicePricingCalculator = lazy(() => import("./pages/tools/ServicePricingCalculator"));
const ToolsHub               = lazy(() => import("./pages/tools/ToolsHub"));
const OutlookCallback        = lazy(() => import("./pages/auth/OutlookCallback"));

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
  
  const lastIdentifiedId = useRef(null);

  const platformDomains = [
    'bookehtrim.co.uk',
    'www.bookehtrim.co.uk',
    'bookehtrim.pages.dev',
    'bookehtrim.vercel.app',
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

    const shopMatch        = matchPath("/shop/:tenantId", path);
    const ptMatch          = matchPath("/pt-booking/:tenantId", path);
    const hairdresserMatch = matchPath("/hairdresser/:tenantId", path);
    const decoratorMatch   = matchPath("/decorator/:tenantId", path);
    const barberMatch      = matchPath("/barber/:id", path);
    const bookingMatch     = matchPath("/book/:barberId/*", path);

    const isAuthPath = matchPath("/login", path) || matchPath("/signup", path);

    const targetId =
      shopMatch?.params.tenantId ||
      ptMatch?.params.tenantId ||
      hairdresserMatch?.params.tenantId ||
      decoratorMatch?.params.tenantId ||
      barberMatch?.params.id ||
      bookingMatch?.params.barberId;

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

      if (targetId && targetId === lastIdentifiedId.current && tenantBarber) {
        setIsFetchingTenant(false);
        return;
      }

      let data = null;
      if (targetId) {
        data = await getBarberById(targetId);
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
        lastIdentifiedId.current = targetId || hostname;
      } else if (!isAuthPath) {
        setTenantBarber(null);
        lastIdentifiedId.current = null;
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

  const dynamicTheme = useMemo(() => {
    const selectedColor = tenantBarber?.brandColor || "#C9A84C";
    return createTheme({
      palette: {
        primary:   { main: "#1A1A1A" },
        secondary: { main: selectedColor },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              selection: { background: selectedColor, color: "#FFFFFF" }
            }
          }
        }
      }
    });
  }, [tenantBarber]);

  const isDashboard    = location.pathname.startsWith('/dashboard');
  const isHomePage     = location.pathname === '/';
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
  const isAlternativeBookingLayout = !isDashboard && !isReviewPath && (
    location.pathname.includes("/pt-booking/") ||
    location.pathname.includes("/decorator/") ||
    location.pathname.includes("/hairdresser/") ||
    // Non-barber tenant templates (PT/decorator/hairdresser) render their own
    // nav + footer, so hide the global shell whenever one is shown — including
    // the platform-domain /shop/:id view (where tenantBarber is the tenant).
    (tenantBarber && tenantBarber.businessType && tenantBarber.businessType !== "barber")
  );

  // A lapsed subscription takes the public site offline (not the dashboard)
  const isTenantOffline = Boolean(
    tenantBarber?.subscriptionStatus === "past_due" ||
    tenantBarber?.subscriptionStatus === "canceled"
  );

  // Choose the right landing component based on business type
  const renderTenantHome = (tenant) => {
    if (tenant.businessType === "trainer")     return <PTBookingSite barber={tenant} profile={tenant} />;
    if (tenant.businessType === "decorator")   return <DecoratorTemplate tenantData={tenant} />;
    if (tenant.businessType === "hairdresser") return <HairdresserTemplate tenantData={tenant} />;
    return <TenantHome tenant={tenant} />;
  };

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <Helmet>
        <title>{computedPageTitle}</title>
      </Helmet>

      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {!isDashboard && !isOnboarding && !isAlternativeBookingLayout && !isReviewPath && !isWorkoutView && (
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
            <Route path="/shop/:tenantId" element={isTenantOffline ? <OfflinePage /> : (tenantBarber ? renderTenantHome(tenantBarber) : <TenantHome tenant={tenantBarber} />)} />
            <Route path="/pt-booking/:tenantId" element={isTenantOffline ? <OfflinePage /> : <PTBookingSite barber={tenantBarber} profile={tenantBarber} />} />
            <Route path="/decorator/:tenantId" element={isTenantOffline ? <OfflinePage /> : <DecoratorTemplate tenantData={tenantBarber} />} />
            <Route path="/hairdresser/:tenantId" element={isTenantOffline ? <OfflinePage /> : <HairdresserTemplate tenantData={tenantBarber} />} />
            <Route path="/barber/:id" element={<BarberProfile tenant={tenantBarber} />} />
            <Route path="/book/:barberId/:slotId" element={<BookingForm tenant={tenantBarber} />} />
            <Route path="/confirmation/:bookingId?" element={<Confirmation />} />
            <Route path="/auth/outlook/callback" element={<OutlookCallback />} />
            <Route path="/review/:shopId" element={<ReviewPage />} />
            <Route path="/login" element={tenantBarber ? <TenantLogin tenant={tenantBarber} /> : <Login />} />
            <Route path="/signup" element={tenantBarber ? <TenantSignup tenant={tenantBarber} /> : <Signup />} />
            <Route path="/cancel-booking/:bookingId" element={<CancelBooking />} />
            <Route path="/website-design/:industry/:city" element={<SeoLandingPage />} />
            <Route path="/compare"                           element={<ComparePage />} />
            <Route path="/fresha-alternative"             element={<FreshaAlternativePage />} />
            <Route path="/treatwell-alternative"          element={<TreatwellAlternativePage />} />
            <Route path="/booking-software/barbers"       element={<BarberSoftwarePage />} />
            <Route path="/booking-software/salons"        element={<SalonSoftwarePage />} />
            <Route path="/booking-software/personal-trainers" element={<PTSoftwarePage />} />
            <Route path="/pricing"                        element={<PricingPageSEO />} />
            <Route path="/how-it-works"                   element={<HowItWorksPage />} />
            <Route path="/booking-software/decorators"    element={<DecoratorSoftwarePage />} />
            <Route path="/blog"                           element={<BlogIndex />} />
            <Route path="/blog/:slug"                     element={<BlogPost />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Box>

        {!isDashboard && !isOnboarding && !isAlternativeBookingLayout && !isReviewPath && !isWorkoutView && (
          tenantBarber ? (
            <TenantFooter 
              key={`footer-${location.pathname}`} 
              tenant={tenantBarber} 
              businessType={tenantBarber.businessType} 
            />
          ) : (
            // Home page renders its own footer inline, so skip the global one there
            !isHomePage && <Footer isMainSite={true} />
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