import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import PTBookingSite     from "./pages/PTBookingSite";

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

  // ── Add any domain that belongs to YOUR platform here, not your barber clients ──
  // Cloudflare Pages preview domains and your main domain all go in this list.
  const platformDomains = [
    'bookehtrim.co.uk',
    'www.bookehtrim.co.uk',
    'bookehtrim.pages.dev',      // Cloudflare Pages preview domain
    'bookehtrim.vercel.app',     // keep if you still have Vercel previews
    'localhost',
    '127.0.0.1',
  ];

  const isPlatformDomain = platformDomains.some(
    d => hostname === d || hostname.endsWith(`.${d}`)
  );

  const identifyTenant = useCallback(async () => {
    const path = location.pathname;
    const shopMatch = matchPath("/shop/:tenantId", path);
    const ptMatch = matchPath("/pt-booking/:tenantId", path);
    const barberMatch = matchPath("/barber/:id", path);
    const bookingMatch = matchPath("/book/:barberId/*", path);
    const reviewMatch = matchPath("/review/:shopId", path);
    
    // Detect if we are on login or signup to preserve context
    const isAuthPath = matchPath("/login", path) || matchPath("/signup", path);

    const targetId = 
      shopMatch?.params.tenantId || 
      ptMatch?.params.tenantId ||
      barberMatch?.params.id || 
      bookingMatch?.params.barberId || 
      reviewMatch?.params.shopId;

    try {
      // 1. If we are on an Auth path and already have a tenant, don't clear it
      if (isAuthPath && tenantBarber) {
        setIsFetchingTenant(false);
        return;
      }

      // 2. Handle Main Platform Landing
      if (isPlatformDomain && path === "/" && !targetId) {
        setTenantBarber(null);
        lastIdentifiedId.current = null;
        setIsFetchingTenant(false);
        return;
      }

      // 3. Prevent redundant fetches but allow updates if ID changes
      if (targetId && targetId === lastIdentifiedId.current && tenantBarber) {
        setIsFetchingTenant(false);
        return;
      }

      let data = null;
      if (targetId) {
        data = await getBarberById(targetId);
      } else if (!isPlatformDomain) {
        // Custom domain visit — getBarberByDomain now checks both
        // customDomain (new Cloudflare field) and vercelUrl (legacy) so
        // existing barbers keep working without any data migration.
        data = await getBarberByDomain(hostname);
      }

      if (data) {
        const isStaff = data.role === 'staff' || data.isStaff;
        const parentShopId = data.shopId;

        if (isStaff && parentShopId) {
          const shopData = await getBarberById(parentShopId);
          if (shopData) {
            setTenantBarber({
              ...data, 
              id: parentShopId, 
              businessType: shopData.businessType || data.businessType || "barber",
              businessName: shopData.businessName || shopData.displayName || "Premium Space",
              businessLogo: shopData.businessLogo || shopData.logoUrl || shopData.logo,
              brandColor: shopData.brandColor || data.brandColor || "#C9A84C",
              address: shopData.address || "",
              phone: shopData.phone || shopData.businessPhone || "",
              businessEmail: shopData.businessEmail || shopData.email || "",
              instagramUrl: shopData.instagramUrl || null,
              facebookUrl: shopData.facebookUrl || null,
              privacyPolicy: shopData.privacyPolicy || "",
              termsConditions: shopData.termsConditions || ""
            });
          }
        } else {
          setTenantBarber({
            ...data,
            businessType: data.businessType || "barber",
            businessName: data.businessName || data.displayName || "Premium Space",
            businessLogo: data.businessLogo || data.logoUrl || data.logo,
            brandColor: data.brandColor || "#C9A84C"
          });
        }
        lastIdentifiedId.current = targetId || hostname;
      } else if (!isAuthPath) {
        // Only clear if we aren't on an auth path
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

  // Dynamic system style overrides matching the tenant's chosen category profile 
  const dynamicTheme = useMemo(() => {
    const selectedColor = tenantBarber?.brandColor || "#C9A84C";
    return createTheme({
      palette: {
        primary: { main: "#1A1A1A" },
        secondary: { main: selectedColor },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              // Smooth dynamic accent coloring based on tenant profile colors
              selection: { background: selectedColor, color: "#FFFFFF" }
            }
          }
        }
      }
    });
  }, [tenantBarber]);

  const isDashboard = location.pathname.startsWith('/dashboard');

  // Compute clean title dynamically for the custom browser tab domain name context
  const computedPageTitle = useMemo(() => {
    if (tenantBarber) {
      return `${tenantBarber.businessName.toUpperCase()} | Booking Portal`;
    }
    return "Book-eh-Trim | The Multi-Industry Appointment Booking Network";
  }, [tenantBarber]);

  if (isFetchingTenant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#000" }}>
        <CircularProgress sx={{ color: tenantBarber?.brandColor || "#C9A84C" }} />
      </Box>
    );
  }

  // Determine whether the current route uses a custom design template layout that should bypass default UI bars
  const isAlternativeBookingLayout = location.pathname.includes("/pt-booking/");

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      
      {/* Dynamic Browser Metadata Node */}
      <Helmet>
        <title>{computedPageTitle}</title>
      </Helmet>

      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {!isDashboard && !isAlternativeBookingLayout && (
          tenantBarber ? (
            <TenantNav 
              key={`nav-${location.pathname}`} 
              tenant={tenantBarber} 
              businessType={tenantBarber.businessType} 
            /> 
          ) : (
            <Nav isMainSite={true} platformName="Book-eh-Trim" />
          )
        )}

        <Box component="main" sx={{ flex: 1 }}>
          <Routes>
            <Route 
              path="/" 
              element={
                (!isPlatformDomain && tenantBarber) ? (
                  tenantBarber.businessType && tenantBarber.businessType !== "barber" ? (
                    <PTBookingSite barber={tenantBarber} profile={tenantBarber} />
                  ) : (
                    <TenantHome tenant={tenantBarber} />
                  )
                ) : (
                  <Home />
                )
              } 
            />
            <Route path="/shop/:tenantId" element={<TenantHome tenant={tenantBarber} />} />
            <Route path="/pt-booking/:tenantId" element={<PTBookingSite barber={tenantBarber} profile={tenantBarber} />} />
            <Route path="/barber/:id" element={<BarberProfile tenant={tenantBarber} />} />
            <Route path="/book/:barberId/:slotId" element={<BookingForm />} />
            <Route path="/confirmation/:bookingId?" element={<Confirmation />} />
            <Route path="/review/:shopId" element={<ReviewPage />} />
            <Route path="/login" element={tenantBarber ? <TenantLogin tenant={tenantBarber} /> : <Login />} />
            <Route path="/signup" element={tenantBarber ? <TenantSignup tenant={tenantBarber} /> : <Signup />} />
            <Route path="/cancel-booking/:bookingId" element={<CancelBooking />} />
            <Route path="/dashboard/*" element={<BarberRoute><Dashboard onProfileUpdate={identifyTenant} /></BarberRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>

        {!isDashboard && !isAlternativeBookingLayout && (
          tenantBarber ? (
            <TenantFooter 
              key={`footer-${location.pathname}`} 
              tenant={tenantBarber} 
              businessType={tenantBarber.businessType} 
            />
          ) : (
            <Footer isMainSite={true} />
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