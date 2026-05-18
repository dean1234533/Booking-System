import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Grid, Paper, Tabs, Tab, TextField,
  Button, CircularProgress, Avatar, Snackbar, IconButton,
  Card, CardContent, useMediaQuery, useTheme,
  Rating, Alert, Divider, InputAdornment, Chip, Link,
  Stack, MenuItem, Select, FormControl, InputLabel, Dialog,
  DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Palette as PaletteIcon,
  AddCircle as AddCircleIcon,
  AccessTime as AccessTimeIcon,
  Store as StoreIcon,
  Payments as PaymentsIcon,
  ListAlt as ListIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Reviews as ReviewsIcon,
  Logout as LogoutIcon,
  Language as LanguageIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Replay as ReplayIcon,
  OpenInNew as OpenInNewIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  Gavel as GavelIcon,
  Cancel as CancelIcon,
  Smartphone as MobileIcon,
  DesktopWindows as DesktopIcon,
  CalendarMonth as CalendarIcon,
  PhoneInTalk as PhoneIcon,
  PersonAdd as PersonAddIcon,
  EditCalendar as EditCalendarIcon,
  Nfc as NfcIcon,
  QrCode as QrCodeIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";

import imageCompression from "browser-image-compression";
import { useAuth } from "../hooks/useAuth";
import {
  updateBarber,
  addSlot,
  getProfessionalSlots,
  deleteSlot,
  uploadBarberImage,
} from "../firebase/firestore";

import { deleteBarberAccountData } from "../utils/deleteHelper";
import { getBarberEmail, getStoredFee } from "../utils/bookingHelpers";

import {
  collection, getDocs, doc, query, where, getDoc,
  updateDoc, deleteDoc, addDoc, setDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";

// ─── Helpers ───────────────────────────────────────────────────────

const addDays = (dateStr, days) => {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

const safeRenderOpeningHours = (val) => {
  if (!val) return "";
  if (typeof val === "object") return "Schedule Set (Object)";
  return val;
};

// Converts "HH:MM" → total minutes for arithmetic
const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Groups slots by consecutive blocks (no gap > 0 min between end of one and start of next).
 * Assumes slots are all on the same date and sorted by time.
 */
const groupConsecutiveSlots = (slots) => {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) =>
    timeToMinutes(a.time) - timeToMinutes(b.time)
  );

  const blocks = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // If gap between slots is ≤ 30 min, treat as same block
    const gap = timeToMinutes(curr.time) - timeToMinutes(prev.time);
    if (gap <= 30) {
      current.push(curr);
    } else {
      blocks.push(current);
      current = [curr];
    }
  }
  blocks.push(current);
  return blocks;
};

// ─── Manual Booking Dialog ──────────────────────────────────────────

