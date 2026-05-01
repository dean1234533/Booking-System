import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  Box,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase/config";

// ─── Pages ────────────────────────────────────────────────────────────────────
import Home from "./pages/Home";
import BarberProfile from "./pages/BarberProfile";
import BookingForm from "./pages/BookingForm";
import Confirmation from "./pages/Confirmation";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// ─── Components ───────────────────────────────────────────────────────────────
import Nav from "./components/Nav";

// ─── Auth Context ─────────────────────────────────────────────────────────────
// Only barbers have accounts. Provides { barber, loading } to the whole app.
// barber is the Firebase user object, or null if not signed in.
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ─── MUI Theme ────────────────────────────────────────────────────────────────
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1A1A1A",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#C9A84C",       // gold — premium barber shop feel
      contrastText: "#1A1A1A",
    },
    background: {
      default: "#F7F5F2",    // warm off-white
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#6B6B6B",
    },
    error:   { main: "#D32F2F" },
    success: { main: "#2E7D32" },
    warning: { main: "#C9A84C" },
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.03em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 600, letterSpacing: "-0.01em" },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 24px",
          fontSize: "0.95rem",
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
          borderRadius: 14,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: 8 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});

// ─── Barber Protected Route ───────────────────────────────────────────────────
// Wraps any route that requires a signed-in barber.
// Unauthenticated users are sent to /login.
function BarberRoute({ children }) {
  const { barber, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!barber) {
    // Preserve the route they were trying to reach so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ─── Barber Already Signed In Route ──────────────────────────────────────────
// Prevents signed-in barbers from seeing /login or /signup.
// Redirects them straight to their dashboard.
function BarberPublicRoute({ children }) {
  const { barber, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (barber) return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />

      <Box component="main" sx={{ flex: 1 }}>
        <Routes>

          {/* ── Fully public — no account needed ──────────────────── */}

          {/* Shop homepage — grid of all barber cards */}
          <Route path="/" element={<Home />} />

          {/* Individual barber profile — bio, availability, slot picker */}
          <Route path="/barber/:id" element={<BarberProfile />} />

          {/* Booking form — client details + Stripe deposit (no account needed) */}
          <Route path="/book/:slotId" element={<BookingForm />} />

          {/* Confirmation screen after successful deposit payment */}
          <Route path="/confirmation/:bookingId" element={<Confirmation />} />

          {/* ── Barber auth pages — redirect to dashboard if already signed in ── */}

          <Route
            path="/login"
            element={
              <BarberPublicRoute>
                <Login />
              </BarberPublicRoute>
            }
          />

          <Route
            path="/signup"
            element={
              <BarberPublicRoute>
                <Signup />
              </BarberPublicRoute>
            }
          />

          {/* ── Barber only — must be signed in ───────────────────── */}

          {/* Dashboard — manage availability, view bookings, edit profile,
              set deposit amount, reopen cancelled slots */}
          <Route
            path="/dashboard"
            element={
              <BarberRoute>
                <Dashboard />
              </BarberRoute>
            }
          />

          {/* ── Fallback ──────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Box>
    </Box>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [barber, setBarber] = useState(null);   // Firebase user object or null
  const [loading, setLoading] = useState(true); // true until auth state is known

  useEffect(() => {
    // Firebase Auth listener — fires immediately with current state,
    // then again whenever a barber signs in or out.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Verify this user exists in the barbers collection.
        // Prevents any non-barber Firebase user from accessing the dashboard.
        try {
          const barberDoc = await getDoc(doc(db, "barbers", firebaseUser.uid));
          if (barberDoc.exists()) {
            setBarber(firebaseUser);
          } else {
            // Firebase user exists but no barber profile — treat as signed out
            setBarber(null);
          }
        } catch (err) {
          console.error("Failed to verify barber profile:", err);
          setBarber(null);
        }
      } else {
        setBarber(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ barber, loading }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppShell />
        </Router>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}