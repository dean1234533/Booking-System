import React, { useState, useEffect, useRef } from "react";
import {
  Box, Snackbar, Tabs, Tab, CircularProgress,
  useMediaQuery, useTheme
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  ListAlt as ListIcon,
  Reviews as ReviewsIcon,
  Payments as PaymentsIcon,
  Palette as PaletteIcon,
  Nfc as NfcIcon,
  Language as LanguageIcon,
  CalendarMonth as CalendarMonthIcon,
  Receipt as ReceiptIcon,
  FitnessCenter as FitnessCenterIcon,
  Assignment as AssignmentIcon,
  ColorLens as ColorLensIcon,
  RequestQuote as RequestQuoteIcon,
  Today as TodayIcon,
  People as PeopleIcon,
  RestaurantMenu as RestaurantMenuIcon,
  ContentCut as ContentCutIcon,
  Web as WebIcon,
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
  getDoc, updateDoc, deleteDoc, setDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

// ── Sub-components ────────────────────────────────────────────────────────────
import DashboardHeader     from "../components/dashboard/DashboardHeader";
import ManualBookingDialog from "../components/dashboard/ManualBookingDialog";
import ScheduleTab  from "../components/dashboard/tabs/ScheduleTab";
import BookingsTab  from "../components/dashboard/tabs/BookingsTab";
import ProfileTab   from "../components/dashboard/tabs/ProfileTab";
import EditPageTab  from "../components/dashboard/tabs/EditPageTab";
import ServicesTab  from "../components/dashboard/tabs/ServicesTab";
import ReviewsTab   from "../components/dashboard/tabs/ReviewsTab";
import FinanceTab   from "../components/dashboard/tabs/FinanceTab";
import PayTab       from "../components/dashboard/tabs/PayTab";
import DomainTab    from "../components/dashboard/tabs/DomainTab";
import InvoiceTab   from "../components/dashboard/tabs/InvoiceTab";
import WorkoutPlansTab  from "../components/dashboard/tabs/WorkoutPlansTab";
import ColourApprovalTab  from "../components/dashboard/tabs/ColourApprovalTab";
import QuoteTab           from "../components/dashboard/tabs/QuoteTab";
import DayPlannerTab      from "../components/dashboard/tabs/DayPlannerTab";
import QueueManagementTab from "../components/dashboard/tabs/QueueManagementTab";
import FoodGeneratorTab  from "../components/dashboard/tabs/FoodGeneratorTab";
import BrandSiteTab      from "../components/dashboard/tabs/BrandSiteTab";
import ClientFormsTab    from "../components/dashboard/tabs/ClientFormsTab";
import HaircutTab        from "../components/dashboard/tabs/HaircutTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
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

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState(0);
  const [slideDir,     setSlideDir]     = useState("right");
  const touchStartX = useRef(null);
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
    stripeConnected: false, stripeAccountId: "",
    subscriptionStatus: "", trialEndsAt: null,
    stripeCustomerId: "", stripeSubscriptionId: "",
    // ── Social links — editable by ALL barbers (staff + owners) ──
    instagramUrl: "", tiktokUrl: "", facebookUrl: "",
    privacyPolicy: "", termsConditions: "",
    domainStatus: "",
    customHostnameId: "",
    navBgColor: "", footerBgColor: "",
    // ── Contact / social (shared across all types) ──
    phone: "", businessEmail: "", contactEmail: "",
    // ── Font ──
    siteFont: "",
    // ── Hero content (hairdresser / decorator / barber) ──
    heroTagline: "", heroHeadingLine1: "", heroHeadingLine2: "",
    heroSubtext: "", heroCtaText: "", heroReviewText: "",
    // ── About section ──
    aboutHeading: "", aboutTagline: "", aboutQuote: "",
    // ── Services section ──
    servicesHeading: "", servicesImage: "",
    // ── Portfolio (decorator) ──
    portfolioHeading: "", portfolioSubtext: "",
    portfolioItems: [],
    // ── Stats (shared keys used by hairdresser/decorator/barber) ──
    stat1Value: "", stat1Label: "",
    stat2Value: "", stat2Label: "",
    stat3Value: "", stat3Label: "",
    stat4Value: "", stat4Label: "",
    // ── PT-specific website content ──
    heroTitle: "", heroSubtitle: "", heroBgImage: "",
    coachName: "",
    aboutText1: "", aboutText2: "",
    statBar1Num: "", statBar1Label: "",
    statBar2Num: "", statBar2Label: "",
    statBar3Num: "", statBar3Label: "",
    youtubeUrl: "",
    specializations: [], pricingPlans: [],
  });

  const [bookings,    setBookings]    = useState([]);
  const [slots,        setSlots]       = useState([]);
  const [reviews,      setReviews]     = useState([]);
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
  const handledTabParam = useRef(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);
  useEffect(() => { if (!authLoading && barber) loadData(); }, [barber, authLoading]);

  // ── Handle post-Stripe-connect redirect ───────────────────────────────────
  useEffect(() => {
    if (!barber?.uid) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("stripeSuccess") !== "true") return;

    window.history.replaceState({}, "", "/dashboard");

    const acct = params.get("acct");
    if (!acct || acct === "undefined") {
      setToast("Stripe connection incomplete — no account returned.");
      return;
    }

    (async () => {
      try {
        const res  = await fetch("/api/stripe/callback", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userId: barber.uid, stripeAccountId: acct }),
        });
        const data = await res.json();

        if (data.connected) {
          setProfile(prev => ({ ...prev, stripeConnected: true }));
          setToast("🎉 Stripe connected!");
        } else {
          setToast("Stripe onboarding incomplete — please connect again to finish.");
        }
      } catch (e) {
        console.error("Post-Stripe callback failed:", e);
        setToast("Could not verify Stripe connection. Please refresh.");
      }
    })();
  }, [barber]);

  // ── Handle post-subscription-checkout redirect ────────────────────────────
  useEffect(() => {
    if (!barber?.uid) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscriptionSuccess") !== "true") return;
    window.history.replaceState({}, "", "/dashboard");
    setToast("🎉 Subscription activated! Your site is now live.");
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barber]);

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
          navBgColor:       data.navBgColor       || "",
          footerBgColor:    data.footerBgColor    || "",
          // ── Contact / social ──
          phone:            data.phone            || "",
          businessEmail:    data.businessEmail    || "",
          contactEmail:     data.contactEmail     || "",
          // ── Font ──
          siteFont:         data.siteFont         || "",
          // ── Hero content ──
          heroTagline:      data.heroTagline      || "",
          heroHeadingLine1: data.heroHeadingLine1 || "",
          heroHeadingLine2: data.heroHeadingLine2 || "",
          heroSubtext:      data.heroSubtext      || "",
          heroCtaText:      data.heroCtaText      || "",
          heroReviewText:   data.heroReviewText   || "",
          // ── About ──
          aboutHeading:     data.aboutHeading     || "",
          aboutTagline:     data.aboutTagline     || "",
          aboutQuote:       data.aboutQuote       || "",
          // ── Services ──
          servicesHeading:  data.servicesHeading  || "",
          servicesImage:    data.servicesImage    || "",
          // ── Portfolio ──
          portfolioHeading: data.portfolioHeading || "",
          portfolioSubtext: data.portfolioSubtext || "",
          portfolioItems:   Array.isArray(data.portfolioItems) ? data.portfolioItems : [],
          // ── Stats ──
          stat1Value: data.stat1Value || "", stat1Label: data.stat1Label || "",
          stat2Value: data.stat2Value || "", stat2Label: data.stat2Label || "",
          stat3Value: data.stat3Value || "", stat3Label: data.stat3Label || "",
          stat4Value: data.stat4Value || "", stat4Label: data.stat4Label || "",
          // ── PT website content ──
          heroTitle:        data.heroTitle        || "",
          heroSubtitle:     data.heroSubtitle     || "",
          heroBgImage:      data.heroBgImage      || "",
          coachName:        data.coachName        || "",
          aboutText1:       data.aboutText1       || "",
          aboutText2:       data.aboutText2       || "",
          statBar1Num:      data.statBar1Num      || "",
          statBar1Label:    data.statBar1Label    || "",
          statBar2Num:      data.statBar2Num      || "",
          statBar2Label:    data.statBar2Label    || "",
          statBar3Num:      data.statBar3Num      || "",
          statBar3Label:    data.statBar3Label    || "",
          youtubeUrl:       data.youtubeUrl       || "",
          specializations:  Array.isArray(data.specializations) ? data.specializations : [],
          pricingPlans:     Array.isArray(data.pricingPlans)    ? data.pricingPlans    : [],
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
        instagramUrl: profile.instagramUrl  || "",
        tiktokUrl:    profile.tiktokUrl     || "",
        facebookUrl:  profile.facebookUrl   || "",
      };
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
      if (profileFile)    { const c = await imageCompression(profileFile, options);     updatedData.profilePic      = await uploadBarberImage(c, barber.uid, "profile_pic"); }
      if (logoFile)       { const c = await imageCompression(logoFile, options);        updatedData.logoUrl         = await uploadBarberImage(c, barber.uid, "business_logo"); }
      if (heroFileDesktop){ const c = await imageCompression(heroFileDesktop, options); updatedData.heroImage       = await uploadBarberImage(c, barber.uid, "hero_banner_desktop"); }
      if (heroFileMobile) { const c = await imageCompression(heroFileMobile, options);  updatedData.heroImageMobile = await uploadBarberImage(c, barber.uid, "hero_banner_mobile"); }

      await updateBarber(barber.uid, updatedData);

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
          amount:         Math.round(Number(terminalAmount) * 100),
          currency:       "gbp",
          description:    terminalService || terminalNote || "Haircut",
          barberId:       barber.uid,
          barberName:     profile.name || profile.businessName || "Barber",
          barberStripeId: profile.stripeAccountId || "",
          note:           terminalNote,
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

  // ── Tab config ────────────────────────────────────────────────────────────
  const brandColor   = profile.brandColor || "#C9A84C";
  const textOnBrand = (() => {
    const r = parseInt(brandColor.slice(1, 3), 16) || 0;
    const g = parseInt(brandColor.slice(3, 5), 16) || 0;
    const b = parseInt(brandColor.slice(5, 7), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#ffffff";
  })();
  const isBarber      = !profile.businessType || profile.businessType === "barber";
  const isTrainer     = profile.businessType === "trainer";
  const isDecorator   = profile.businessType === "decorator";
  const isHairdresser = profile.businessType === "hairdresser";
  const isOwner     = userRole.isOwner;

  const tabs = [
    { key: "schedule",  label: "Schedule",  icon: <AccessTimeIcon /> },
    { key: "bookings",  label: "Bookings",  icon: <StoreIcon /> },
    isBarber
      ? { key: "profile",   label: "Profile",   icon: <PersonIcon /> }
      : { key: "editpage",  label: "Edit Page",  icon: <WebIcon /> },
    { key: "services",  label: "Services",  icon: <ListIcon /> },
    ...(isOwner ? [{ key: "reviews",    label: "Reviews",    icon: <ReviewsIcon /> }]  : []),
    ...(isOwner && isBarber ? [{ key: "queue",        label: "Queue",           icon: <PeopleIcon /> }]      : []),
    ...(isOwner && isBarber ? [{ key: "haircutrecords", label: "Client Records", icon: <ContentCutIcon /> }] : []),
    { key: "finance",   label: "Finance",   icon: <PaymentsIcon /> },
    ...(isOwner && (!initialTenant || isBarber || isHairdresser) ? [{ key: "brand",   label: "Brand & Site",   icon: <PaletteIcon /> }] : []),
    ...(isOwner && !initialTenant ? [{ key: "domain", label: "Domain", icon: <LanguageIcon /> }] : []),
    ...(isOwner && !initialTenant ? [{ key: "invoices",  label: "Invoices",  icon: <ReceiptIcon /> }] : []),
    ...(isOwner && isTrainer && !initialTenant ? [{ key: "workouts",    label: "Workouts",     icon: <FitnessCenterIcon /> }] : []),
    ...(isOwner && isTrainer && !initialTenant ? [{ key: "clientforms", label: "Client Forms", icon: <AssignmentIcon /> }]   : []),
    ...(isOwner && isTrainer && !initialTenant ? [{ key: "foodgen",     label: "Food Gen",     icon: <RestaurantMenuIcon /> }] : []),
    ...(isOwner || initialTenant ? [{ key: "pay", label: "Pay", icon: <NfcIcon /> }] : []),
    ...(isOwner && isDecorator ? [{ key: "colours",  label: "Colours",    icon: <ColorLensIcon /> }]   : []),
    ...(isOwner && isDecorator ? [{ key: "quotes",   label: "Quotes",     icon: <RequestQuoteIcon /> }]: []),
    ...(isOwner && isDecorator ? [{ key: "dayplan",  label: "Day Plan",   icon: <TodayIcon /> }]       : []),
  ];

  const tabIdx = (key) => tabs.findIndex(t => t.key === key);

  // ── Onboarding deep-link: ?tab=domain / ?tab=finance etc. ────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!barber?.uid || dataLoading || handledTabParam.current) return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (!tabParam) return;
    handledTabParam.current = true;
    window.history.replaceState({}, "", "/dashboard");
    const idx = tabIdx(tabParam);
    if (idx >= 0) setTab(idx);
  }, [barber, dataLoading, profile.businessType, userRole.isOwner]);

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (authLoading || (dataLoading && !barber)) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#0a0a0a" }}>
        <CircularProgress sx={{ color: brandColor }} thickness={2} size={48} />
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ pb: isMobile ? 12 : 6, minHeight: "100vh", background: `radial-gradient(ellipse 90% 30% at 50% 0%, ${brandColor}09 0%, transparent 65%), #0a0a0a` }}>
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
        setProfile={setProfile}
        profilePreview={profilePreview}
        brandColor={brandColor}
        uploading={uploading}
        handleLogout={handleLogout}
        handleSaveProfile={handleSaveProfile}
      />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, md: 3 }, mt: 3 }}>

        {/* ── Lapsed subscription overlay (owner's own dashboard only) ── */}
        {!initialTenant && isOwner && (profile.subscriptionStatus === "past_due" || profile.subscriptionStatus === "canceled") && (
          <Box sx={{
            position: "fixed", inset: 0, zIndex: 1200,
            bgcolor: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            px: 2,
          }}>
            <Box sx={{
              bgcolor: "#111",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 3,
              p: { xs: 4, md: 5 },
              maxWidth: 460,
              width: "100%",
              textAlign: "center",
            }}>
              <Box sx={{ fontSize: 48, mb: 2 }}>⚠️</Box>
              <Box component="h2" sx={{ m: 0, mb: 1.5, color: "#fff", fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", fontWeight: 800 }}>
                {profile.subscriptionStatus === "canceled" ? "Subscription cancelled" : "Subscription lapsed"}
              </Box>
              <Box component="p" sx={{ m: 0, mb: 3, color: "#9ca3af", fontSize: "0.9rem", lineHeight: 1.75 }}>
                {profile.subscriptionStatus === "canceled"
                  ? "Your subscription has been cancelled. Reactivate to bring your booking site back online and regain full dashboard access."
                  : "Your last payment failed. Reactivate your subscription to bring your site back online and unlock your dashboard."
                }
              </Box>
              <Button
                variant="contained"
                onClick={async () => {
                  if (!barber?.uid || !barber?.email) return;
                  const res  = await fetch("/api/create-subscription", {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ barberId: barber.uid, email: barber.email }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                }}
                sx={{
                  bgcolor: "#C9A84C", color: "#0d0d0d",
                  fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.06em",
                  px: 5, py: 1.5,
                  "&:hover": { bgcolor: "#b8943e" },
                }}
              >
                Reactivate — £10/month
              </Button>
              <Box sx={{ mt: 2 }}>
                <Box
                  component="button"
                  onClick={handleLogout}
                  sx={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#6b7280", fontSize: "0.8rem",
                    "&:hover": { color: "#9ca3af" },
                  }}
                >
                  Log out
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {/* ── Premium pill tab bar ── */}
        <Box sx={{
          bgcolor: "#111",
          border: "1px solid rgba(255,255,255,0.06)",
          mb: 3,
          px: 0.75,
          py: 0.75,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)`,
        }}>
          <Tabs
            value={tab}
            onChange={(_, v) => { setSlideDir(v > tab ? "right" : "left"); setTab(v); }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTabs-scrollButtons": { color: "rgba(255,255,255,0.35)" },
              "& .MuiTab-root": {
                color: "rgba(255,255,255,0.35)",
                minHeight: 40,
                borderRadius: 0,
                px: { xs: 1.5, sm: 2 },
                fontSize: "0.71rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
                transition: "color .18s, background-color .18s",
                "& .MuiSvgIcon-root": { color: "rgba(255,255,255,0.28)", fontSize: "1rem" },
              },
              "& .MuiTab-root:hover:not(.Mui-selected)": {
                color: "rgba(255,255,255,0.6)",
                bgcolor: "rgba(255,255,255,0.04)",
              },
              "& .MuiTab-root.Mui-selected": {
                color: textOnBrand,
                bgcolor: brandColor,
                fontWeight: 700,
                boxShadow: `0 0 14px ${brandColor}45`,
                "& .MuiSvgIcon-root": { color: textOnBrand },
              },
            }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} icon={t.icon} iconPosition="start" label={isMobile ? "" : t.label} />
            ))}
          </Tabs>
        </Box>

        <style>{`
          @keyframes dashSlideInR { from { opacity: 0; transform: translateX(42px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes dashSlideInL { from { opacity: 0; transform: translateX(-42px); } to { opacity: 1; transform: translateX(0); } }
        `}</style>

        <Box
          key={tab}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if      (dx < -55 && tab < tabs.length - 1) { setSlideDir("right"); setTab(t => t + 1); }
            else if (dx >  55 && tab > 0)               { setSlideDir("left");  setTab(t => t - 1); }
          }}
          sx={{
            animation: `${slideDir === "right" ? "dashSlideInR" : "dashSlideInL"} 0.26s cubic-bezier(0.4,0,0.2,1) both`,
            overflow: "hidden",
          }}
        >

        {/* ── 0 Schedule ── */}
        <TabPanel value={tab} index={0}>
          <ScheduleTab
            slots={slots} newSlot={newSlot} setNewSlot={setNewSlot}
            handleAddSlot={handleAddSlot} handleDeleteSlot={handleDeleteSlot}
            handleRestoreSlot={handleRestoreSlot} openManualBooking={openManualBooking}
            brandColor={brandColor}
          />
        </TabPanel>

        {/* ── 1 Bookings ── */}
        <TabPanel value={tab} index={1}>
          <BookingsTab
            bookings={bookings} isMobile={isMobile} brandColor={brandColor}
            handleCompleteBooking={handleCompleteBooking}
            handleCancelBooking={handleCancelBooking}
          />
        </TabPanel>

        {/* ── 2 Profile (barber) / Edit Page (decorator, hairdresser, trainer) ── */}
        <TabPanel value={tab} index={2}>
          {isBarber ? (
            <ProfileTab
              profile={profile} setProfile={setProfile}
              brandColor={brandColor} userRole={userRole}
              profilePreview={profilePreview}
              setProfileFile={setProfileFile} setProfilePreview={setProfilePreview}
              handleDeleteProfile={handleDeleteProfile}
              handleImageChange={handleImageChange}
            />
          ) : (
            <EditPageTab
              profile={profile} setProfile={setProfile}
              brandColor={brandColor} userRole={userRole}
              profilePreview={profilePreview}
              setProfileFile={setProfileFile} setProfilePreview={setProfilePreview}
              handleDeleteProfile={handleDeleteProfile}
              handleImageChange={handleImageChange}
              businessType={profile.businessType}
            />
          )}
        </TabPanel>

        {/* ── 3 Services ── */}
        <TabPanel value={tab} index={3}>
          <ServicesTab
            profile={profile}
            newService={newService} setNewService={setNewService}
            handleAddService={handleAddService} handleRemoveService={handleRemoveService}
            brandColor={brandColor}
          />
        </TabPanel>

        {/* ── Reviews (all owner types) ── */}
        {isOwner && (
          <TabPanel value={tab} index={tabIdx("reviews")}>
            <ReviewsTab
              reviews={reviews}
              onDeleteReview={handleDeleteReview}
            />
          </TabPanel>
        )}

        {/* ── Finance ── */}
        <TabPanel value={tab} index={tabIdx("finance")}>
          <FinanceTab
            barber={barber}
            profile={profile} setProfile={setProfile} userRole={userRole}
            stripeLoading={stripeLoading} handleConnectStripe={handleConnectStripe}
            hideDeposit={Boolean(initialTenant) && !isBarber}
          />
        </TabPanel>

        {/* ── Brand & Site (owner — Branding always, Website Content if not tenant) ── */}
        {isOwner && (!initialTenant || isBarber || isHairdresser) && (
          <TabPanel value={tab} index={tabIdx("brand")}>
            <BrandSiteTab
              profile={profile} setProfile={setProfile}
              brandColor={brandColor}
              businessType={profile.businessType}
              showWebsite={!initialTenant && isBarber}
              logoPreview={logoPreview}               setLogoFile={setLogoFile}               setLogoPreview={setLogoPreview}
              heroPreviewDesktop={heroPreviewDesktop} setHeroFileDesktop={setHeroFileDesktop} setHeroPreviewDesktop={setHeroPreviewDesktop}
              heroPreviewMobile={heroPreviewMobile}   setHeroFileMobile={setHeroFileMobile}   setHeroPreviewMobile={setHeroPreviewMobile}
              handleImageChange={handleImageChange}
            />
          </TabPanel>
        )}

        {/* ── Domain (owner only, no tenant context) ── */}
        {isOwner && !initialTenant && (
          <TabPanel value={tab} index={tabIdx("domain")}>
            <DomainTab
              profile={profile}
              barber={barber}
              brandColor={brandColor}
            />
          </TabPanel>
        )}

        {/* ── Invoices (owner on own dashboard only) ── */}
        {isOwner && !initialTenant && (
          <TabPanel value={tab} index={tabIdx("invoices")}>
            <InvoiceTab
              barber={barber}
              profile={profile}
              brandColor={brandColor}
            />
          </TabPanel>
        )}

        {/* ── Workout Plans (trainer owner only) ── */}
        {isOwner && isTrainer && (
          <TabPanel value={tab} index={tabIdx("workouts")}>
            <WorkoutPlansTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Client Forms — Food Diary + Check-In (trainer owner only) ── */}
        {isOwner && isTrainer && (
          <TabPanel value={tab} index={tabIdx("clientforms")}>
            <ClientFormsTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Food Generator (trainer owner only) ── */}
        {isOwner && isTrainer && (
          <TabPanel value={tab} index={tabIdx("foodgen")}>
            <FoodGeneratorTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Pay / Tap-to-Pay (owners + staff in tenant context) ── */}
        {(isOwner || initialTenant) && (
          <TabPanel value={tab} index={tabIdx("pay")}>
            <PayTab
              profile={profile} barber={barber}
              setTab={setTab} financeTabIndex={tabIdx("finance")} brandColor={brandColor}
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
        )}

        {/* ── Queue Management (barber owner only) ── */}
        {isOwner && isBarber && (
          <TabPanel value={tab} index={tabIdx("queue")}>
            <QueueManagementTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Haircut Records (barber owner only) ── */}
        {isOwner && isBarber && (
          <TabPanel value={tab} index={tabIdx("haircutrecords")}>
            <HaircutTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Colour Approval (decorator owner only) ── */}
        {isOwner && isDecorator && (
          <TabPanel value={tab} index={tabIdx("colours")}>
            <ColourApprovalTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Quote Generator (decorator owner only) ── */}
        {isOwner && isDecorator && (
          <TabPanel value={tab} index={tabIdx("quotes")}>
            <QuoteTab barber={barber} profile={profile} brandColor={brandColor} />
          </TabPanel>
        )}

        {/* ── Day Planner (decorator owner only) ── */}
        {isOwner && isDecorator && (
          <TabPanel value={tab} index={tabIdx("dayplan")}>
            <DayPlannerTab barber={barber} brandColor={brandColor} />
          </TabPanel>
        )}

        </Box>{/* end slide wrapper */}
      </Box>

    </Box>
  );
}