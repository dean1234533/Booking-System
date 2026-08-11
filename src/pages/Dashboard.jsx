import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box, Snackbar, CircularProgress, Typography, Button, Paper,
  useMediaQuery, useTheme, ThemeProvider, createTheme, Badge,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import {
  AccessTime as AccessTimeIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  ListAlt as ListIcon,
  Payments as PaymentsIcon,
  Palette as PaletteIcon,
  Nfc as NfcIcon,
  Language as LanguageIcon,
  AutoAwesome as AutoAwesomeIcon,
  Extension as ExtensionIcon,
  People as PeopleIcon,
  ColorLens as ColorLensIcon,
  RequestQuote as RequestQuoteIcon,
  Today as TodayIcon,
  ContentCut as ContentCutIcon,
  NotificationsActive as NotificationsActiveIcon,
  ReceiptLong as ReceiptLongIcon,
  Reviews as ReviewsIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

import imageCompression from "browser-image-compression";
import { useAuth }      from "../hooks/useAuth";
import { useNavigate }  from "react-router-dom";

import {
  updateBarber, addSlot, getProfessionalSlots,
  deleteSlot, uploadBarberImage,
} from "../firebase/firestore";
import { deleteBarberAccountData } from "../utils/deleteHelper";
import { getBarberEmail, getStoredFee } from "../utils/bookingHelpers";

import {
  collection, getDocs, doc, query, where,
  getDoc, updateDoc, deleteDoc, setDoc, onSnapshot, orderBy, limit,
} from "firebase/firestore";
import { db } from "../firebase/config";

// ── Sub-components ────────────────────────────────────────────────────────────
import DashboardHeader     from "../components/dashboard/DashboardHeader";
import DashboardTabBar     from "../components/dashboard/DashboardTabBar";
import PWAInstallBanner    from "../components/dashboard/PWAInstallBanner";
import OfflineIndicator    from "../components/dashboard/OfflineIndicator";
import ManualBookingDialog from "../components/dashboard/ManualBookingDialog";
import ScheduleTab  from "../components/dashboard/tabs/ScheduleTab";
import BookingsTab  from "../components/dashboard/tabs/BookingsTab";
import ProfileTab   from "../components/dashboard/tabs/ProfileTab";
import EditPageTab  from "../components/dashboard/tabs/EditPageTab";
import ServicesTab  from "../components/dashboard/tabs/ServicesTab";
import FinanceTab   from "../components/dashboard/tabs/FinanceTab";
import ReviewsTab   from "../components/dashboard/tabs/ReviewsTab";
import DesignTab    from "../components/dashboard/tabs/DesignTab";
import PayTab       from "../components/dashboard/tabs/PayTab";
import DomainTab    from "../components/dashboard/tabs/DomainTab";
// ── Trainer-only tabs ──
import ClientProfileTab    from "../components/dashboard/tabs/ClientProfileTab";
// ── Decorator + barber-specific tabs ──
import ColourApprovalTab   from "../components/dashboard/tabs/ColourApprovalTab";
import QuoteTab            from "../components/dashboard/tabs/QuoteTab";
import DayPlannerTab       from "../components/dashboard/tabs/DayPlannerTab";
import QueueManagementTab  from "../components/dashboard/tabs/QueueManagementTab";
import HaircutTab          from "../components/dashboard/tabs/HaircutTab";
// ── Hairdresser-specific tabs ──
import InvoiceTab               from "../components/dashboard/tabs/InvoiceTab";
import PTInvoiceTab             from "../components/dashboard/tabs/PTInvoiceTab";
import NotificationSettingsTab  from "../components/dashboard/tabs/NotificationSettingsTab";
import PTAvailabilityTab        from "../components/dashboard/tabs/PTAvailabilityTab";
import IntegrationsTab          from "../components/dashboard/tabs/IntegrationsTab";
import { checkOutlookAvailability, getOutlookTokens } from "../firebase/outlook";

// ── Helpers ───────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{
        bgcolor: "#ffffff",
        borderRadius: "18px",
        border: "1px solid #ececf0",
        boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.05)",
        p: { xs: 2.25, md: 4 },
      }}>
        {children}
      </Box>
    </Box>
  );
}

