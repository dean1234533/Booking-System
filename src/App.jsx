import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Home          from "./pages/Home";
import BarberProfile from "./pages/BarberProfile";
import BookingForm   from "./pages/BookingForm";
import Confirmation  from "./pages/Confirmation";
import Dashboard     from "./pages/Dashboard";
import Login         from "./pages/Login";
import Signup        from "./pages/Signup";
import CancelBooking from "./pages/CancelBooking"; // 1. IMPORT NEW PAGE
import Nav           from "./components/Nav";

const theme = createTheme({
  palette: {
    primary: { main: "#1A1A1A" },
    secondary: { main: "#C9A84C" },
    background: { default: "#F7F5F2" },
  },
});

function BarberRoute({ children }) {
  const { barber, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (!barber) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function BarberPublicRoute({ children }) {
  const { barber, loading } = useAuth();
  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  if (barber)  return <Navigate to="/dashboard" replace />;
  return children;
}

function AppShell() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav />
      <Box component="main" sx={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/barber/:id" element={<BarberProfile />} />
          <Route path="/book/:barberId/:slotId" element={<BookingForm />} />
          
          {/* 2. CANCEL BOOKING ROUTE (Matches the email link) */}
          <Route path="/cancel-booking" element={<CancelBooking />} />
          
          {/* 3. UPDATED CONFIRMATION: Made ID optional so navigate("/confirmation") still works */}
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/confirmation/:bookingId" element={<Confirmation />} />

          <Route path="/login" element={<BarberPublicRoute><Login /></BarberPublicRoute>} />
          <Route path="/signup" element={<BarberPublicRoute><Signup /></BarberPublicRoute>} />
          <Route path="/dashboard" element={<BarberRoute><Dashboard /></BarberRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppShell />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}