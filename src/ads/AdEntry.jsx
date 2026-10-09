import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import AdLandingPage from '../pages/AdLandingPage.jsx';
import CookieConsent from '../components/CookieConsent.jsx';
const theme = createTheme({ palette: { primary: { main: '#2563EB' } }, typography: { fontFamily: 'Arial, sans-serif' } });
function AdRoute() {
  const location = useLocation();
  const isAd = location.pathname.startsWith("/go/");
  useEffect(() => { if (!isAd) window.location.reload(); }, [isAd]);
  return isAd ? <><AdLandingPage/><CookieConsent/></> : null;
}
export default function AdEntry() {
  return <HelmetProvider><ThemeProvider theme={theme}><CssBaseline/><BrowserRouter><AdRoute/></BrowserRouter></ThemeProvider></HelmetProvider>;
}
