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
import ServicesTab  from "../components/dashboard/tabs/ServicesTab";
import ReviewsTab   from "../components/dashboard/tabs/ReviewsTab";
import FinanceTab   from "../components/dashboard/tabs/FinanceTab";
import DesignTab    from "../components/dashboard/tabs/DesignTab";
import PayTab       from "../components/dashboard/tabs/PayTab";
import DomainTab    from "../components/dashboard/tabs/DomainTab";

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

  // ── Tab config ────────────────────────────────────────────────────────────
  // NOTE: Domain tab is intentionally excluded for staff — only owners see it.
  const brandColor = profile.brandColor || "#C9A84C";

  const tabs = [
    { label: "Schedule", icon: <AccessTimeIcon /> },
    { label: "Bookings", icon: <StoreIcon /> },
    { label: "Profile",  icon: <PersonIcon /> },
    { label: "Services", icon: <ListIcon /> },
    ...(userRole.isOwner ? [{ label: "Reviews", icon: <ReviewsIcon /> }]  : []),
    { label: "Finance",  icon: <PaymentsIcon /> },
    ...(userRole.isOwner ? [{ label: "Design",  icon: <PaletteIcon /> }]  : []),
    // Domain tab: owner only AND not inside a tenant dashboard
    ...(userRole.isOwner && !initialTenant ? [{ label: "Domain", icon: <LanguageIcon /> }] : []),
    { label: "Pay",      icon: <NfcIcon /> },
  ];

  // Derive tab indices dynamically based on role so panels always align
  const IDX_REVIEWS = 4;
  const IDX_FINANCE = userRole.isOwner ? 5 : 4;
  const IDX_DESIGN  = 6;  // owner only
  const IDX_DOMAIN  = 7;  // owner only
  const IDX_PAY = userRole.isOwner ? (initialTenant ? 7 : 8) : 5;

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (authLoading || (dataLoading && !barber)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ pb: isMobile ? 12 : 6, bgcolor: "#F8F9FA", minHeight: "100vh" }}>
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

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, md: 3 }, mt: 3 }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: "1px solid #eee" }}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={isMobile ? "" : t.label} />
          ))}
        </Tabs>

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

        {/* ── 2 Profile (staff + owners) ──
              ProfileTab contains Instagram & TikTok fields for ALL barbers.
              Facebook is owner-only (gated inside ProfileTab via userRole.isOwner).
              Domain tab is NOT shown to staff — see tab array above.            */}
        <TabPanel value={tab} index={2}>
          <ProfileTab
            profile={profile} setProfile={setProfile}
            brandColor={brandColor} userRole={userRole}
            profilePreview={profilePreview}
            setProfileFile={setProfileFile} setProfilePreview={setProfilePreview}
            handleDeleteProfile={handleDeleteProfile}
            handleImageChange={handleImageChange}
          />
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

        {/* ── 4 Reviews (owner only) ── */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={IDX_REVIEWS}>
            <ReviewsTab
              reviews={reviews}
              onDeleteReview={handleDeleteReview}
            />
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
      </Box>
    </Box>
  );
}