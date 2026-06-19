import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./styles/index.css";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, matchPath } from "react-router-dom";
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Helmet, HelmetProvider } from 'react-helmet-async';

// Firebase imports
import { getBarberByDomain, getBarberById } from "./firebase/firestore";

// Page/Component imports
import Home              from "./pages/Home";           
import TenantHome        from "./pages/TenantHome";      
import BarberProfile     from "./pages/BarberProfile";
import BookingForm       from "./pages/BookingForm";
import Confirmation      from "./pages/Confirmation";
import Dashboard         from "./pages/Dashboard";
import Login             from "./pages/Login"; 
import Signup            from "./pages/Signup"; 
import TenantLogin       from "./pages/TenantLogin";
import TenantSignup      from "./pages/TenantSignup";
import CancelBooking     from "./pages/CancelBooking";
import ReviewPage        from "./pages/ReviewPage"; 
import PTBookingSite       from "./pages/PTBookingSite";
import DecoratorTemplate   from "./pages/DecoratorTemplate";
import HairdresserTemplate from "./pages/HairdresserTemplate";
import OfflinePage         from "./pages/OfflinePage";
import Onboarding        from "./pages/Onboarding";
import WorkoutPlanView      from "./pages/WorkoutPlanView";
import FoodDiarySubmit      from "./pages/FoodDiarySubmit";
import CheckInSubmit        from "./pages/CheckInSubmit";
import ParQSubmit           from "./pages/ParQSubmit";
import ColourApprovalPage   from "./pages/ColourApprovalPage";
import QueuePage            from "./pages/QueuePage";
import FoodGenerator       from "./pages/FoodGenerator";

// Split Nav & Footer imports
import Nav               from "./components/Nav";
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

    const shopMatch          = matchPath("/shop/:tenantId", path);
    const ptMatch            = matchPath("/pt-booking/:tenantId", path);
    const hairdresserMatch   = matchPath("/hairdresser/:tenantId", path);
    const barberMatch        = matchPath("/barber/:id", path);
    const bookingMatch = matchPath("/book/:barberId/*", path);
    
    const isAuthPath = matchPath("/login", path) || matchPath("/signup", path);

    const targetId =
      shopMatch?.params.tenantId ||
      ptMatch?.params.tenantId ||
      hairdresserMatch?.params.tenantId ||
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
              businessType:  shopData.businessType  || data.businessType  || "barber",
              businessName:  shopData.businessName  || shopData.displayName || "Premium Space",
              businessLogo:  shopData.businessLogo  || shopData.logoUrl    || shopData.logo,
              brandColor:    shopData.brandColor     || data.brandColor     || "#C9A84C",
              address:       shopData.address        || "",
              phone:         shopData.phone          || shopData.businessPhone || "",
              businessEmail: shopData.businessEmail  || shopData.email     || "",
              instagramUrl:  shopData.instagramUrl   || null,
              facebookUrl:   shopData.facebookUrl    || null,
              privacyPolicy: shopData.privacyPolicy  || "",
              termsConditions: shopData.termsConditions || ""
            });
          }
        } else {
          setTenantBarber({
            ...data,
            businessType: data.businessType || "barber",
            businessName: data.businessName || data.displayName || "Premium Space",
            businessLogo: data.businessLogo || data.logoUrl     || data.logo,
            brandColor:   data.brandColor   || "#C9A84C"
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
                      || location.pathname.startsWith('/food-generator');

  const computedPageTitle = useMemo(() => {
    if (tenantBarber) {
      return `${tenantBarber.businessName.toUpperCase()} | Booking Portal`;
    }
    return "Bookrty | The Multi-Industry Appointment Booking Network";
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
            <Nav isMainSite={true} platformName="Bookrty" />
          )
        )}

        <Box component="main" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={(!isPlatformDomain && tenantBarber) ? (isTenantOffline ? <OfflinePage /> : renderTenantHome(tenantBarber)) : <Home />} />
            <Route path="/shop/:tenantId" element={isTenantOffline ? <OfflinePage /> : (tenantBarber ? renderTenantHome(tenantBarber) : <TenantHome tenant={tenantBarber} />)} />
            <Route path="/pt-booking/:tenantId" element={isTenantOffline ? <OfflinePage /> : <PTBookingSite barber={tenantBarber} profile={tenantBarber} />} />
            <Route path="/decorator/:tenantId" element={isTenantOffline ? <OfflinePage /> : <DecoratorTemplate tenantData={tenantBarber} />} />
            <Route path="/hairdresser/:tenantId" element={isTenantOffline ? <OfflinePage /> : <HairdresserTemplate tenantData={tenantBarber} />} />
            <Route path="/barber/:id" element={<BarberProfile tenant={tenantBarber} />} />
            <Route path="/book/:barberId/:slotId" element={<BookingForm tenant={tenantBarber} />} />
            <Route path="/confirmation/:bookingId?" element={<Confirmation />} />
            <Route path="/review/:shopId" element={<ReviewPage />} />
            <Route path="/login" element={tenantBarber ? <TenantLogin tenant={tenantBarber} /> : <Login />} />
            <Route path="/signup" element={tenantBarber ? <TenantSignup tenant={tenantBarber} /> : <Signup />} />
            <Route path="/cancel-booking/:bookingId" element={<CancelBooking />} />
            <Route path="/workout/:trainerId/:planId"                element={<WorkoutPlanView />} />
            <Route path="/food-diary/:trainerId"                  element={<FoodDiarySubmit />} />
            <Route path="/check-in/:trainerId"                    element={<CheckInSubmit />} />
            <Route path="/par-q/:trainerId"                       element={<ParQSubmit />} />
            <Route path="/colour-approval/:tradieId/:paletteId"   element={<ColourApprovalPage />} />
            <Route path="/queue/:shopId"                          element={<QueuePage />} />
            <Route path="/food-generator/:barberId/:token"        element={<FoodGenerator />} />
            <Route path="/onboarding" element={<BarberRoute><Onboarding /></BarberRoute>} />
            <Route path="/dashboard/*" element={<BarberRoute><Dashboard onProfileUpdate={identifyTenant} /></BarberRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
        <Router><AppShell /></Router>
      </AuthProvider>
    </HelmetProvider>
  );
}