const addDays = (dateStr, days) => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ tenant: initialTenant = null }) {
  const { barber, logout, loading: authLoading } = useAuth();
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down("sm"));

  // ── Notification unread count ─────────────────────────────────────────────
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  useEffect(() => {
    const uid = barber?.uid;
    if (!uid) return;
    const q = query(
      collection(db, "barbers", uid, "notifications"),
      where("read", "==", false),
      limit(99),
    );
    return onSnapshot(q, snap => setUnreadNotifs(snap.size));
  }, [barber?.uid]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState(0);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [stripeLoading,setStripeLoading]= useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [toast,        setToast]        = useState(null);

  // ── Data state ────────────────────────────────────────────────────────────
  const [userRole, setUserRole] = useState({ isOwner: true, shopId: null });
  const [profile,  setProfile]  = useState({
    name: "", businessName: "", brandColor: "#C9A84C",
    services: [], depositAmount: 10,
    specialty: "", address: "", bio: "", role: "staff",
    openingHours: "", vercelUrl: "", customDomain: "", aboutUs: "",
    profilePic: "", logoUrl: "", heroImage: "", heroImageMobile: "",
    stripeConnected: false,
    // ── Social links — editable by ALL barbers (staff + owners) ──
    instagramUrl: "", tiktokUrl: "", facebookUrl: "",
    privacyPolicy: "", termsConditions: "",
    domainStatus: "",
    customHostnameId: "",
  });

  const [reviews,     setReviews]     = useState([]);
  const [bookings,    setBookings]    = useState([]);
  const [slots,        setSlots]       = useState([]);
  const [newSlot,      setNewSlot]     = useState({
    date: new Date().toISOString().split("T")[0], time: "", repeat: "none"
  });
  const [newService, setNewService]   = useState({ name: "", price: "" });

  // ── Manual booking dialog ─────────────────────────────────────────────────
  const [manualDialogOpen,      setManualDialogOpen]      = useState(false);
  const [selectedSlotForManual, setSelectedSlotForManual] = useState(null);

  // ── Image previews ────────────────────────────────────────────────────────
  const [profileFile,        setProfileFile]        = useState(null);
  const [profilePreview,      setProfilePreview]     = useState("");
  const [logoFile,            setLogoFile]           = useState(null);
  const [logoPreview,        setLogoPreview]        = useState("");
  const [heroFileDesktop,    setHeroFileDesktop]    = useState(null);
  const [heroPreviewDesktop, setHeroPreviewDesktop] = useState("");
  const [heroFileMobile,      setHeroFileMobile]     = useState(null);
  const [heroPreviewMobile,  setHeroPreviewMobile]  = useState("");

  // ── Tap-to-Pay state ──────────────────────────────────────────────────────
  const [terminalAmount,  setTerminalAmount]  = useState("");
  const [terminalService, setTerminalService] = useState("");
  const [terminalNote,    setTerminalNote]    = useState("");
  const [terminalStatus,  setTerminalStatus]  = useState("idle");
  const [terminalSession, setTerminalSession] = useState(null);
  const pollingRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);
  useEffect(() => { if (!authLoading && barber) loadData(); }, [barber, authLoading]);

  // Handle post-Stripe-connect redirect
  useEffect(() => {
    if (!barber?.uid) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripeSuccess") !== "true") return;
    window.history.replaceState({}, "", "/dashboard");
    const acct = params.get("acct");
    (async () => {
      try {
        if (acct && acct !== "undefined") {
          await updateDoc(doc(db, "barbers", barber.uid), { stripeAccountId: acct });
        }
        const res  = await fetch(`/api/check-stripe?userId=${barber.uid}`);
        const data = await res.json();
        if (data.connected) {
          setProfile(prev => ({ ...prev, stripeConnected: true }));
          setToast("🎉 Stripe connected!");
        }
      } catch (e) { console.error("Post-Stripe return check failed:", e); }
    })();
  }, [barber]);

  // ── Jump to tab from ?tab= query param (e.g. after onboarding) ───────────
  useEffect(() => {
    if (dataLoading) return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (!tabParam) return;
    window.history.replaceState({}, "", "/dashboard");
    const map = {
      domain:   userRole.isOwner && !initialTenant ? 7 : -1,
      finance:  4,
      design:   userRole.isOwner ? 6 : -1,
      reviews:  userRole.isOwner ? 5 : -1,
    };
    const idx = map[tabParam] ?? -1;
    if (idx >= 0) setTab(idx);
  }, [dataLoading]);

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadData() {
    if (!barber?.uid) return;
    try {
      setDataLoading(true);
      const userSnap = await getDoc(doc(db, "barbers", barber.uid));
      let isOwner = true;
      let activeShopId = barber.uid;

      if (userSnap.exists()) {
        const data = userSnap.data();
        isOwner      = data?.role === "owner" || !data?.shopId || data?.shopId === "self";
        activeShopId = isOwner ? barber.uid : (data?.shopId ?? barber.uid);
        setProfile(prev => ({
          ...prev, ...data,
          services:         Array.isArray(data.services) ? data.services : [],
          stripeConnected:  !!data.stripeConnected,
          instagramUrl:     data.instagramUrl     || "",
          tiktokUrl:        data.tiktokUrl        || "",
          facebookUrl:      data.facebookUrl      || "",
          domainStatus:     data.domainStatus     || "",
          customHostnameId: data.customHostnameId || "",
        }));
      }
      setUserRole({ isOwner, shopId: activeShopId });

      const bSnap = await getDocs(
        query(collection(db, "bookings"), where("barberId", "==", barber.uid))
      );
      const allB = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(allB.filter(b => b.status !== "completed" && b.status !== "cancelled"));

      const mySlots = await getProfessionalSlots(barber.uid);
      setSlots(mySlots || []);

      if (isOwner) {
        try {
          const rSnap = await getDocs(collection(db, "barbers", activeShopId, "reviews"));
          setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch { setReviews([]); }
      }
    } catch { setToast("Error loading dashboard data"); }
    finally  { setDataLoading(false); }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await logout(); navigate("/login"); }
    catch { setToast("Logout failed"); }
  };

  // ── Profile ───────────────────────────────────────────────────────────────
  const handleDeleteProfile = async () => {
    if (!window.confirm(
      "Are you sure? This will PERMANENTLY delete your profile, all available slots, and your login account. This cannot be undone."
    )) return;
    try {
      setDataLoading(true);
      await deleteBarberAccountData(barber.uid);
      setToast("Account and all associated data successfully wiped.");
      navigate("/");
    } catch (err) {
      setToast(
        err.code === "auth/requires-recent-login"
          ? "Security: Please log out and back in before deleting your account."
          : "Failed to delete profile: " + err.message
      );
    } finally { setDataLoading(false); }
  };

  const handleImageChange = (e, setFile, setPreview) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  async function handleSaveProfile() {
    if (!barber?.uid) return;
    setUploading(true);
    try {
      let updatedData = {
        ...profile,
        email:        barber.email         || "",
        vercelUrl:    profile.vercelUrl     || "",
        customDomain: profile.customDomain  || "",
        openingHours: profile.openingHours  || "",
        aboutUs:      profile.aboutUs       || "",
        // ── Social links — persisted for both staff and owners ──
        instagramUrl: profile.instagramUrl  || "",
        tiktokUrl:    profile.tiktokUrl     || "",
        facebookUrl:  profile.facebookUrl   || "",
      };
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
      if (profileFile)    { const c = await imageCompression(profileFile, options);     updatedData.profilePic      = await uploadBarberImage(c, barber.uid, "profile_pic"); }
      if (logoFile)       { const c = await imageCompression(logoFile, options);        updatedData.logoUrl         = await uploadBarberImage(c, barber.uid, "business_logo"); }
      if (heroFileDesktop){ const c = await imageCompression(heroFileDesktop, options); updatedData.heroImage       = await uploadBarberImage(c, barber.uid, "hero_banner_desktop"); }
      if (heroFileMobile) { const c = await imageCompression(heroFileMobile, options);  updatedData.heroImageMobile = await uploadBarberImage(c, barber.uid, "hero_banner_mobile"); }

      // Always write to the barber's own top-level doc
      await updateBarber(barber.uid, updatedData);

      // For staff: also write to the staff subcollection so BarberProfile can read it
      if (!userRole.isOwner && userRole.shopId) {
        await updateDoc(
          doc(db, "barbers", userRole.shopId, "staff", barber.uid),
          updatedData
        );
      }

      setProfile(updatedData);
      setProfileFile(null); setLogoFile(null); setHeroFileDesktop(null); setHeroFileMobile(null);
      setProfilePreview(""); setLogoPreview(""); setHeroPreviewDesktop(""); setHeroPreviewMobile("");
      setToast("Profile saved successfully!");
    } catch (err) { setToast("Save failed — " + err.message); }
    finally { setUploading(false); }
  }

  // ── Slots ─────────────────────────────────────────────────────────────────
  async function handleAddSlot() {
    if (!newSlot.date || !newSlot.time || !barber?.uid) return;
    try {
      // Check Outlook calendar if connected — block slot if user is busy
      const outlookTokens = await getOutlookTokens(barber.uid);
      if (outlookTokens?.accessToken) {
        // Use longest service duration so we never overlap a running appointment
        const maxDuration = profile.services?.length
          ? Math.max(...profile.services.map(s => Number(s.duration) || 60))
          : 60;
        const { available, conflict } = await checkOutlookAvailability(barber.uid, newSlot.date, newSlot.time, maxDuration);
        if (!available) {
          setToast(`Blocked — "${conflict}" is in your Outlook calendar and could overlap this ${maxDuration}-min slot.`);
          return;
        }
      }

      let iterations = 1;
      if (newSlot.repeat === "week")  iterations = 7;
      if (newSlot.repeat === "month") iterations = 30;
      await Promise.all(
        Array.from({ length: iterations }, (_, i) =>
          addSlot({
            date:     addDays(newSlot.date, i),
            time:     newSlot.time,
            barberId: barber.uid,
            shopId:   userRole.shopId,
            isBooked: false,
            status:   "open",
          })
        )
      );
      setNewSlot(prev => ({ ...prev, time: "", repeat: "none" }));
      setToast(iterations > 1 ? `Added ${iterations} slots!` : "Slot added!");
      setSlots(await getProfessionalSlots(barber.uid) || []);
    } catch { setToast("Failed to add slot"); }
  }

  async function handleDeleteSlot(slotId) {
    if (!barber?.uid) return;
    try {
      await deleteSlot(barber.uid, slotId);
      setToast("Slot removed");
      setSlots(await getProfessionalSlots(barber.uid) || []);
    } catch { setToast("Failed to remove slot"); }
  }

  async function handleRestoreSlot(slotId) {
    try {
      await updateDoc(doc(db, "slots", slotId), { isBooked: false, status: "open" });
      setToast("Slot restored!");
      setSlots(await getProfessionalSlots(barber.uid) || []);
    } catch { setToast("Failed to restore slot"); }
  }

  // ── Bookings ──────────────────────────────────────────────────────────────
  async function handleCompleteBooking(booking) {
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "completed" });
      if (booking.slotId) {
        await updateDoc(doc(db, "slots", booking.slotId), {
          isBooked:        false,
          status:          "open",
          manualBookingId: null,
        });
      }
      setToast("✅ Booking completed — slot is available again.");
      await loadData();
    } catch { setToast("Error completing booking."); }
  }

  async function handleCancelBooking(booking) {
    if (!window.confirm(
      `Are you sure you want to cancel ${booking.customerName || "this"} booking?` +
      " This will trigger an automatic refund if applicable."
    )) return;
    try {
      setDataLoading(true);
      if (booking.paymentIntentId) {
        try {
          const r = await fetch("/api/cancel-refund", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentIntentId: booking.paymentIntentId,
              stripeAccountId: userRole.shopId || booking.stripeAccountId || barber.uid,
              date: booking.date,
              time: booking.time,
            }),
          });
          const result = await r.json();
          if (!r.ok) setToast(`Stripe Refund Warning: ${result.error || "Failed to process automatic refund."}`);
        } catch (e) { console.error("[handleCancelBooking] Stripe error:", e); }
      }
      await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled" });
      if (booking.slotId) {
        try { await deleteDoc(doc(db, "slots", booking.slotId)); } catch {}
      }
      setToast("Booking successfully cancelled.");
      await loadData();
    } catch (err) {
      console.error("Cancel booking failure:", err);
      setToast("Failed to process full cancellation routing.");
    } finally { setDataLoading(false); }
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "barbers", userRole.shopId, "reviews", reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setToast("Review deleted.");
    } catch (err) {
      console.error("[handleDeleteReview]", err);
      setToast("Failed to delete review.");
    }
  }

  // ── Services ──────────────────────────────────────────────────────────────
  function handleAddService() {
    if (!newService.name || !newService.price) return;
    setProfile(prev => ({
      ...prev,
      services: [...(prev.services || []), { name: newService.name, price: Number(newService.price) }],
    }));
    setNewService({ name: "", price: "" });
  }
  function handleRemoveService(i) {
    setProfile(prev => ({ ...prev, services: prev.services.filter((_, idx) => idx !== i) }));
  }

  // ── Manual booking ────────────────────────────────────────────────────────
  function openManualBooking(slot) { setSelectedSlotForManual(slot); setManualDialogOpen(true); }

  // ── Stripe connect ────────────────────────────────────────────────────────
  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const domainField   = profile.customDomain || profile.vercelUrl || "";
      const currentOrigin = domainField
        ? (domainField.startsWith("http") ? domainField : `https://${domainField}`)
        : window.location.origin;
      const res  = await fetch("/api/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: barber.uid, email: barber.email, origin: currentOrigin }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch (err) { setToast("Stripe failed: " + err.message); }
    finally { setStripeLoading(false); }
  };

  // ── Tap-to-Pay ────────────────────────────────────────────────────────────
  const startPolling = (sessionId) => {
    if (!sessionId || sessionId === "undefined") return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/check-payment?sessionId=${sessionId}&barberId=${barber.uid}`);
        const data = await res.json();
        if (data.paid) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setTerminalStatus("paid");
          setToast("✅ Payment received!");
        }
      } catch (err) { console.warn("Polling error:", err); }
    }, 2500);
  };

  const handleCreateTerminalCharge = async () => {
    if (!terminalAmount || !barber?.uid) return;
    if (!profile.stripeConnected) { setToast("Connect Stripe first in the Finance tab."); return; }
    setTerminalStatus("loading");
    try {
      const res  = await fetch("/api/quick-charge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:      Math.round(Number(terminalAmount) * 100),
          currency:    "gbp",
          description: terminalService || terminalNote || "Haircut",
          barberId:    barber.uid,
          barberName:  profile.name || profile.businessName || "Barber",
          note:        terminalNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create charge");
      setTerminalSession({ url: data.url, sessionId: data.sessionId });
      setTerminalStatus("awaiting");
      startPolling(data.sessionId);
    } catch (err) { setTerminalStatus("error"); setToast("Payment error: " + err.message); }
  };

  const handleCancelTerminal = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setTerminalStatus("idle"); setTerminalSession(null);
  };

  const handleResetTerminal = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setTerminalStatus("idle"); setTerminalSession(null);
    setTerminalAmount(""); setTerminalService(""); setTerminalNote("");
  };

  const handleCopyPayLink = async () => {
    if (!terminalSession?.url) return;
    try { await navigator.clipboard.writeText(terminalSession.url); setToast("Payment link copied!"); }
    catch { setToast("Copy failed — try manually."); }
  };

  // ── Trial / subscription gate ─────────────────────────────────────────────
  function toDateDash(v) {
    if (!v) return null;
    if (v?.toDate) return v.toDate();
    return new Date(v);
  }
  const subStatus   = profile.subscriptionStatus || "trialing";
  const trialEndDate = toDateDash(profile.trialEndsAt);
  const isExpiredTrial = subStatus === "trialing" && trialEndDate && trialEndDate < new Date();
  const isBlocked   = isExpiredTrial || subStatus === "past_due" || subStatus === "canceled";

  // ── Tab config ────────────────────────────────────────────────────────────
  // NOTE: Domain tab is intentionally excluded for staff — only owners see it.
  const brandColor      = profile.brandColor || "#C9A84C";
  const isTrainer       = profile.businessType === "trainer";
  const isDecorator     = profile.businessType === "decorator";
  const isHairdresser   = profile.businessType === "hairdresser";
  const isBarber        = !profile.businessType || profile.businessType === "barber";
  const businessTypeLabel = isTrainer ? "Personal Trainer"
    : isDecorator ? "Decorator"
    : isHairdresser ? "Hairdresser"
    : "Barber";

  // ── Scoped, professional light theme for the whole dashboard ────────────────
  // Refines cards, buttons, inputs and typography for a cohesive, polished look.
  // Theme defaults only — any tab that sets its own styles via `sx` still wins.
  const dashTheme = useMemo(() => createTheme({
    palette: {
      mode: "light",
      primary:    { main: brandColor },
      background: { default: "#F6F7F9", paper: "#ffffff" },
      text:       { primary: "#16181d", secondary: "#6b7280" },
      divider:    "#ececf0",
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'DM Sans','Plus Jakarta Sans','Inter',system-ui,sans-serif",
      button: { textTransform: "none", fontWeight: 700, letterSpacing: "0.01em" },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 700 },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none", border: "1px solid #ededf1", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { borderRadius: 14, border: "1px solid #ededf1", boxShadow: "0 1px 3px rgba(16,24,40,0.06)" } },
      },
      MuiButton: {
        styleOverrides: { root: { borderRadius: 10, boxShadow: "none", paddingInline: 18, "&:hover": { boxShadow: "none" } } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  }), [brandColor]);

  // Previously these tools were gated to the installed PWA only, but standalone
  // detection is unreliable across install/launch scenarios and was hiding the
  // owner's own client-management tabs inside the app. They are login-protected
  // owner tools, so always show them (web + installed app alike).
  const isPWA = true;

  // Trainer-only tabs — client-related tools are PWA-only; web shows nothing client-facing.
  const trainerTabs = isTrainer ? [
    { key: "pt-invoices",     label: "Invoices",     icon: <ReceiptLongIcon /> },
    ...(isPWA ? [
      { key: "clients", label: "Clients", icon: <PeopleIcon /> },
    ] : []),
  ] : [];

  const decoratorTabs = isDecorator ? [
    { key: "colourapproval", label: "Colour",   icon: <ColorLensIcon /> },
    { key: "quote",          label: "Quotes",   icon: <RequestQuoteIcon /> },
    { key: "dayplanner",     label: "Day Plan", icon: <TodayIcon /> },
    { key: "dec-invoices",   label: "Invoices", icon: <ReceiptLongIcon /> },
  ] : [];

  const hairdresserTabs = [];

  const barberTabs = isBarber ? [
    { key: "queue",   label: "Queue",   icon: <PeopleIcon /> },
    { key: "haircut", label: "Haircut", icon: <ContentCutIcon /> },
  ] : [];

  const tabs = [
    { key: "schedule",      label: "Schedule", icon: <AccessTimeIcon /> },
    { key: "bookings",      label: "Bookings", icon: <StoreIcon /> },
    { key: "edit-page",     label: "Profile",  icon: <PersonIcon /> },
    ...(!isTrainer ? [{ key: "services", label: "Services", icon: <ListIcon /> }] : []),
    { key: "finance",       label: "Finance",  icon: <PaymentsIcon /> },
    ...(userRole.isOwner ? [{ key: "reviews", label: "Reviews", icon: <ReviewsIcon /> }]  : []),
    ...(userRole.isOwner ? [{ key: "design",    label: "Design",    icon: <PaletteIcon /> }]  : []),
    ...(userRole.isOwner && !initialTenant ? [{ key: "domain", label: "Domain", icon: <LanguageIcon /> }] : []),
    { key: "pay",           label: "Pay",      icon: <NfcIcon /> },
    { key: "notifications",  label: "Notifications",  icon: <Badge badgeContent={unreadNotifs} color="error" max={99}><NotificationsActiveIcon /></Badge> },
    { key: "integrations",   label: "Integrations",   icon: <ExtensionIcon /> },
    ...trainerTabs,
    ...decoratorTabs,
    ...hairdresserTabs,
    ...barberTabs,
  ];
  const tabIdx = (key) => tabs.findIndex((t) => t.key === key);

  const IDX_FINANCE = tabIdx("finance");
  const IDX_REVIEWS = tabIdx("reviews");
  const IDX_DESIGN  = tabIdx("design");
  const IDX_DOMAIN  = tabIdx("domain");
  const IDX_PAY     = tabIdx("pay");

  // ── Grouped tab nav config (drives DashboardTabBar) ──────────────────────────
  // Items whose tab key isn't in the current tabs array (e.g. PWA-only tabs on web)
  // return index -1 from tabIdx — filter those out so no broken menu entries appear.
  const filterItems = (items) => items.filter(i => i.index !== -1);

  const tabGroups = [
    {
      label: "Booking",
      icon: <AccessTimeIcon />,
      items: filterItems([
        { label: "Schedule", icon: <AccessTimeIcon />, index: 0 },
        { label: "Bookings", icon: <StoreIcon />,      index: 1 },
        ...(isBarber ? [
          { label: "Queue", icon: <PeopleIcon />, index: tabIdx("queue") },
        ] : []),
      ]),
    },
    {
      label: "Clients",
      icon: <PeopleIcon />,
      items: filterItems([
        ...(userRole.isOwner ? [{ label: "Reviews", icon: <ReviewsIcon />, index: IDX_REVIEWS }] : []),
        ...(isTrainer        ? [{ label: "Clients", icon: <PeopleIcon />, index: tabIdx("clients") }] : []),
      ]),
    },
    {
      label: "Website",
      icon: <LanguageIcon />,
      items: filterItems([
        { label: "Profile",  icon: <PersonIcon />,  index: tabIdx("edit-page") },
        ...(!isTrainer ? [{ label: "Services", icon: <ListIcon />, index: tabIdx("services") }] : []),
        ...(userRole.isOwner                   ? [{ label: "Design",    icon: <PaletteIcon />,  index: IDX_DESIGN }] : []),
        ...(userRole.isOwner && !initialTenant ? [{ label: "Domain",    icon: <LanguageIcon />, index: IDX_DOMAIN }] : []),
      ]),
    },
    {
      label: "Money",
      icon: <PaymentsIcon />,
      items: filterItems([
        { label: "Finance", icon: <PaymentsIcon />, index: IDX_FINANCE },
        { label: "Pay",     icon: <NfcIcon />,      index: IDX_PAY },
        ...(isTrainer ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("pt-invoices") },
        ] : isDecorator ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("dec-invoices") },
        ] : []),
      ]),
    },
    // ── Barber tools ──
    ...(isBarber ? [{
      label: "Tools",
      icon: <AutoAwesomeIcon />,
      items: filterItems([
        { label: "Haircut", icon: <ContentCutIcon />, index: tabIdx("haircut") },
      ]),
    }] : []),
    // ── Decorator projects ──
    ...(isDecorator ? [{
      label: "Projects",
      icon: <RequestQuoteIcon />,
      items: filterItems([
        { label: "Colour",   icon: <ColorLensIcon />,    index: tabIdx("colourapproval") },
        { label: "Quotes",   icon: <RequestQuoteIcon />, index: tabIdx("quote") },
        { label: "Day Plan", icon: <TodayIcon />,        index: tabIdx("dayplanner") },
      ]),
    }] : []),
    // ── Settings (all business types) — kept last so it sits at the far right ──
    {
      label: "Settings",
      icon: <NotificationsActiveIcon />,
      items: filterItems([
        { label: "Notifications", icon: <NotificationsActiveIcon />, index: tabIdx("notifications") },
        { label: "Integrations",  icon: <ExtensionIcon />,           index: tabIdx("integrations") },
      ]),
    },
  ];

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (authLoading || (dataLoading && !barber)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // ── Trial expired / subscription lapsed — hard block ─────────────────────
  if (isBlocked) {
    const [subLoading, setSubLoading]       = React.useState(false);
    const [portalLoading, setPortalLoading] = React.useState(false);
    async function goBillingPortal() {
      if (!barber?.uid) return;
      setPortalLoading(true);
      try {
        const res  = await fetch("/api/billing-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ barberId: barber.uid }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch (err) {
        console.error("Billing portal failed:", err.message);
      } finally {
        setPortalLoading(false);
      }
    }
    async function goSubscribe() {
      if (!barber?.uid || !barber?.email) return;
      setSubLoading(true);
      try {
        const res  = await fetch("/api/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            barberId:     barber.uid,
            email:        barber.email,
            businessType: profile.businessType || "barber",
          }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch (err) {
        console.error("Subscription checkout failed:", err.message);
      } finally {
        setSubLoading(false);
      }
    }
    const bc = profile.brandColor || "#C9A84C";
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#F6F7F9",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 460,
            width: "100%",
            p: { xs: 3, md: 5 },
            borderRadius: "20px",
            border: "1.5px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 64, height: 64, borderRadius: "50%",
              bgcolor: "#fef3c7", display: "flex",
              alignItems: "center", justifyContent: "center",
              mx: "auto", mb: 3,
            }}
          >
            <LockIcon sx={{ fontSize: 32, color: "#d97706" }} />
          </Box>

          <Typography variant="h5" fontWeight={800} mb={1}>
            {isExpiredTrial ? "Your free trial has ended" : "Subscription required"}
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={3} lineHeight={1.7}>
            {isExpiredTrial
              ? "Your 90-day free trial has expired. Subscribe to keep full access to your dashboard and all features."
              : "Your subscription is no longer active. Reactivate to regain access to your dashboard."}
          </Typography>

          <Box
            sx={{
              bgcolor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              p: 2.5,
              mb: 3,
              textAlign: "left",
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
              What's included
            </Typography>
            {[
              "Unlimited bookings & scheduling",
              "Client management & messaging",
              "Online payments & invoicing",
              "Custom branding & public page",
              "All future feature updates",
            ].map(f => (
              <Box key={f} sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: bc, flexShrink: 0 }} />
                <Typography variant="body2">{f}</Typography>
              </Box>
            ))}
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={goSubscribe}
            disabled={subLoading}
            sx={{
              borderRadius: "10px",
              fontWeight: 700,
              height: 52,
              boxShadow: "none",
              fontSize: "1rem",
              bgcolor: bc,
              "&:hover": { bgcolor: bc, filter: "brightness(0.9)" },
            }}
          >
            {subLoading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Subscribe & Continue →"}
          </Button>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            You'll be taken to a secure Stripe checkout.
          </Typography>

          {subStatus !== "trialing" && (
            <Button
              fullWidth
              variant="text"
              size="small"
              onClick={goBillingPortal}
              disabled={portalLoading}
              sx={{ mt: 1.5, color: "text.secondary", fontSize: "0.8rem" }}
            >
              {portalLoading ? <CircularProgress size={16} /> : "Manage billing / cancel subscription"}
            </Button>
          )}

          <Button
            fullWidth
            variant="text"
            size="small"
            onClick={handleLogout}
            sx={{ mt: 0.5, color: "text.disabled", fontSize: "0.75rem" }}
          >
            Log out
          </Button>
        </Paper>
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={dashTheme}>
    <Box sx={{ pb: isMobile ? 12 : 6, bgcolor: "#F6F7F9", minHeight: "100vh" }}>
      <Snackbar
        open={Boolean(toast)} autoHideDuration={4000}
        onClose={() => setToast(null)} message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <ManualBookingDialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        slot={selectedSlotForManual}
        barber={barber}
        profile={profile}
        onBooked={async () => {
          setToast("✅ Manual booking confirmed! Slot removed from online availability.");
          setSlots(await getProfessionalSlots(barber.uid) || []);
          await loadData();
        }}
      />

      <DashboardHeader
        profile={profile}
        profilePreview={profilePreview}
        brandColor={brandColor}
        uploading={uploading}
        handleLogout={handleLogout}
        handleSaveProfile={handleSaveProfile}
      />

      <OfflineIndicator />
      <PWAInstallBanner brandColor={brandColor} />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, md: 3 }, mt: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: "1rem", md: "1.15rem" }, color: brandColor, mb: 1.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {businessTypeLabel} Dashboard
        </Typography>
        <DashboardTabBar
          groups={tabGroups}
          activeTab={tab}
          onTabChange={setTab}
          brandColor={brandColor}
          isMobile={isMobile}
        />

        {/* ── 0 Schedule ── */}
        <TabPanel value={tab} index={0}>
          {isTrainer ? (
            <PTAvailabilityTab barber={barber} profile={profile} brandColor={brandColor} />
          ) : (
            <ScheduleTab
              slots={slots} newSlot={newSlot} setNewSlot={setNewSlot}
              handleAddSlot={handleAddSlot} handleDeleteSlot={handleDeleteSlot}
              handleRestoreSlot={handleRestoreSlot} openManualBooking={openManualBooking}
              brandColor={brandColor}
            />
          )}
        </TabPanel>

        {/* ── 1 Bookings ── */}
        <TabPanel value={tab} index={1}>
          <BookingsTab
            bookings={bookings} isMobile={isMobile} brandColor={brandColor}
            handleCompleteBooking={handleCompleteBooking}
            handleCancelBooking={handleCancelBooking}
          />
        </TabPanel>

        {/* ── Profile (merged with Edit Page) ── */}
        <TabPanel value={tab} index={tabIdx("edit-page")}>
          <EditPageTab
            profile={profile} setProfile={setProfile}
            brandColor={brandColor} userRole={userRole}
            profilePreview={profilePreview}
            setProfileFile={setProfileFile} setProfilePreview={setProfilePreview}
            handleDeleteProfile={handleDeleteProfile}
            handleImageChange={handleImageChange}
            businessType={profile.businessType}
          />
        </TabPanel>

        {/* ── Services (non-trainer only) ── */}
        {!isTrainer && (
          <TabPanel value={tab} index={tabIdx("services")}>
            <ServicesTab
              profile={profile}
              newService={newService} setNewService={setNewService}
              handleAddService={handleAddService} handleRemoveService={handleRemoveService}
              brandColor={brandColor}
            />
          </TabPanel>
        )}

        {/* ── Reviews (owner only) ── */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={IDX_REVIEWS}>
            <ReviewsTab reviews={reviews} onDeleteReview={handleDeleteReview} shopId={userRole.shopId} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Finance ── */}
        <TabPanel value={tab} index={IDX_FINANCE}>
          <FinanceTab
            profile={profile} setProfile={setProfile} userRole={userRole}
            stripeLoading={stripeLoading} handleConnectStripe={handleConnectStripe}
          />
        </TabPanel>

        {/* ── Design (owner only) ── */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={IDX_DESIGN}>
            <DesignTab
              profile={profile} setProfile={setProfile}
              logoPreview={logoPreview}               setLogoFile={setLogoFile}               setLogoPreview={setLogoPreview}
              heroPreviewDesktop={heroPreviewDesktop} setHeroFileDesktop={setHeroFileDesktop} setHeroPreviewDesktop={setHeroPreviewDesktop}
              heroPreviewMobile={heroPreviewMobile}   setHeroFileMobile={setHeroFileMobile}   setHeroPreviewMobile={setHeroPreviewMobile}
              handleImageChange={handleImageChange}
            />
          </TabPanel>
        )}


        {/* ── Domain (owner only on main dashboard — hidden in tenant context) ── */}
        {userRole.isOwner && !initialTenant && (
          <TabPanel value={tab} index={IDX_DOMAIN}>
            <DomainTab
              profile={profile}
              barber={barber}
              brandColor={brandColor}
            />
          </TabPanel>
        )}

        {/* ── Pay ── */}
        <TabPanel value={tab} index={IDX_PAY}>
          <PayTab
            profile={profile} barber={barber}
            setTab={setTab} financeTabIndex={IDX_FINANCE} brandColor={brandColor}
            terminalAmount={terminalAmount}   setTerminalAmount={setTerminalAmount}
            terminalService={terminalService} setTerminalService={setTerminalService}
            terminalNote={terminalNote}       setTerminalNote={setTerminalNote}
            terminalStatus={terminalStatus}   terminalSession={terminalSession}
            handleCreateTerminalCharge={handleCreateTerminalCharge}
            handleCancelTerminal={handleCancelTerminal}
            handleResetTerminal={handleResetTerminal}
            handleCopyPayLink={handleCopyPayLink}
          />
        </TabPanel>

        {/* ── Notifications settings ── */}
        <TabPanel value={tab} index={tabIdx("notifications")}>
          <NotificationSettingsTab barber={barber} brandColor={brandColor} />
        </TabPanel>

        {/* ── Trainer-only tabs ── */}
        {isTrainer && (
          <>
            <TabPanel value={tab} index={tabIdx("pt-invoices")}>
              <PTInvoiceTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("clients")}>
              <ClientProfileTab barber={barber} profile={profile} brandColor={brandColor} bookings={bookings} />
            </TabPanel>
          </>
        )}

        {/* ── Decorator-only tabs ── */}
        {isDecorator && (
          <>
            <TabPanel value={tab} index={tabIdx("colourapproval")}>
              <ColourApprovalTab barber={barber} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("quote")}>
              <QuoteTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("dayplanner")}>
              <DayPlannerTab barber={barber} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("dec-invoices")}>
              <InvoiceTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
          </>
        )}

        {/* ── Hairdresser-only tabs ── */}
        {isHairdresser && (
          <>
            <TabPanel value={tab} index={tabIdx("hd-invoices")}>
              <InvoiceTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
          </>
        )}

        {/* ── Barber-only tabs ── */}
        {isBarber && (
          <>
            <TabPanel value={tab} index={tabIdx("queue")}>
              <QueueManagementTab barber={barber} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("haircut")}>
              <HaircutTab barber={barber} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("bar-invoices")}>
              <InvoiceTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
          </>
        )}

        {/* Integrations — all business types */}
        <TabPanel value={tab} index={tabIdx("integrations")}>
          <IntegrationsTab barber={barber} brandColor={brandColor} />
        </TabPanel>

      </Box>

      {/* WhatsApp support button */}
      <Box
        component="a"
        href="https://wa.me/447752300937?text=Hi%2C%20I%20need%20help%20with%20my%20Bookriightly%20dashboard"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          position: "fixed",
          bottom: isMobile ? 90 : 24,
          right: 20,
          zIndex: 1300,
          width: 52,
          height: 52,
          borderRadius: "50%",
          bgcolor: "#25D366",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(37,211,102,0.45)",
          transition: "transform 0.15s, box-shadow 0.15s",
          "&:hover": {
            transform: "scale(1.08)",
            boxShadow: "0 6px 24px rgba(37,211,102,0.6)",
          },
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </Box>
    </Box>
    </ThemeProvider>
  );
}