function ManualBookingDialog({ open, onClose, slot, barber, profile, onBooked }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState({
    name: "", phone: "", email: "",
    service: "", notes: "", gender: ""
  });

  const services = profile?.services || [];

  const handleBook = async () => {
    if (!client.name || !slot) return;
    setSaving(true);
    try {
      // 1. Create a booking document
      const bookingsRef = collection(db, "bookings");
      const newBookingRef = doc(bookingsRef);
      await setDoc(newBookingRef, {
        barberId: barber.uid,
        slotId: slot.id,
        date: slot.date,
        time: slot.time,
        customerName: client.name,
        customerPhone: client.phone,
        customerEmail: client.email,
        serviceName: client.service,
        gender: client.gender,
        notes: client.notes,
        depositAmount: 0,
        status: "confirmed",
        source: "manual", // distinguish from online bookings
        createdAt: new Date().toISOString(),
      });

      // 2. Mark the slot as booked so it vanishes from online picker
      await updateDoc(doc(db, "slots", slot.id), {
        isBooked: true,
        status: "booked",
        manualBookingId: newBookingRef.id,
      });

      onBooked();
      onClose();
      setClient({ name: "", phone: "", email: "", service: "", notes: "", gender: "" });
      setStep(0);
    } catch (err) {
      console.error("Manual booking failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const steps = ["Choose Slot", "Client Details", "Confirm"];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #eee", pb: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PhoneIcon sx={{ color: profile?.brandColor || "#C9A84C" }} />
          Manual Booking {slot ? `— ${slot.date} @ ${slot.time}` : ""}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            You've selected <strong>{slot?.time}</strong> on <strong>{slot?.date}</strong>.
            <br />Click "Next" to add client details.
          </Alert>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required label="Client Name" fullWidth value={client.name}
                onChange={e => setClient(p => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" fullWidth value={client.phone}
                onChange={e => setClient(p => ({ ...p, phone: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email (optional)" fullWidth value={client.email}
                onChange={e => setClient(p => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Service</InputLabel>
                <Select value={client.service} label="Service"
                  onChange={e => setClient(p => ({ ...p, service: e.target.value }))}>
                  <MenuItem value="">— None Selected —</MenuItem>
                  {services.map((s, i) => (
                    <MenuItem key={i} value={s.name}>{s.name} — £{s.price}</MenuItem>
                  ))}
                  <MenuItem value="Other">Other / Walk-in</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select value={client.gender} label="Gender"
                  onChange={e => setClient(p => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="">— Not specified —</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes / Special requests" fullWidth multiline rows={2}
                value={client.notes}
                onChange={e => setClient(p => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        )}

        {step === 2 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Ready to confirm this manual booking!
            </Alert>
            {[
              ["🗓 Date", slot?.date],
              ["⏰ Time", slot?.time],
              ["👤 Client", client.name || "—"],
              ["📱 Phone", client.phone || "—"],
              ["📧 Email", client.email || "—"],
              ["✂️ Service", client.service || "—"],
              ["📝 Notes", client.notes || "—"],
            ].map(([label, value]) => (
              <Box key={label} display="flex" gap={2} mb={1}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>{label}</Typography>
                <Typography variant="body2" fontWeight={700}>{value}</Typography>
              </Box>
            ))}
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2, fontSize: 12 }}>
              This slot will be <strong>removed from online availability</strong> immediately.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
        <Box flex={1} />
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        {step < 2 ? (
          <Button
            variant="contained"
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !client.name}
            sx={{ bgcolor: "#1A1A1A" }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            onClick={handleBook}
            disabled={saving}
          >
            {saving ? "Booking…" : "Confirm Booking"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────

export default function Dashboard() {
  const { barber, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [tab, setTab] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const [userRole, setUserRole] = useState({ isOwner: true, shopId: null });
  const [profile, setProfile] = useState({
    name: "", businessName: "", brandColor: "#C9A84C",
    services: [], depositAmount: 10,
    specialty: "", address: "", bio: "", role: "staff",
    openingHours: "", vercelUrl: "", aboutUs: "",
    profilePic: "", logoUrl: "", heroImage: "", heroImageMobile: "",
    stripeConnected: false, instagramUrl: "", facebookUrl: "",
    privacyPolicy: "", termsConditions: "",
  });

  const [bookings, setBookings] = useState([]);
  const [slots, setSlots] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newSlot, setNewSlot] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "", repeat: "none"
  });
  const [newService, setNewService] = useState({ name: "", price: "" });

  // Manual booking dialog state
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedSlotForManual, setSelectedSlotForManual] = useState(null);

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [heroFileDesktop, setHeroFileDesktop] = useState(null);
  const [heroPreviewDesktop, setHeroPreviewDesktop] = useState("");
  const [heroFileMobile, setHeroFileMobile] = useState(null);
  const [heroPreviewMobile, setHeroPreviewMobile] = useState("");

  // ─── Tap to Pay / Terminal state ───────────────────────────────────
  const [terminalAmount, setTerminalAmount] = useState("");
  const [terminalService, setTerminalService] = useState("");
  const [terminalNote, setTerminalNote] = useState("");
  // idle | loading | awaiting | paid | error
  const [terminalStatus, setTerminalStatus] = useState("idle");
  const [terminalSession, setTerminalSession] = useState(null); // { url, sessionId }
  const pollingRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (!authLoading && barber) loadData();
  }, [barber, authLoading]);

  useEffect(() => {
    if (!barber?.uid) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripeSuccess") !== "true") return;
    window.history.replaceState({}, "", "/dashboard");
    const acct = params.get("acct");

    const confirmStripe = async () => {
      try {
        if (acct) {
          await updateDoc(doc(db, "barbers", barber.uid), { stripeAccountId: acct });
        }
        const res = await fetch(`/api/check-stripe?userId=${barber.uid}`);
        const data = await res.json();
        if (data.connected) {
          setProfile(prev => ({ ...prev, stripeConnected: true }));
          setToast("🎉 Stripe connected!");
        }
      } catch (e) {
        console.error("Post-Stripe return check failed:", e);
      }
    };
    confirmStripe();
  }, [barber]);

  async function loadData() {
    if (!barber?.uid) return;
    try {
      setDataLoading(true);
      const userSnap = await getDoc(doc(db, "barbers", barber.uid));
      let isOwner = true;
      let activeShopId = barber.uid;

      if (userSnap.exists()) {
        const data = userSnap.data();
        isOwner = data?.role === "owner" || !data?.shopId || data?.shopId === "self";
        activeShopId = isOwner ? barber.uid : (data?.shopId ?? barber.uid);

        setProfile(prev => ({
          ...prev, ...data,
          services: Array.isArray(data.services) ? data.services : [],
          stripeConnected: !!data.stripeConnected,
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
          const rSnap = await getDocs(
            collection(db, "barbers", activeShopId, "reviews")
          );
          setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch { setReviews([]); }
      }
    } catch (err) {
      setToast("Error loading dashboard data");
    } finally {
      setDataLoading(false);
    }
  }

  const handleLogout = async () => {
    try { await logout(); navigate("/login"); }
    catch { setToast("Logout failed"); }
  };

  const handleDeleteProfile = async () => {
    const confirmMessage =
      "Are you sure? This will PERMANENTLY delete your profile, all available slots, and your login account. This cannot be undone.";
    if (!window.confirm(confirmMessage)) return;
    try {
      setDataLoading(true);
      await deleteBarberAccountData(barber.uid);
      setToast("Account and all associated data successfully wiped.");
      navigate("/");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setToast("Security: Please log out and back in before deleting your account.");
      } else {
        setToast("Failed to delete profile: " + err.message);
      }
    } finally {
      setDataLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const currentOrigin = profile.vercelUrl
        ? profile.vercelUrl.startsWith("http") ? profile.vercelUrl : `https://${profile.vercelUrl}`
        : window.location.origin;

      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: barber.uid, email: barber.email, origin: currentOrigin }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch (err) {
      setToast("Stripe failed: " + err.message);
    } finally {
      setStripeLoading(false);
    }
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
        ...profile, email: barber.email || "",
        vercelUrl: profile.vercelUrl || "",
        openingHours: profile.openingHours || "",
        aboutUs: profile.aboutUs || ""
      };
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };

      if (profileFile) {
        const compressed = await imageCompression(profileFile, options);
        updatedData.profilePic = await uploadBarberImage(compressed, barber.uid, "profile_pic");
      }
      if (logoFile) {
        const compressed = await imageCompression(logoFile, options);
        updatedData.logoUrl = await uploadBarberImage(compressed, barber.uid, "business_logo");
      }
      if (heroFileDesktop) {
        const compressed = await imageCompression(heroFileDesktop, options);
        updatedData.heroImage = await uploadBarberImage(compressed, barber.uid, "hero_banner_desktop");
      }
      if (heroFileMobile) {
        const compressed = await imageCompression(heroFileMobile, options);
        updatedData.heroImageMobile = await uploadBarberImage(compressed, barber.uid, "hero_banner_mobile");
      }

      await updateBarber(barber.uid, updatedData);

      if (!userRole.isOwner && userRole.shopId) {
        await updateDoc(
          doc(db, "barbers", userRole.shopId, "staff", barber.uid),
          updatedData
        );
      }

      setProfile(updatedData);
      setProfileFile(null); setLogoFile(null);
      setHeroFileDesktop(null); setHeroFileMobile(null);
      setProfilePreview(""); setLogoPreview("");
      setHeroPreviewDesktop(""); setHeroPreviewMobile("");
      setToast("Profile saved successfully!");
    } catch (err) {
      setToast("Save failed — " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAddSlot() {
    if (!newSlot.date || !newSlot.time || !barber?.uid) return;
    try {
      let iterations = 1;
      if (newSlot.repeat === "week") iterations = 7;
      if (newSlot.repeat === "month") iterations = 30;

      const promises = [];
      for (let i = 0; i < iterations; i++) {
        const targetDate = addDays(newSlot.date, i);
        promises.push(
          addSlot({
            date: targetDate, time: newSlot.time,
            barberId: barber.uid, shopId: userRole.shopId,
            isBooked: false, status: "open"
          })
        );
      }
      await Promise.all(promises);
      setNewSlot(prev => ({ ...prev, time: "", repeat: "none" }));
      setToast(iterations > 1 ? `Added ${iterations} slots!` : "Slot added!");
      const updated = await getProfessionalSlots(barber.uid);
      setSlots(updated || []);
    } catch { setToast("Failed to add slot"); }
  }

  async function handleDeleteSlot(slotId) {
    if (!barber?.uid) return;
    try {
      await deleteSlot(barber.uid, slotId);
      setToast("Slot removed");
      const updated = await getProfessionalSlots(barber.uid);
      setSlots(updated || []);
    } catch { setToast("Failed to remove slot"); }
  }

  async function handleRestoreSlot(slotId) {
    try {
      await updateDoc(doc(db, "slots", slotId), { isBooked: false, status: "open" });
      setToast("Slot restored!");
      const updated = await getProfessionalSlots(barber.uid);
      setSlots(updated || []);
    } catch { setToast("Failed to restore slot"); }
  }

  async function handleCompleteBooking(booking) {
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "completed" });
      if (booking.slotId) {
        await updateDoc(doc(db, "slots", booking.slotId), { status: "completed" });
      }
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: booking.customerEmail || booking.email,
          clientName: booking.customerName || "Customer",
          barberName: profile.name, businessName: profile.businessName,
          brandColor: profile.brandColor, slotDate: booking.date,
          slotTime: booking.time, bookingId: booking.id, barberId: barber.uid
        }),
      });
      const host = profile.vercelUrl
        ? profile.vercelUrl.replace(/^https?:\/\//, "")
        : window.location.host;
      const reviewLink = `https://${host}/review/${userRole.shopId}`;
      const message = `Hey ${booking.customerName || "there"}, thanks for visiting! I'd love a review: ${reviewLink}`;
      const phone = booking.customerPhone || booking.phone;
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
      } else {
        await navigator.clipboard.writeText(message);
        setToast("Completed! Review link copied.");
      }
      await loadData();
    } catch { setToast("Error updating booking"); }
  }

  async function handleCancelBooking(booking) {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel ${booking.customerName || "this"} booking? This will trigger an automatic refund if applicable.`
    );
    if (!confirmCancel) return;

    try {
      setDataLoading(true);

      if (booking.paymentIntentId) {
        try {
          const refundResponse = await fetch("/api/cancel-refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentIntentId: booking.paymentIntentId,
              stripeAccountId: userRole.shopId || booking.stripeAccountId || barber.uid,
              date: booking.date, time: booking.time
            }),
          });
          const refundResult = await refundResponse.json();
          if (!refundResponse.ok) {
            setToast(`Stripe Refund Warning: ${refundResult.error || "Failed to process automatic refund."}`);
          }
        } catch (stripeErr) {
          console.error("[handleCancelBooking] Stripe error:", stripeErr);
        }
      }

      await updateDoc(doc(db, "bookings", booking.id), { status: "cancelled" });

      if (booking.slotId) {
        try { await deleteDoc(doc(db, "slots", booking.slotId)); }
        catch (slotErr) { console.warn("Slot delete failed:", slotErr); }
      }

      try {
        const resolvedBarberEmail = getBarberEmail(barber);
        const { bookingFeePounds, depositPounds } = getStoredFee(booking);
        await fetch("/api/send-cancel-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barberEmail: resolvedBarberEmail,
            barberName: profile.name || barber.displayName || "The Barber",
            businessName: profile.businessName, brandColor: profile.brandColor,
            clientName: booking.customerName || booking.name || "Customer",
            clientEmail: booking.customerEmail || booking.email,
            clientPhone: booking.customerPhone || booking.phone,
            serviceName: booking.serviceName || booking.haircutStyle,
            slotDate: booking.date, slotTime: booking.time,
            bookingId: booking.id, depositAmount: depositPounds,
            bookingFee: bookingFeePounds, address: profile.address,
            notes: booking.notes || booking.additionalInfo,
          }),
        });
      } catch (emailErr) {
        console.error("[handleCancelBooking] Email fetch failed:", emailErr);
      }

      setToast("Booking successfully cancelled & automated operations complete.");
      await loadData();
    } catch (err) {
      console.error("Cancel booking failure:", err);
      setToast("Failed to process full cancellation routing.");
    } finally {
      setDataLoading(false);
    }
  }

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

  // ─── Open manual booking dialog for a slot ───
  function openManualBooking(slot) {
    setSelectedSlotForManual(slot);
    setManualDialogOpen(true);
  }

  // ─── Tap to Pay handlers ─────────────────────────────────────────

  const startPolling = (sessionId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/check-payment?sessionId=${sessionId}&barberId=${barber.uid}`);
        const data = await res.json();
        if (data.paid) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setTerminalStatus("paid");
          setToast("✅ Payment received!");
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 2500);
  };

  const handleCreateTerminalCharge = async () => {
    if (!terminalAmount || !barber?.uid) return;
    if (!profile.stripeConnected) {
      setToast("Connect Stripe first in the Finance tab.");
      return;
    }
    setTerminalStatus("loading");
    try {
      const res = await fetch("/api/quick-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(Number(terminalAmount) ), // pence
          currency: "gbp",
          description: terminalService || terminalNote || "Haircut",
          barberId: barber.uid,
          barberName: profile.name || profile.businessName || "Barber",
          note: terminalNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create charge");
      setTerminalSession({ url: data.url, sessionId: data.sessionId });
      setTerminalStatus("awaiting");
      startPolling(data.sessionId);
    } catch (err) {
      setTerminalStatus("error");
      setToast("Payment error: " + err.message);
    }
  };

  const handleCancelTerminal = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setTerminalStatus("idle");
    setTerminalSession(null);
  };

  const handleResetTerminal = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setTerminalStatus("idle");
    setTerminalSession(null);
    setTerminalAmount("");
    setTerminalService("");
    setTerminalNote("");
  };

  const handleCopyPayLink = async () => {
    if (!terminalSession?.url) return;
    try {
      await navigator.clipboard.writeText(terminalSession.url);
      setToast("Payment link copied!");
    } catch {
      setToast("Copy failed — try manually.");
    }
  };

  // ─── Tab config ──────────────────────────────────────────────────

  const brandColor = profile.brandColor || "#C9A84C";
  const tabs = [
    { label: "Schedule", icon: <AccessTimeIcon /> },
    { label: "Bookings", icon: <StoreIcon /> },
    { label: "Profile", icon: <PersonIcon /> },
    { label: "Services", icon: <ListIcon /> },
    ...(userRole.isOwner ? [{ label: "Reviews", icon: <ReviewsIcon /> }] : []),
    { label: "Finance", icon: <PaymentsIcon /> },
    ...(userRole.isOwner ? [{ label: "Design", icon: <PaletteIcon /> }] : []),
    { label: "Pay", icon: <NfcIcon /> },
  ];

  // Computed tab indices
  const financeTabIndex = userRole.isOwner ? 5 : 4;
  const designTabIndex  = 6; // owner only
  const payTabIndex     = userRole.isOwner ? 7 : 5;

  const filteredSlots = slots
    .filter(s => s.date === newSlot.date)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Group open slots on selected date for the reminder preview
  const openSlotsForDate = filteredSlots.filter(s =>
    !s.isBooked && s.status === "open"
  );
  const reminderBlocks = groupConsecutiveSlots(openSlotsForDate);

  const bookingsByDay = bookings
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((groups, booking) => {
      const day = booking.date || "Unknown Date";
      if (!groups[day]) groups[day] = [];
      groups[day].push(booking);
      return groups;
    }, {});

  if (authLoading || (dataLoading && !barber)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: isMobile ? 12 : 6, bgcolor: "#F8F9FA", minHeight: "100vh" }}>
      <Snackbar
        open={Boolean(toast)} autoHideDuration={4000}
        onClose={() => setToast(null)} message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      {/* ── Manual Booking Dialog ── */}
      <ManualBookingDialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        slot={selectedSlotForManual}
        barber={barber}
        profile={profile}
        onBooked={async () => {
          setToast("✅ Manual booking confirmed! Slot removed from online availability.");
          const updated = await getProfessionalSlots(barber.uid);
          setSlots(updated || []);
          await loadData();
        }}
      />

      {/* ── Top Bar ── */}
      <Box sx={{ bgcolor: "white", p: 2, borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 100 }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar src={profilePreview || profile.profilePic}
              sx={{ width: 46, height: 46, border: `2px solid ${brandColor}` }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
                {profile.name || "Dashboard"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userRole.isOwner ? "Shop Owner" : "Staff Barber"}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <IconButton onClick={handleLogout} color="error"><LogoutIcon /></IconButton>
            <Button variant="contained" onClick={handleSaveProfile} disabled={uploading}
              sx={{ bgcolor: "#1A1A1A", "&:hover": { bgcolor: "#333" } }}
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            >
              {uploading ? "Saving…" : "Save"}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, md: 3 }, mt: 3 }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: "1px solid #eee" }}
          variant={isMobile ? "scrollable" : "standard"} scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={isMobile ? "" : t.label} />
          ))}
        </Tabs>

        {/* ════════ TAB 0 — SCHEDULE ════════ */}
        <TabPanel value={tab} index={0}>

          {/* Add Slot Row */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={800} mb={2}>Manage Availability</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth type="date" label="Select Date" value={newSlot.date}
                  onChange={e => setNewSlot(prev => ({ ...prev, date: e.target.value }))}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth type="time" label="Time" value={newSlot.time}
                  onChange={e => setNewSlot(prev => ({ ...prev, time: e.target.value }))}
                  InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Repeat</InputLabel>
                  <Select value={newSlot.repeat} label="Repeat"
                    onChange={e => setNewSlot(prev => ({ ...prev, repeat: e.target.value }))}>
                    <MenuItem value="none">No Repeat</MenuItem>
                    <MenuItem value="week">Daily for 1 Week</MenuItem>
                    <MenuItem value="month">Daily for 1 Month</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button fullWidth variant="contained" onClick={handleAddSlot}
                  disabled={!newSlot.date || !newSlot.time}
                  sx={{ bgcolor: "#1A1A1A", height: "56px" }}>
                  Add Slot
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Reminder Blocks Preview */}
          {reminderBlocks.length > 0 && (
            <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, border: `1px dashed ${brandColor}`, bgcolor: `${brandColor}08` }}>
              <Typography variant="subtitle2" fontWeight={800} mb={1.5} sx={{ color: brandColor }}>
                🔔 Reminder Preview for {newSlot.date}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                You'll receive one reminder per block of consecutive slots, 1 hour before the first slot in each block.
              </Typography>
              <Stack spacing={1}>
                {reminderBlocks.map((block, idx) => (
                  <Box key={idx} sx={{
                    px: 2, py: 1, borderRadius: 2, bgcolor: "white",
                    border: "1px solid #eee", display: "flex", alignItems: "center", gap: 2
                  }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: brandColor }} />
                    <Box>
                      {block.length === 1 ? (
                        <Typography variant="body2" fontWeight={700}>
                          Single slot at <strong>{block[0].time}</strong> — reminder at{" "}
                          {(() => {
                            const [h, m] = block[0].time.split(":").map(Number);
                            const reminder = new Date(0, 0, 0, h, m - 60);
                            return `${String(reminder.getHours()).padStart(2, "0")}:${String(reminder.getMinutes()).padStart(2, "0")}`;
                          })()}
                        </Typography>
                      ) : (
                        <Typography variant="body2" fontWeight={700}>
                          Block of <strong>{block.length} slots</strong>:{" "}
                          {block[0].time} → {block[block.length - 1].time} — reminder at{" "}
                          {(() => {
                            const [h, m] = block[0].time.split(":").map(Number);
                            const reminder = new Date(0, 0, 0, h, m - 60);
                            return `${String(reminder.getHours()).padStart(2, "0")}:${String(reminder.getMinutes()).padStart(2, "0")}`;
                          })()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Slots Grid */}
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={700}>
              Slots for {newSlot.date || "Selected Date"}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {filteredSlots.length === 0 ? (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2, borderStyle: "dashed" }}>
                  <Typography color="text.secondary">No slots created for this date yet.</Typography>
                </Paper>
              </Grid>
            ) : (
              filteredSlots.map(s => {
                const isBooked = s.isBooked || s.status === "booked";
                const isDone = s.status === "completed";
                const isManual = s.manualBookingId || false;

                return (
                  <Grid item xs={12} sm={6} md={4} key={s.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2, borderRadius: 2, display: "flex",
                        justifyContent: "space-between", alignItems: "center",
                        bgcolor: isDone ? "#f5f5f5" : isBooked ? "#FFF8E1" : "white",
                        borderColor: isManual ? brandColor : undefined,
                        borderWidth: isManual ? 2 : 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{s.time}</Typography>
                        <Stack direction="row" spacing={0.5} mt={0.5}>
                          <Chip
                            size="small"
                            label={isDone ? "Done" : isBooked ? "Booked" : "Open"}
                            color={isDone ? "default" : isBooked ? "warning" : "success"}
                            sx={{ height: 20, fontSize: 10 }}
                          />
                          {isManual && (
                            <Chip
                              size="small" label="Manual"
                              sx={{ height: 20, fontSize: 10, bgcolor: brandColor, color: "white" }}
                            />
                          )}
                        </Stack>
                      </Box>
                      <Box display="flex" gap={0.5}>
                        {/* Manual booking button — only on OPEN slots */}
                        {!isBooked && !isDone && (
                          <IconButton
                            size="small"
                            title="Book this slot manually for a client"
                            onClick={() => openManualBooking(s)}
                            sx={{ color: brandColor }}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        )}
                        {(isBooked || isDone) && (
                          <IconButton size="small" color="primary" onClick={() => handleRestoreSlot(s.id)}>
                            <ReplayIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton size="small" color="error" onClick={() => handleDeleteSlot(s.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })
            )}
          </Grid>
        </TabPanel>

        {/* ════════ TAB 1 — BOOKINGS ════════ */}
        <TabPanel value={tab} index={1}>
          {bookings.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
              <Typography variant="h6">No current bookings</Typography>
            </Paper>
          ) : (
            Object.entries(bookingsByDay).map(([date, dayBookings]) => (
              <Box key={date} sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <CalendarIcon fontSize="small" sx={{ color: brandColor }} />
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: brandColor }}>
                    {new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric"
                    })}
                  </Typography>
                  <Chip size="small"
                    label={`${dayBookings.length} booking${dayBookings.length > 1 ? "s" : ""}`}
                    sx={{ height: 20, fontSize: 10 }} />
                </Box>
                {dayBookings.map(b => (
                  <Paper key={b.id} sx={{ p: 2.5, mb: 2, borderRadius: 3, borderLeft: `5px solid ${brandColor}` }}>
                    <Grid container alignItems="flex-start" spacing={1}>
                      <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontWeight={800} variant="subtitle1">
                              {b.customerName || b.name || "Client"}
                            </Typography>
                            {b.source === "manual" && (
                              <Chip size="small" label="📞 Phone booking"
                                sx={{ height: 20, fontSize: 10, bgcolor: `${brandColor}20`, color: brandColor, fontWeight: 700 }} />
                            )}
                          </Box>
                          <Chip size="small" label={`${b.date} @ ${b.time}`}
                            sx={{ bgcolor: brandColor, color: "white", fontWeight: 700, fontSize: 11 }} />
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={1}>
                          {[
                            ["📧 Email", b.email || b.customerEmail],
                            ["📱 Phone", b.phone || b.customerPhone],
                            ["✂️ Service", b.serviceName || b.haircutStyle],
                            ["👤 Gender", b.gender],
                            ["💰 Deposit", b.depositAmount ? `£${Number(b.depositAmount).toFixed(2)}` : null],
                            ["🪪 Ref", b.id?.slice(-8).toUpperCase()],
                          ].filter(([, val]) => val).map(([label, value]) => (
                            <Grid item xs={12} sm={6} key={label}>
                              <Box display="flex" gap={1} alignItems="center">
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ minWidth: 80 }}>
                                  {label}
                                </Typography>
                                <Typography variant="caption" fontWeight={800}>{value}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                      {(b.notes || b.additionalInfo) && (
                        <Grid item xs={12}>
                          <Box sx={{ mt: 1, p: 1.5, bgcolor: "#f8f9fa", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>📝 Notes</Typography>
                            <Typography variant="caption" display="block">{b.notes || b.additionalInfo}</Typography>
                          </Box>
                        </Grid>
                      )}
                      <Grid item xs={12} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1} justifyContent={isMobile ? "flex-start" : "flex-end"}>
                          <Button variant="outlined" color="error" size="small"
                            startIcon={<CancelIcon />} onClick={() => handleCancelBooking(b)}>
                            Cancel
                          </Button>
                          <Button variant="contained" color="success" size="small"
                            startIcon={<CheckCircleIcon />} onClick={() => handleCompleteBooking(b)}>
                            Complete
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            ))
          )}
        </TabPanel>

        {/* ════════ TAB 2 — PROFILE ════════ */}
        <TabPanel value={tab} index={2}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
              <Avatar src={profilePreview || profile.profilePic}
                sx={{ width: 100, height: 100, mb: 2, border: `3px solid ${brandColor}` }} />
              <Button variant="outlined" component="label" size="small">
                Change Photo
                <input type="file" hidden accept="image/*"
                  onChange={(e) => handleImageChange(e, setProfileFile, setProfilePreview)} />
              </Button>
            </Box>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField label="Full Name" value={profile.name || ""} fullWidth
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
              </Grid>
              {userRole.isOwner && (
                <Grid item xs={12} sm={6}>
                  <TextField label="Opening Times" value={safeRenderOpeningHours(profile.openingHours)}
                    fullWidth multiline rows={4}
                    placeholder={"e.g. Mon-Fri 9am-6pm\nSat: 10am-4pm\nSun: Closed"}
                    onChange={e => setProfile(p => ({ ...p, openingHours: e.target.value }))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                          <AccessTimeIcon fontSize="small" />
                        </InputAdornment>
                      )
                    }} />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField label="Phone" value={profile.phone || ""} fullWidth
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </Grid>
              {userRole.isOwner && (
                <Grid item xs={12} sm={6}>
                  <TextField label="Location / Address" value={profile.address || ""} fullWidth
                    onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField label="Specialty" value={profile.specialty || ""} fullWidth
                  onChange={e => setProfile(p => ({ ...p, specialty: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Personal Bio" value={profile.bio || ""} fullWidth multiline rows={2}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
              </Grid>
              {userRole.isOwner && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      <InstagramIcon sx={{ verticalAlign: "middle", mr: 1 }} /> Social Media
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Instagram URL" placeholder="https://instagram.com/handle"
                          fullWidth value={profile.instagramUrl || ""}
                          onChange={e => setProfile(p => ({ ...p, instagramUrl: e.target.value }))} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Facebook URL" placeholder="https://facebook.com/page"
                          fullWidth value={profile.facebookUrl || ""}
                          onChange={e => setProfile(p => ({ ...p, facebookUrl: e.target.value }))} />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      <InfoIcon sx={{ verticalAlign: "middle", mr: 1 }} /> Shop "About Us"
                    </Typography>
                    <TextField label="About Our Shop" value={profile.aboutUs || ""} fullWidth multiline rows={4}
                      placeholder="Tell customers about your shop history..."
                      onChange={e => setProfile(p => ({ ...p, aboutUs: e.target.value }))} />
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <Divider sx={{ my: 4 }} />
                <Typography variant="subtitle2" color="error" gutterBottom fontWeight={700}>Danger Zone</Typography>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteProfile}>
                  Delete My Profile
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        {/* ════════ TAB 3 — SERVICES ════════ */}
        <TabPanel value={tab} index={3}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6}>
                <TextField fullWidth label="Service Name" value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })} />
              </Grid>
              <Grid item xs={4}>
                <TextField fullWidth label="Price (£)" type="number" value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })} />
              </Grid>
              <Grid item xs={2}>
                <Button fullWidth variant="contained" sx={{ height: 56, bgcolor: brandColor }} onClick={handleAddService}>
                  <AddCircleIcon />
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {(profile.services || []).map((s, i) => (
            <Card key={i} sx={{ mb: 1.5, borderRadius: 2 }} variant="outlined">
              <CardContent sx={{ display: "flex", justifyContent: "space-between", py: "12px !important" }}>
                <Typography fontWeight={700}>{s.name} — £{s.price}</Typography>
                <IconButton color="error" size="small" onClick={() => handleRemoveService(i)}>
                  <DeleteIcon />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </TabPanel>

        {/* ════════ TAB 4 — REVIEWS (owner only) ════════ */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={4}>
            <Typography variant="h6" fontWeight={800} mb={3}>Reviews</Typography>
            {reviews.length === 0
              ? <Alert severity="info">No reviews yet.</Alert>
              : (
                <Grid container spacing={2}>
                  {reviews.map(rev => (
                    <Grid item xs={12} sm={6} key={rev.id}>
                      <Paper sx={{ p: 2, borderRadius: 3 }} variant="outlined">
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography fontWeight={800}>{rev.customerName || "Anonymous"}</Typography>
                          <Rating value={rev.rating} readOnly size="small" />
                        </Box>
                        <Typography variant="body2">{rev.comment}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )
            }
          </TabPanel>
        )}

        {/* ════════ TAB 5 — FINANCE ════════ */}
        <TabPanel value={tab} index={financeTabIndex}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={800} mb={2}>Payments</Typography>
                {profile.stripeConnected
                  ? <Alert severity="success" sx={{ mb: 2 }}>✅ Stripe Connected</Alert>
                  : (
                    <Button variant="contained"
                      startIcon={stripeLoading ? <CircularProgress size={16} color="inherit" /> : <PaymentsIcon />}
                      onClick={handleConnectStripe} disabled={stripeLoading}
                      sx={{ bgcolor: "#635BFF", mb: 2 }}>
                      {stripeLoading ? "Connecting..." : "Connect with Stripe"}
                    </Button>
                  )
                }
                <Divider sx={{ my: 2 }} />
                <TextField
                  label="Default Deposit Amount (£)" type="number" fullWidth
                  value={profile.depositAmount}
                  onChange={(e) => setProfile({ ...profile, depositAmount: e.target.value })}
                  inputProps={{ min: 10 }}
                  error={Number(profile.depositAmount) < 10}
                  helperText={Number(profile.depositAmount) < 10 ? "Minimum deposit is £10 to cover payment fees" : ""}
                />
              </Paper>
            </Grid>
            {userRole.isOwner && (
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#F0F7FF", border: "1px solid #CCE3FF" }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LanguageIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={800}>Custom Domain</Typography>
                    </Box>
                    {profile.vercelUrl && (
                      <IconButton size="small" component="a"
                        href={`https://${profile.vercelUrl.replace(/^https?:\/\//, "")}`} target="_blank">
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    Connect your Custom URL (e.g. my-barber-shop.co.uk) to use it for Stripe and booking links.
                  </Typography>
                  <TextField fullWidth size="small" placeholder="my-barber-shop.co.uk"
                    value={profile.vercelUrl || ""}
                    onChange={(e) => setProfile(p => ({ ...p, vercelUrl: e.target.value }))} />
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* ════════ TAB 6 — DESIGN (owner only) ════════ */}
        {userRole.isOwner && (
          <TabPanel value={tab} index={designTabIndex}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800} mb={3}>Brand Settings</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>Business Logo</Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar src={logoPreview || profile.logoUrl} variant="rounded" sx={{ width: 56, height: 56 }} />
                    <Button variant="outlined" component="label" size="small">
                      Upload Logo
                      <input type="file" hidden accept="image/*"
                        onChange={(e) => handleImageChange(e, setLogoFile, setLogoPreview)} />
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>Brand Colour</Typography>
                  <input type="color" value={profile.brandColor || "#C9A84C"}
                    onChange={e => setProfile(p => ({ ...p, brandColor: e.target.value }))}
                    style={{ width: 48, height: 48, border: "none", cursor: "pointer", borderRadius: 8 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    <DesktopIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} /> Desktop Hero Banner
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{
                      width: 100, height: 56, borderRadius: 1, bgcolor: "#eee",
                      backgroundImage: `url(${heroPreviewDesktop || profile.heroImage})`,
                      backgroundSize: "cover", backgroundPosition: "center"
                    }} />
                    <Button variant="outlined" component="label" size="small">
                      Upload Desktop
                      <input type="file" hidden accept="image/*"
                        onChange={(e) => handleImageChange(e, setHeroFileDesktop, setHeroPreviewDesktop)} />
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    <MobileIcon sx={{ verticalAlign: "middle", mr: 0.5, fontSize: 18 }} /> Mobile Hero Banner
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{
                      width: 100, height: 56, borderRadius: 1, bgcolor: "#eee",
                      backgroundImage: `url(${heroPreviewMobile || profile.heroImageMobile})`,
                      backgroundSize: "cover", backgroundPosition: "center"
                    }} />
                    <Button variant="outlined" component="label" size="small">
                      Upload Mobile
                      <input type="file" hidden accept="image/*"
                        onChange={(e) => handleImageChange(e, setHeroFileMobile, setHeroPreviewMobile)} />
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    <GavelIcon sx={{ verticalAlign: "middle", mr: 1 }} /> Legal Policies
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField label="Privacy Policy" fullWidth multiline rows={4}
                        placeholder="Your privacy policy text..." value={profile.privacyPolicy || ""}
                        onChange={e => setProfile(p => ({ ...p, privacyPolicy: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField label="Terms & Conditions" fullWidth multiline rows={4}
                        placeholder="Your booking terms and conditions..." value={profile.termsConditions || ""}
                        onChange={e => setProfile(p => ({ ...p, termsConditions: e.target.value }))} />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        )}

        {/* ════════ TAB 7 (or 5) — PAY ════════ */}
        <TabPanel value={tab} index={payTabIndex}>

          {/* Rate info banner */}
          <Paper sx={{ p: 2, borderRadius: 3, mb: 3, bgcolor: "#F0FFF4", border: "1px solid #C6F6D5", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <NfcIcon sx={{ color: "#38A169" }} />
            <Box flex={1}>
              <Typography variant="subtitle2" fontWeight={800} color="#276749">
                In-Person Payments via Stripe — 1.5% + 10p per transaction · Free to set up · No hardware needed
              </Typography>
              <Typography variant="caption" color="#2F855A">
                Customer scans the QR code and pays with Apple Pay, Google Pay, or card on their phone.
              </Typography>
            </Box>
          </Paper>

          {!profile.stripeConnected && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
              You need to connect Stripe before taking payments.{" "}
              <strong style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setTab(financeTabIndex)}>
                Go to Finance tab →
              </strong>
            </Alert>
          )}

          <Grid container spacing={3}>

            {/* ── Left: charge builder ── */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${brandColor}18` }}>
                    <NfcIcon sx={{ color: brandColor, fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={800} lineHeight={1.2}>New Charge</Typography>
                    <Typography variant="caption" color="text.secondary">Tap a service or enter amount</Typography>
                  </Box>
                </Box>

                {/* Quick-select services */}
                {(profile.services || []).length > 0 && (
                  <Box mb={2.5}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
                      Quick Select
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {(profile.services || []).map((s, i) => (
                        <Chip
                          key={i}
                          label={`${s.name}  £${s.price}`}
                          onClick={() => {
                            setTerminalAmount(String(s.price));
                            setTerminalService(s.name);
                          }}
                          clickable
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: terminalService === s.name ? brandColor : `${brandColor}18`,
                            color: terminalService === s.name ? "white" : "inherit",
                            border: terminalService === s.name ? "none" : "1px solid transparent",
                            "&:hover": { bgcolor: `${brandColor}40` },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Amount input */}
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  value={terminalAmount}
                  onChange={e => { setTerminalAmount(e.target.value); setTerminalService(""); }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                  }}
                  inputProps={{ min: 0.5, step: 0.5 }}
                  sx={{ mb: 2 }}
                  disabled={terminalStatus === "awaiting"}
                />

                <TextField
                  label="Note (optional)"
                  fullWidth
                  placeholder="e.g. Walk-in, extra beard trim…"
                  value={terminalNote}
                  onChange={e => setTerminalNote(e.target.value)}
                  sx={{ mb: 3 }}
                  disabled={terminalStatus === "awaiting"}
                />

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleCreateTerminalCharge}
                  disabled={
                    !terminalAmount ||
                    Number(terminalAmount) <= 0 ||
                    terminalStatus === "loading" ||
                    terminalStatus === "awaiting" ||
                    !profile.stripeConnected
                  }
                  startIcon={
                    terminalStatus === "loading"
                      ? <CircularProgress size={20} color="inherit" />
                      : <NfcIcon />
                  }
                  sx={{
                    bgcolor: "#1A1A1A",
                    py: 1.5,
                    fontSize: 16,
                    fontWeight: 800,
                    borderRadius: 2,
                    "&:hover": { bgcolor: "#333" },
                  }}
                >
                  {terminalStatus === "loading"
                    ? "Creating charge…"
                    : `Charge £${terminalAmount ? Number(terminalAmount).toFixed(2) : "0.00"}`
                  }
                </Button>
              </Paper>
            </Grid>

            {/* ── Right: QR / status panel ── */}
            <Grid item xs={12} md={7}>

              {/* IDLE state */}
              {terminalStatus === "idle" && (
                <Paper sx={{
                  p: 4, borderRadius: 3, textAlign: "center",
                  border: "2px dashed #E2E8F0", height: "100%",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
                  minHeight: 320,
                }}>
                  <Box sx={{ p: 3, borderRadius: "50%", bgcolor: "#F7FAFC" }}>
                    <QrCodeIcon sx={{ fontSize: 56, color: "#CBD5E0" }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                    QR code appears here
                  </Typography>
                  <Typography variant="body2" color="text.disabled" maxWidth={280}>
                    Select a service or enter an amount, then tap Charge to generate the payment QR code.
                  </Typography>
                </Paper>
              )}

              {/* ERROR state */}
              {terminalStatus === "error" && (
                <Paper sx={{ p: 4, borderRadius: 3, textAlign: "center", minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <Alert severity="error" sx={{ borderRadius: 2, width: "100%" }}>
                    Something went wrong creating the charge. Check your Stripe connection and try again.
                  </Alert>
                  <Button variant="outlined" onClick={handleResetTerminal}>Try Again</Button>
                </Paper>
              )}

              {/* AWAITING state */}
              {terminalStatus === "awaiting" && terminalSession && (
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
                  <Typography variant="subtitle1" fontWeight={800} mb={0.5}>
                    Show this to the customer
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
                    They tap to pay with Apple Pay, Google Pay, or card
                  </Typography>

                  {/* QR Code */}
                  <Box sx={{
                    display: "inline-block", p: 2, bgcolor: "white",
                    borderRadius: 3, border: `3px solid ${brandColor}`,
                    boxShadow: `0 4px 24px ${brandColor}30`, mb: 2.5,
                  }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(terminalSession.url)}`}
                      alt="Scan to pay"
                      width={200} height={200}
                      style={{ display: "block", borderRadius: 8 }}
                    />
                  </Box>

                  {/* Amount */}
                  <Typography variant="h3" fontWeight={900} sx={{ color: brandColor, mb: 0.5 }}>
                    £{Number(terminalAmount).toFixed(2)}
                  </Typography>
                  {terminalService && (
                    <Chip label={terminalService} size="small"
                      sx={{ mb: 2, bgcolor: `${brandColor}18`, fontWeight: 700 }} />
                  )}
                  {terminalNote && !terminalService && (
                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                      {terminalNote}
                    </Typography>
                  )}

                  {/* Polling indicator */}
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2.5}>
                    <CircularProgress size={14} sx={{ color: brandColor }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Waiting for payment…
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={1.5} justifyContent="center">
                    <Button
                      size="small" variant="outlined" startIcon={<CopyIcon />}
                      onClick={handleCopyPayLink}
                    >
                      Copy Link
                    </Button>
                    <Button
                      size="small" variant="outlined" color="error"
                      startIcon={<CancelIcon />} onClick={handleCancelTerminal}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* PAID state */}
              {terminalStatus === "paid" && (
                <Paper sx={{
                  p: 4, borderRadius: 3, textAlign: "center",
                  border: "2px solid #C6F6D5", bgcolor: "#F0FFF4",
                  minHeight: 320, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1.5,
                }}>
                  <Box sx={{ p: 2.5, borderRadius: "50%", bgcolor: "#C6F6D5" }}>
                    <CheckCircleIcon sx={{ fontSize: 56, color: "#276749" }} />
                  </Box>
                  <Typography variant="h6" fontWeight={800} color="#276749">
                    Payment Received!
                  </Typography>
                  <Typography variant="h3" fontWeight={900} sx={{ color: "#1A1A1A" }}>
                    £{Number(terminalAmount).toFixed(2)}
                  </Typography>
                  {terminalService && (
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {terminalService}
                    </Typography>
                  )}
                  {terminalNote && !terminalService && (
                    <Typography variant="body2" color="text.secondary">{terminalNote}</Typography>
                  )}
                  <Button
                    variant="contained"
                    sx={{ mt: 2, bgcolor: "#1A1A1A", borderRadius: 2, fontWeight: 800 }}
                    startIcon={<NfcIcon />}
                    onClick={handleResetTerminal}
                  >
                    New Charge
                  </Button>
                </Paper>
              )}
            </Grid>
          </Grid>

          {/* How it works footer */}
          <Paper sx={{ p: 2.5, borderRadius: 3, mt: 3, bgcolor: "#FFFBF0", border: "1px solid #FEF3C7" }}>
            <Typography variant="subtitle2" fontWeight={800} mb={1.5}>How it works</Typography>
            <Grid container spacing={2}>
              {[
                ["1️⃣", "Enter amount or pick a service"],
                ["2️⃣", "Tap Charge — a QR code appears instantly"],
                ["3️⃣", "Customer scans with their phone camera"],
                ["4️⃣", "They tap Apple Pay / Google Pay to pay"],
              ].map(([num, text]) => (
                <Grid item xs={12} sm={6} md={3} key={num}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography fontSize={18}>{num}</Typography>
                    <Typography variant="body2" color="text.secondary">{text}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

        </TabPanel>

      </Box>
    </Box>
  );
}