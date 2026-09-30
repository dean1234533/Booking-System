import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box, Snackbar, CircularProgress, Typography, Button, Paper,
  useMediaQuery, useTheme, ThemeProvider, createTheme, Badge,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import {
  BellRing as NotificationsActiveIcon,
  BriefcaseBusiness as BriefcaseIcon,
  CalendarClock as TodayIcon,
  CalendarDays as StoreIcon,
  Clock3 as AccessTimeIcon,
  Nfc as NfcIcon,
  FileText as ReceiptLongIcon,
  Globe2 as LanguageIcon,
  LayoutDashboard as DashboardIcon,
  List as ListIcon,
  MessageSquareText as ReviewsIcon,
  Paintbrush as ColorLensIcon,
  Palette as PaletteIcon,
  Plug as ExtensionIcon,
  ReceiptText as RequestQuoteIcon,
  Scissors as ContentCutIcon,
  Dumbbell as FitnessCenterIcon,
  UserRound as PersonIcon,
  UsersRound as PeopleIcon,
  WalletCards as PaymentsIcon,
} from "lucide-react";

import imageCompression from "browser-image-compression";
import { getAuth }      from "firebase/auth";
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
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { sanitizeSlug } from "../utils/bookingSlug";

// ── Sub-components ────────────────────────────────────────────────────────────
import DashboardHeader     from "../components/dashboard/DashboardHeader";
import DashboardTabBar     from "../components/dashboard/DashboardTabBar";
import DashboardOverview   from "../components/dashboard/DashboardOverview";
import PWAInstallBanner    from "../components/dashboard/PWAInstallBanner";
import EmailVerificationBanner from "../components/dashboard/EmailVerificationBanner";
import OfflineIndicator    from "../components/dashboard/OfflineIndicator";
import ManualBookingDialog from "../components/dashboard/ManualBookingDialog";
import ScheduleTab  from "../components/dashboard/tabs/ScheduleTab";
import BookingsTab  from "../components/dashboard/tabs/BookingsTab";
import ProfileTab   from "../components/dashboard/tabs/ProfileTab";
import EditPageTab  from "../components/dashboard/tabs/EditPageTab";
import MiniPageTab  from "../components/dashboard/tabs/MiniPageTab";
import ServicesTab  from "../components/dashboard/tabs/ServicesTab";
import StaffTab     from "../components/dashboard/tabs/StaffTab";
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
import ClientHistoryTab    from "../components/dashboard/tabs/ClientHistoryTab";
// ── Plumber-specific tabs ──
import EnquiriesTab         from "../components/dashboard/tabs/EnquiriesTab";
import ChargesTab           from "../components/dashboard/tabs/ChargesTab";
import PlumberInvoiceTab    from "../components/dashboard/tabs/PlumberInvoiceTab";
// ── Hairdresser-specific tabs ──
import InvoiceTab               from "../components/dashboard/tabs/InvoiceTab";
import PTInvoiceTab             from "../components/dashboard/tabs/PTInvoiceTab";
import NotificationSettingsTab  from "../components/dashboard/tabs/NotificationSettingsTab";
import RemindersTab            from "../components/dashboard/tabs/RemindersTab";
import PTAvailabilityTab        from "../components/dashboard/tabs/PTAvailabilityTab";
import IntegrationsTab          from "../components/dashboard/tabs/IntegrationsTab";
import { checkOutlookAvailability, getOutlookTokens } from "../firebase/outlook";
import { geocodeAddress } from "../utils/geocode";

