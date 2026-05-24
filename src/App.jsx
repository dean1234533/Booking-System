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
import PTBookingSite     from "./pages/PTBookingSite";
import DecoratorTemplate from "./pages/DecoratorTemplate"; // 🌟 ADDED IMPORT

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
    const shopMatch = matchPath("/shop/:tenantId", path);
    const ptMatch = matchPath("/pt-booking/:tenantId", path);
    const barberMatch = matchPath("/barber/:id", path);
    const bookingMatch = matchPath("/book/:barberId/*", path);
    const reviewMatch = matchPath("/review/:shopId", path);
    
    const isAuthPath = matchPath("/login", path) || matchPath("/signup", path);

    const targetId = 
      shopMatch?.params.tenantId || 
      ptMatch?.params.tenantId ||
      barberMatch?.params.id || 
      bookingMatch?.params.barberId || 
      reviewMatch?.params.shopId;

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
        primary: { main: "#1A1A1A" },
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

  const isDashboard = location.pathname.startsWith('/dashboard');

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

  const isAlternativeBookingLayout = 
    location.pathname.includes("/pt-booking/") || 
    location.pathname.includes("/decorator/") ||
    (tenantBarber && tenantBarber.businessType && tenantBarber.businessType !== "barber" && !isPlatformDomain);

  // Helper to choose the right component based on business type
  const renderTenantHome = (tenant) => {
    if (tenant.businessType === "trainer") return <PTBookingSite barber={tenant} profile={tenant} />;
    if (tenant.businessType === "decorator") return <DecoratorTemplate tenantData={tenant} />;
    return <TenantHome tenant={tenant} />;
  };

  return (
    <ThemeProvider theme={dynamicTheme}>
      <CssBaseline />
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
            <Route path="/" element={(!isPlatformDomain && tenantBarber) ? renderTenantHome(tenantBarber) : <Home />} />
            <Route path="/shop/:tenantId" element={tenantBarber ? renderTenantHome(tenantBarber) : <TenantHome tenant={tenantBarber} />} />
            <Route path="/pt-booking/:tenantId" element={<PTBookingSite barber={tenantBarber} profile={tenantBarber} />} />
            <Route path="/decorator/:tenantId" element={<DecoratorTemplate tenantData={tenantBarber} />} />
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