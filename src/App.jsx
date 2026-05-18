import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, matchPath } from "react-router-dom";
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HelmetProvider } from 'react-helmet-async';

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

// Split Nav & Footer imports
import Nav               from "./components/Nav";
import TenantNav          from "./components/TenantNav"; 
import Footer            from "./components/Footer";
import TenantFooter       from "./components/TenantFooter"; 

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

  const platformDomains = ['bookehtrim.co.uk', 'www.bookehtrim.co.uk', 'localhost'];
  const isPlatformDomain = platformDomains.includes(hostname);

  const identifyTenant = useCallback(async () => {
    const path = location.pathname;
    const shopMatch = matchPath("/shop/:tenantId", path);
    const barberMatch = matchPath("/barber/:id", path);
    const bookingMatch = matchPath("/book/:barberId/*", path);
    const reviewMatch = matchPath("/review/:shopId", path);
    
    // Detect if we are on login or signup to preserve context
    const isAuthPath = matchPath("/login", path) || matchPath("/signup", path);

    const targetId = 
      shopMatch?.params.tenantId || 
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
              businessName: shopData.businessName || shopData.displayName || "Premium Shop",
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
            businessName: data.businessName || data.displayName || "Premium Shop",
            businessLogo: data.businessLogo || data.logoUrl || data.logo,
          });
        }
        lastIdentifiedId.current = targetId;
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

  const dynamicTheme = useMemo(() => createTheme({
    palette: {
      primary: { main: "#1A1A1A" },
      secondary: { main: tenantBarber?.brandColor || "#C9A84C" },
    },
    shape: { borderRadius: 12 }
  }), [tenantBarber]);

  const isDashboard = location.pathname.startsWith('/dashboard');

  if (isFetchingTenant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#000" }}>
        <CircularProgress sx={{ color: "#C9A84C" }} />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {!isDashboard && (
          tenantBarber ? (
            <TenantNav key={`nav-${location.pathname}`} tenant={tenantBarber} /> 
          ) : (
            <Nav isMainSite={true} platformName="Book-eh-Trim" />
          )
        )}

        <Box component="main" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={(!isPlatformDomain && tenantBarber) ? <TenantHome tenant={tenantBarber} /> : <Home />} />
            <Route path="/shop/:tenantId" element={<TenantHome tenant={tenantBarber} />} />
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

        {!isDashboard && (
          tenantBarber ? (
            <TenantFooter key={`footer-${location.pathname}`} tenant={tenantBarber} />
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