// ── Helpers ───────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children, bare = false }) {
  if (value !== index) return null;
  if (bare) return <Box sx={{ py: 2 }}>{children}</Box>;
  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{
        bgcolor: "#ffffff",
        borderRadius: "14px",
        border: "1px solid #E4E7EC",
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        p: { xs: 2, md: 3 },
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
  const [tab,          setTab]          = useState("overview");
  const [dataLoading,  setDataLoading]  = useState(true);
  const [stripeLoading,setStripeLoading]= useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [toast,        setToast]        = useState(null);
  // Carries an enquiry/quote/job's details across a tab switch so converting
  // one into the next (enquiry -> quote -> job -> invoice) never means
  // re-typing details already captured — see EnquiriesTab/QuoteTab/
  // DayPlannerTab's `prefill`/`onPrefillConsumed` props (plumber only).
  const [plumberDraft, setPlumberDraft] = useState(null);

  // ── Data state ────────────────────────────────────────────────────────────
  const [userRole, setUserRole] = useState({ isOwner: true, shopId: null });
  const [profile,  setProfile]  = useState({
    name: "", businessName: "", brandColor: "#2563EB",
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
  const [reminderLogs, setReminderLogs] = useState([]);
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

  // Keep the Reviews tab in sync while the dashboard is open. Reviews can be
  // submitted from a client's phone, so a one-time fetch leaves this screen
  // stale until the barber refreshes the whole app.
  useEffect(() => {
    if (!userRole.shopId) return;
    // A chair-renting staff member's reviews live in their own subcollection,
    // separate from the shop's and from every other staff member's.
    const reviewsRef = userRole.isOwner
      ? collection(db, "barbers", userRole.shopId, "reviews")
      : collection(db, "barbers", userRole.shopId, "staff", barber.uid, "reviews");
    return onSnapshot(
      reviewsRef,
      snap => {
        const liveReviews = snap.docs
          .map(reviewDoc => ({ id: reviewDoc.id, ...reviewDoc.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setReviews(liveReviews);
      },
      err => console.error("[reviews listener]", err),
    );
  }, [userRole.isOwner, userRole.shopId, barber?.uid]);

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
          setToast("Stripe connected!");
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
    const knownSections = [
      "overview", "schedule", "bookings", "edit-page", "services", "finance",
      "reviews", "design", "domain", "pay", "notifications", "reminders", "integrations",
      "pt-invoices", "clients", "colourapproval", "quote", "dayplanner",
      "dec-invoices", "hd-invoices", "client-history", "queue", "haircut", "bar-invoices",
    ];
    setTab(knownSections.includes(tabParam) ? tabParam : "overview");
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

        // Self-heal: accounts created before the booking-slug feature (or
        // anything the one-off backfill script missed) silently claim a
        // slug in the background on next dashboard load. Idempotent —
        // no-ops once bookingSlug is set. Owners only; staff never get one.
        if (isOwner && !data.bookingSlug) {
          const candidate = sanitizeSlug(data.businessName || data.name || barber.email?.split("@")[0]);
          if (candidate) {
            const functions = getFunctions(getApp(), "us-central1");
            httpsCallable(functions, "claimBookingSlug")({ slug: candidate })
              .then(res => setProfile(prev => ({ ...prev, bookingSlug: res.data.slug })))
              .catch(() => {}); // best-effort — a real claim happens explicitly from onboarding/settings
          }
        }
      }
      setUserRole({ isOwner, shopId: activeShopId });

      const bSnap = await getDocs(
        query(collection(db, "bookings"), where("barberId", "==", barber.uid))
      );
      const allB = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBookings(allB.filter(b => b.status !== "completed" && b.status !== "cancelled"));

      // Reminder outcomes for the per-booking status chips (owner-readable by rules).
      try {
        const today = new Date().toISOString().slice(0, 10);
        const rSnap = await getDocs(query(collection(db, "reminderLogs"), where("businessId", "==", barber.uid), where("apptDate", ">=", today)));
        setReminderLogs(rSnap.docs.map(d => d.data()));
      } catch { /* index still building or rules not deployed — chips just don't show */ }

      const mySlots = await getProfessionalSlots(barber.uid);
      setSlots(mySlots || []);

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
      // Only throws if the main account doc itself couldn't be deleted —
      // everything else (auth login, custom domain, subcollections) is
      // best-effort, so by the time this resolves the account is already
      // gone from cards and its slug is free, regardless of authDeleted.
      const { authDeleted } = await deleteBarberAccountData(barber.uid);
      setToast(
        authDeleted
          ? "Account and all associated data successfully wiped."
          : "Account and data deleted. Log out and back in, then delete once more to fully remove your login."
      );
      navigate("/");
    } catch (err) {
      setToast("Failed to delete profile: " + err.message);
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
      // Geocode the address into coordinates so the marketplace can sort by
      // real distance instead of just text-matching the location string.
      // Silently skipped on failure/no match — never blocks the save itself.
      const locationQuery = [profile.address, profile.area, profile.postcode].filter(Boolean).join(", ");
      if (locationQuery) {
        const coords = await geocodeAddress(locationQuery);
        if (coords) {
          updatedData.latitude = coords.latitude;
          updatedData.longitude = coords.longitude;
        }
      }

      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
      if (profileFile)    { const c = await imageCompression(profileFile, options);     updatedData.profilePic      = await uploadBarberImage(c, "profile_pic", barber.uid); }
      if (logoFile)       { const c = await imageCompression(logoFile, options);        updatedData.logoUrl         = await uploadBarberImage(c, "business_logo", barber.uid); }
      if (heroFileDesktop){ const c = await imageCompression(heroFileDesktop, options); updatedData.heroImage       = await uploadBarberImage(c, "hero_banner_desktop", barber.uid); }
      if (heroFileMobile) { const c = await imageCompression(heroFileMobile, options);  updatedData.heroImageMobile = await uploadBarberImage(c, "hero_banner_mobile", barber.uid); }

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

  // Shared by handleCancelBooking below and the two slot-side actions that
  // follow — marks the booking cancelled and refunds any Stripe deposit.
  // Deleting or reopening a slot that still had an active booking against
  // it used to leave that booking dangling (still "confirmed", still
  // showing in Appointments) with no slot left to point to.
  async function cancelBookingRecord(booking) {
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
      } catch (e) { console.error("[cancelBookingRecord] Stripe error:", e); }
    }
    await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled" });
  }

  async function handleDeleteSlot(slotId) {
    if (!barber?.uid) return;
    const linkedBooking = bookings.find(b => b.slotId === slotId);
    if (linkedBooking?.paymentIntentId && !window.confirm(
      `${linkedBooking.customerName || "A client"} has a paid booking on this slot. Deleting it will cancel their booking and refund their deposit. Continue?`
    )) return;
    try {
      if (linkedBooking) await cancelBookingRecord(linkedBooking);
      await deleteSlot(barber.uid, slotId);
      setToast("Slot removed");
      setSlots(await getProfessionalSlots(barber.uid) || []);
      if (linkedBooking) await loadData();
    } catch { setToast("Failed to remove slot"); }
  }

  async function handleRestoreSlot(slotId) {
    const linkedBooking = bookings.find(b => b.slotId === slotId);
    if (linkedBooking?.paymentIntentId && !window.confirm(
      `${linkedBooking.customerName || "A client"} has a paid booking on this slot. Reopening it will cancel their booking and refund their deposit. Continue?`
    )) return;
    try {
      if (linkedBooking) await cancelBookingRecord(linkedBooking);
      await updateDoc(doc(db, "slots", slotId), { isBooked: false, status: "open" });
      setToast("Slot restored!");
      setSlots(await getProfessionalSlots(barber.uid) || []);
      if (linkedBooking) await loadData();
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
      setToast("Booking completed — slot is available again.");
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
      await cancelBookingRecord(booking);
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
      const reviewDocPath = userRole.isOwner
        ? doc(db, "barbers", userRole.shopId, "reviews", reviewId)
        : doc(db, "barbers", userRole.shopId, "staff", barber.uid, "reviews", reviewId);
      await deleteDoc(reviewDocPath);
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
      const idToken = await getAuth().currentUser?.getIdToken();
      const res  = await fetch("/api/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
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
          setToast("Payment received!");
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
  // An expired trial NEVER blocks the dashboard — worker.js's
  // handleTrialLifecycle downgrades it to the Free plan (page stays live,
  // owner keeps a working dashboard), it just runs on the same daily cron
  // as everything else so there can be a short gap before `plan` actually
  // flips to "free" in Firestore. isBlocked is reserved for a genuine
  // payment failure/cancellation on an existing PAID subscription — not
  // for a trial that simply ran out.
  const isBlocked   = !profile.freeForever && profile.plan !== "free" && (subStatus === "past_due" || subStatus === "canceled");

  // ── Tab config ────────────────────────────────────────────────────────────
  // NOTE: Domain tab is intentionally excluded for staff — only owners see it.
  const brandColor      = profile.brandColor || "#2563EB";
  const isTrainer       = profile.businessType === "trainer";
  const isDecorator     = profile.businessType === "decorator";
  const isHairdresser   = profile.businessType === "hairdresser";
  const isPlumber       = profile.businessType === "plumber";
  const isBarber        = !profile.businessType || profile.businessType === "barber";
  // Widget-only accounts already have their own website and only embed
  // booking/queue tools on it — they don't need the tabs for managing a
  // Bookrightly-hosted page (Profile content, Design, a custom Domain for
  // it), so those are hidden rather than shown unused.
  const isWidgetPlan    = profile.plan === "widget";
  // Basic-plan accounts get a bare booking page (no hosted marketing site,
  // no dashboard tools beyond taking and seeing bookings) at a lower price —
  // see MinimalBookingPage.jsx and App.jsx's renderTenantHome.
  const isBasicPlan     = profile.plan === "basic";
  // Free-plan accounts (£0) are even barer than Basic — no hosted
  // profile at all beyond a logo, no services, no team, no reviews. The
  // dashboard only does two things: manage bookings and upload a logo.
  // See MiniBookingPage.jsx / MiniPageTab.jsx.
  const isFreePlan      = profile.plan === "free";
  const businessTypeLabel = isTrainer ? "Personal Trainer"
    : isDecorator ? "Decorator"
    : isHairdresser ? "Hairdresser"
    : isPlumber ? "Plumbing, Heating & Electrical"
    : "Barber";
  const workspaceLabel = isTrainer ? "Coaching"
    : isDecorator ? "Projects"
    : isHairdresser ? "Salon"
    : isPlumber ? "Jobs"
    : "Workday";

  // ── Scoped, professional light theme for the whole dashboard ────────────────
  // Refines cards, buttons, inputs and typography for a cohesive, polished look.
  // Theme defaults only — any tab that sets its own styles via `sx` still wins.
  const dashTheme = useMemo(() => createTheme({
    palette: {
      mode: "light",
      primary:    { main: "#2563EB", dark: "#1D4ED8", contrastText: "#ffffff" },
      secondary:  { main: brandColor },
      background: { default: "#F7F8FA", paper: "#ffffff" },
      text:       { primary: "#18181B", secondary: "#667085" },
      divider:    "#E4E7EC",
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'DM Sans','Plus Jakarta Sans','Inter',system-ui,sans-serif",
      button: { textTransform: "none", fontWeight: 850, letterSpacing: 0 },
      h6: { fontWeight: 900, letterSpacing: "-.025em" },
      subtitle1: { fontWeight: 850 },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none", border: "1px solid #E4E7EC", borderRadius: 14, boxShadow: "0 1px 2px rgba(16,24,40,.04)" } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { borderRadius: 14, border: "1px solid #E4E7EC", boxShadow: "0 1px 2px rgba(16,24,40,.04)" } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 9, boxShadow: "none", paddingInline: 16, "&:hover": { boxShadow: "none" } } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 10, backgroundColor: "#fff" } },
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

  const hairdresserTabs = isHairdresser ? [
    { key: "client-history", label: "Client History", icon: <ColorLensIcon /> },
    { key: "hd-invoices", label: "Invoices", icon: <ReceiptLongIcon /> },
  ] : [];

  const plumberTabs = isPlumber ? [
    { key: "enquiries",    label: "Enquiries", icon: <PeopleIcon /> },
    { key: "quote",        label: "Quotes",    icon: <RequestQuoteIcon /> },
    { key: "dayplanner",   label: "Job Plan",  icon: <TodayIcon /> },
    { key: "charges",      label: "Charges",   icon: <PaymentsIcon /> },
    { key: "plu-invoices", label: "Invoices",  icon: <ReceiptLongIcon /> },
  ] : [];

  const barberTabs = isBarber ? [
    { key: "queue",   label: "Queue",   icon: <PeopleIcon /> },
    { key: "haircut", label: "Client cuts", icon: <ContentCutIcon /> },
    { key: "bar-invoices", label: "Invoices", icon: <ReceiptLongIcon /> },
  ] : [];

  const tabs = [
    { key: "overview",      label: "Today", icon: <DashboardIcon /> },
    { key: "schedule",      label: "Schedule", icon: <AccessTimeIcon /> },
    { key: "bookings",      label: "Bookings", icon: <StoreIcon /> },
    // Unlike Widget-plan accounts (no Bookrightly-hosted page at all), Basic
    // accounts DO have one — MinimalBookingPage.jsx — and it shows logoUrl,
    // brandColor, heroTagline, a services list, and the social links, all of
    // which live in Profile/Design/Services (EditPageTab.jsx hides the
    // gallery/team/copy sections that genuinely don't apply to Basic).
    // Mini accounts get their own dedicated "Page" tab instead (below) —
    // MiniBookingPage.jsx only ever shows a logo/colour/tagline/city, a
    // small fraction of what Profile/Design expose.
    ...(!isWidgetPlan && !isFreePlan ? [{ key: "edit-page", label: "Profile", icon: <PersonIcon /> }] : []),
    ...(isFreePlan ? [{ key: "free-page", label: "Page", icon: <PersonIcon /> }] : []),
    ...(!isTrainer && !isFreePlan ? [{ key: "services", label: "Services", icon: <ListIcon /> }] : []),
    ...(userRole.isOwner && !isBasicPlan && !isFreePlan ? [{ key: "staff", label: "Team", icon: <PeopleIcon /> }] : []),
    ...(userRole.isOwner ? [{ key: "finance", label: "Finance", icon: <PaymentsIcon /> }] : []),
    // Barber staff rent their own chair, so they get their own review link
    // and their own reviews too — owners of every business type keep theirs.
    ...(!isBasicPlan && !isFreePlan && (userRole.isOwner || isBarber) ? [{ key: "reviews", label: "Reviews", icon: <ReviewsIcon /> }]  : []),
    ...(userRole.isOwner && !isWidgetPlan && !isFreePlan ? [{ key: "design", label: "Design", icon: <PaletteIcon /> }] : []),
    ...(userRole.isOwner && !initialTenant && !isWidgetPlan && !isBasicPlan && !isFreePlan ? [{ key: "domain", label: "Domain", icon: <LanguageIcon /> }] : []),
    ...(!isBasicPlan && !isFreePlan ? [{ key: "pay", label: "Pay", icon: <NfcIcon /> }] : []),
    { key: "notifications",  label: "Notifications",  icon: <Badge badgeContent={unreadNotifs} color="error" max={99}><NotificationsActiveIcon /></Badge> },
    { key: "reminders", label: "Reminders", icon: <NotificationsActiveIcon /> },
    ...(!isBasicPlan && !isFreePlan ? [{ key: "integrations", label: "Integrations", icon: <ExtensionIcon /> }] : []),
    ...(!isBasicPlan && !isFreePlan ? trainerTabs : []),
    ...(!isBasicPlan && !isFreePlan ? decoratorTabs : []),
    ...(!isBasicPlan && !isFreePlan ? hairdresserTabs : []),
    ...(!isBasicPlan && !isFreePlan ? barberTabs : []),
    ...(!isBasicPlan && !isFreePlan ? plumberTabs : []),
  ];
  const tabIdx = (key) => tabs.some((t) => t.key === key) ? key : null;

  const IDX_FINANCE = tabIdx("finance");
  const IDX_STAFF   = tabIdx("staff");
  const IDX_REVIEWS = tabIdx("reviews");
  const IDX_DESIGN  = tabIdx("design");
  const IDX_DOMAIN  = tabIdx("domain");
  const IDX_PAY     = tabIdx("pay");

  // ── Grouped tab nav config (drives DashboardTabBar) ──────────────────────────
  // Items whose tab key isn't in the current tabs array (e.g. PWA-only tabs on web)
  // return index -1 from tabIdx — filter those out so no broken menu entries appear.
  const filterItems = (items) => items.filter(i => i.index != null);

  // Each group carries a one-line description shown under its label in the
  // nav, so a group's contents are guessable without clicking in first —
  // the previous "Clients" group only ever held one unrelated item
  // (Reviews for most business types, or Clients for trainers alone) and
  // wasn't a real category, just leftover space; merged into where each
  // item actually belongs instead of keeping a group name that described
  // neither of its own contents.
  const workflowGroups = isTrainer ? [{
    label: "Coaching",
    description: "Clients, plans and sessions",
    icon: <FitnessCenterIcon />,
    items: filterItems([
      { label: "Clients & coaching", icon: <PeopleIcon />, index: tabIdx("clients") },
      { label: "Availability", icon: <AccessTimeIcon />, index: "schedule" },
      { label: "Sessions", icon: <StoreIcon />, index: "bookings" },
    ]),
  }] : isDecorator ? [{
    label: "Projects",
    description: "From estimate to completed work",
    icon: <BriefcaseIcon />,
    items: filterItems([
      { label: "Quotes", icon: <RequestQuoteIcon />, index: tabIdx("quote") },
      { label: "Day plan", icon: <TodayIcon />, index: tabIdx("dayplanner") },
      { label: "Colour approvals", icon: <ColorLensIcon />, index: tabIdx("colourapproval") },
      { label: "Appointments", icon: <StoreIcon />, index: "bookings" },
      { label: "Availability", icon: <AccessTimeIcon />, index: "schedule" },
    ]),
  }] : isPlumber ? [{
    label: "Jobs",
    description: "From enquiry to paid invoice",
    icon: <BriefcaseIcon />,
    items: filterItems([
      { label: "Enquiries", icon: <PeopleIcon />, index: tabIdx("enquiries") },
      { label: "Quotes", icon: <RequestQuoteIcon />, index: tabIdx("quote") },
      { label: "Job plan", icon: <TodayIcon />, index: tabIdx("dayplanner") },
      { label: "Call-outs", icon: <StoreIcon />, index: "bookings" },
      { label: "Availability", icon: <AccessTimeIcon />, index: "schedule" },
      { label: "Charges", icon: <PaymentsIcon />, index: tabIdx("charges") },
    ]),
  }] : isHairdresser ? [{
    label: "Salon diary",
    description: "Appointments, availability and client history",
    icon: <ContentCutIcon />,
    items: filterItems([
      { label: "Diary", icon: <AccessTimeIcon />, index: "schedule" },
      { label: "Appointments", icon: <StoreIcon />, index: "bookings" },
      { label: "Client history", icon: <ColorLensIcon />, index: tabIdx("client-history") },
    ]),
  }] : [{
    label: "Workday",
    description: "Appointments, walk-ins and clients",
    icon: <ContentCutIcon />,
    items: filterItems([
      { label: "Queue", icon: <PeopleIcon />, index: tabIdx("queue") },
      { label: "Appointments", icon: <StoreIcon />, index: "bookings" },
      { label: "Availability", icon: <AccessTimeIcon />, index: "schedule" },
      { label: "Client cuts", icon: <ContentCutIcon />, index: tabIdx("haircut") },
    ]),
  }];

  const tabGroups = [
    {
      label: "Today",
      description: `Your ${workspaceLabel.toLowerCase()} at a glance`,
      icon: <DashboardIcon />,
      items: [{ label: "Today", icon: <DashboardIcon />, index: "overview" }],
    },
    ...workflowGroups,
    {
      label: "Business page",
      description: "What customers see on your page",
      icon: <LanguageIcon />,
      items: filterItems([
        { label: "Profile",  icon: <PersonIcon />,  index: tabIdx("edit-page") },
        ...(isFreePlan ? [{ label: "Page", icon: <PersonIcon />, index: tabIdx("free-page") }] : []),
        ...(!isTrainer ? [{ label: "Services", icon: <ListIcon />, index: tabIdx("services") }] : []),
        ...(userRole.isOwner ? [{ label: "Team", icon: <PeopleIcon />, index: IDX_STAFF }] : []),
        ...(userRole.isOwner || isBarber ? [{ label: "Reviews", icon: <ReviewsIcon />, index: IDX_REVIEWS }] : []),
        ...(userRole.isOwner                   ? [{ label: "Design",    icon: <PaletteIcon />,  index: IDX_DESIGN }] : []),
        ...(userRole.isOwner && !initialTenant ? [{ label: "Domain",    icon: <LanguageIcon />, index: IDX_DOMAIN }] : []),
      ]),
    },
    {
      label: "Money",
      description: "Payments and invoices",
      icon: <PaymentsIcon />,
      items: filterItems([
        ...(userRole.isOwner ? [{ label: "Finance", icon: <PaymentsIcon />, index: IDX_FINANCE }] : []),
        { label: "Pay",     icon: <NfcIcon />,      index: IDX_PAY },
        ...(isTrainer ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("pt-invoices") },
        ] : isDecorator ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("dec-invoices") },
        ] : isHairdresser ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("hd-invoices") },
        ] : isBarber ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("bar-invoices") },
        ] : isPlumber ? [
          { label: "Invoices", icon: <ReceiptLongIcon />, index: tabIdx("plu-invoices") },
        ] : []),
      ]),
    },
    // ── Settings (all business types) — kept last so it sits at the far right ──
    {
      label: "Settings",
      description: "Alerts and connected apps",
      icon: <NotificationsActiveIcon />,
      items: filterItems([
        { label: "Notifications", icon: <NotificationsActiveIcon />, index: tabIdx("notifications") },
        { label: "Reminders",     icon: <NotificationsActiveIcon />, index: tabIdx("reminders") },
        { label: "Integrations",  icon: <ExtensionIcon />,           index: tabIdx("integrations") },
      ]),
    },
  ];

  const sectionMeta = tabs.find(item => item.key === tab) || tabs[0];
  const activeGroupMeta = tabGroups.find(group => group.items.some(item => item.index === tab));
  // Mini-plan's tab set doesn't include most of the businessType-specific
  // keys the general case below assumes (queue/haircut/etc are all hidden
  // for this tier) — without its own branch, a Mini-plan barber's mobile
  // bar would silently drop to 2 working shortcuts instead of 4.
  const mobileItems = isFreePlan
    ? [
        tabs.find(item => item.key === "overview"),
        tabs.find(item => item.key === "schedule"),
        tabs.find(item => item.key === "bookings"),
        tabs.find(item => item.key === "free-page"),
      ].filter(Boolean).map(item => ({ label: item.label, icon: item.icon, index: item.key }))
    : [
    tabs.find(item => item.key === "overview"),
    tabs.find(item => item.key === (isTrainer ? "clients" : isDecorator ? "dayplanner" : isPlumber ? "enquiries" : isBarber ? "queue" : "schedule")),
    tabs.find(item => item.key === (isTrainer ? "schedule" : isDecorator ? "quote" : isPlumber ? "dayplanner" : "bookings")),
    tabs.find(item => item.key === (isTrainer ? "bookings" : isDecorator ? "colourapproval" : isPlumber ? "quote" : isBarber ? "haircut" : "services")),
  ].filter(Boolean).map(item => ({ label: item.label, icon: item.icon, index: item.key }));

  const handleSectionChange = (key) => {
    if (!tabs.some(item => item.key === key)) return;
    setTab(key);
    window.history.replaceState({}, "", key === "overview" ? "/dashboard" : `/dashboard?tab=${key}`);
    // Switching tabs swaps the content under whatever scroll position the
    // previous tab was left at, instead of starting each tab at its own top —
    // e.g. scrolling partway down "Today" then tapping "Search traffic" landed
    // mid-page in Domain, not at its heading. sessionStorage's own scroll-to
    // (br_scrollTo, in DomainTab) runs after this on the next frame and wins.
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!tabs.some(item => item.key === tab)) setTab("overview");
  }, [tab, profile.businessType, userRole.isOwner, initialTenant]);

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
        const idToken = await getAuth().currentUser?.getIdToken();
        const res  = await fetch("/api/billing-portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
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
        const idToken = await getAuth().currentUser?.getIdToken();
        const res  = await fetch("/api/create-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body:    JSON.stringify({
            barberId:     barber.uid,
            email:        barber.email,
            businessType: profile.businessType || "barber",
            plan:         profile.plan || "full",
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
    const bc = profile.brandColor || "#2563EB";
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#F5F3ED",
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
    <Box sx={{ pb: isMobile ? 12 : 6, bgcolor: "#F7F8FA", minHeight: "100vh" }}>
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
          setToast("Manual booking confirmed! Slot removed from online availability.");
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
        showSave={["edit-page", "services", "design", "finance", "free-page"].includes(tab)}
      />

      <OfflineIndicator />
      <PWAInstallBanner brandColor={brandColor} />
      <EmailVerificationBanner user={barber} brandColor={brandColor} />

      <Box sx={{ maxWidth: 1360, mx: "auto", px: { xs: 1.5, md: 3 }, mt: { xs: 2, md: 3 }, display: "flex", alignItems: "flex-start", gap: 3 }}>
        <DashboardTabBar
          groups={tabGroups}
          activeTab={tab}
          onTabChange={handleSectionChange}
          brandColor={brandColor}
          isMobile={isMobile}
          mobileItems={mobileItems}
        />

        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          {tab !== "overview" && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ color: "text.secondary", fontWeight: 700, fontSize: ".72rem" }}>
                {businessTypeLabel} · {activeGroupMeta?.label || workspaceLabel}
              </Typography>
              <Typography sx={{ fontWeight: 750, fontSize: { xs: "1.35rem", md: "1.6rem" }, letterSpacing: "-.02em", mt: .25 }}>
                {sectionMeta.label}
              </Typography>
              {activeGroupMeta?.description && (
                <Typography sx={{ color: "text.secondary", fontSize: ".78rem", mt: .35 }}>
                  {activeGroupMeta.description}
                </Typography>
              )}
            </Box>
          )}

        <TabPanel value={tab} index="overview" bare>
          <DashboardOverview
            profile={profile}
            bookings={bookings}
            slots={slots}
            businessType={profile.businessType || "barber"}
            brandColor={brandColor}
            onNavigate={handleSectionChange}
            barberId={barber?.uid}
          />
        </TabPanel>

        {/* ── Schedule ── */}
        <TabPanel value={tab} index="schedule">
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

        {/* ── Bookings ── */}
        <TabPanel value={tab} index="bookings">
          <BookingsTab
            bookings={bookings} isMobile={isMobile} brandColor={brandColor}
            reminderLogs={reminderLogs} businessProfile={profile}
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

        {/* ── Mini-plan "Page" (logo/colour/tagline/city only) ── */}
        {isFreePlan && (
          <TabPanel value={tab} index={tabIdx("free-page")}>
            <MiniPageTab
              profile={profile} setProfile={setProfile}
              logoPreview={logoPreview} setLogoFile={setLogoFile} setLogoPreview={setLogoPreview}
              handleImageChange={handleImageChange}
              handleDeleteProfile={handleDeleteProfile}
            />
          </TabPanel>
        )}

        {/* ── Team (owner only, all business types) ── */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={IDX_STAFF}>
            <StaffTab shopId={barber.uid} brandColor={brandColor} businessType={profile.businessType || "barber"} />
          </TabPanel>
        )}

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

        {/* ── Reviews (owner, or barber staff reviewing their own chair) ── */}
        {(userRole.isOwner || isBarber) && (
          <TabPanel value={tab} index={IDX_REVIEWS}>
            <ReviewsTab
              reviews={reviews} onDeleteReview={handleDeleteReview}
              shopId={userRole.shopId}
              barberId={userRole.isOwner ? undefined : barber.uid}
              brandColor={brandColor}
            />
          </TabPanel>
        )}

        {/* ── Finance (owner only — subscription billing and Stripe Connect
             are shop-level, not something a staff login should touch) ── */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={IDX_FINANCE}>
            <FinanceTab
              profile={profile} setProfile={setProfile} userRole={userRole}
              barber={barber}
              stripeLoading={stripeLoading} handleConnectStripe={handleConnectStripe}
              hidePayments={isFreePlan}
            />
          </TabPanel>
        )}

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
            setTab={handleSectionChange} financeTabIndex={IDX_FINANCE} brandColor={brandColor}
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

        {/* ── Client reminders (all plans; Free = push only) ── */}
        <TabPanel value={tab} index={tabIdx("reminders")}>
          <RemindersTab barber={barber} profile={profile} brandColor={brandColor} onNavigate={handleSectionChange} />
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
              <QuoteTab barber={barber} profile={profile} brandColor={brandColor} businessType="decorator" />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("dayplanner")}>
              <DayPlannerTab barber={barber} brandColor={brandColor} businessType="decorator" />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("dec-invoices")}>
              <InvoiceTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
          </>
        )}

        {/* ── Plumber-only tabs ── */}
        {isPlumber && (
          <>
            <TabPanel value={tab} index={tabIdx("enquiries")}>
              <EnquiriesTab barber={barber} brandColor={brandColor}
                onConvertToQuote={data => { setPlumberDraft({ target: "quote", data }); handleSectionChange("quote"); }} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("quote")}>
              <QuoteTab barber={barber} profile={profile} brandColor={brandColor} businessType="plumber"
                prefill={plumberDraft?.target === "quote" ? plumberDraft.data : null}
                onPrefillConsumed={() => setPlumberDraft(null)}
                enableConversions
                onConvertToJob={quote => { setPlumberDraft({ target: "dayplanner", data: { clientName: quote.clientName, address: quote.address, jobTitle: quote.jobTitle, sourceQuoteId: quote.id } }); handleSectionChange("dayplanner"); }}
                onCreateInvoice={quote => { setPlumberDraft({ target: "plu-invoices", data: { ...quote, sourceIsQuote: true } }); handleSectionChange("plu-invoices"); }}
              />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("dayplanner")}>
              <DayPlannerTab barber={barber} brandColor={brandColor} businessType="plumber"
                prefill={plumberDraft?.target === "dayplanner" ? plumberDraft.data : null}
                onPrefillConsumed={() => setPlumberDraft(null)}
                showJobLinkFields
                onCreateInvoice={job => { setPlumberDraft({ target: "plu-invoices", data: { ...job, sourceIsJob: true } }); handleSectionChange("plu-invoices"); }}
              />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("charges")}>
              <ChargesTab barber={barber} profile={profile} brandColor={brandColor} />
            </TabPanel>
            <TabPanel value={tab} index={tabIdx("plu-invoices")}>
              <PlumberInvoiceTab barber={barber} profile={profile} brandColor={brandColor} businessType="plumber"
                prefill={plumberDraft?.target === "plu-invoices" ? plumberDraft.data : null}
                onPrefillConsumed={() => setPlumberDraft(null)}
              />
            </TabPanel>
          </>
        )}

        {/* ── Hairdresser-only tabs ── */}
        {isHairdresser && (
          <>
            <TabPanel value={tab} index={tabIdx("client-history")}>
              <ClientHistoryTab barber={barber} brandColor={brandColor} />
            </TabPanel>
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
          <IntegrationsTab barber={barber} brandColor={brandColor} isBarber={isBarber} plan={profile.plan || "full"} handleDeleteProfile={handleDeleteProfile} />
        </TabPanel>

        </Box>
      </Box>

      {/* WhatsApp support button */}
      <Box
        component="a"
        href="https://wa.me/447752300937?text=Hi%2C%20I%20need%20help%20with%20my%20Bookriightly%20dashboard"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          position: "fixed",
          bottom: isMobile ? "calc(90px + env(safe-area-inset-bottom, 0px))" : 24,
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
