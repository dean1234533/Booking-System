import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress, TextField, MenuItem, Select, InputLabel, FormControl, Alert } from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { updateBarber, addSlot, uploadBarberImage } from "../firebase/firestore";
import { sanitizeSlug, isValidSlugFormat, isReservedSlug, validateSlug } from "../utils/bookingSlug";
import BookingLinkCard from "../components/dashboard/BookingLinkCard";
import { logFunnelEvent } from "../utils/funnelTracking";
import AppIcon from "../components/AppIcon";

/* ── Inline styles ── */
const css = `
  @import url('https://fonts.bunny.net/css?family=syne:700,800|dm-sans:300,400,500,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ob-root {
    min-height: 100vh;
    background: #0a0a0a;
    font-family: 'DM Sans', sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
  }

  /* ── Top bar ── */
  .ob-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .ob-logo {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #fff;
  }
  .ob-logo span { color: var(--brand); }
  .ob-skip {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.2s;
  }
  .ob-skip:hover { color: rgba(255,255,255,0.7); }

  /* ── Progress bar ── */
  .ob-progress-wrap {
    padding: 0 40px;
    padding-top: 28px;
    padding-bottom: 0;
  }
  .ob-step-row {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 10px;
  }
  .ob-step-pill {
    flex: 1;
    height: 3px;
    border-radius: 99px;
    background: rgba(255,255,255,0.08);
    transition: background 0.5s ease;
    position: relative;
    overflow: hidden;
  }
  .ob-step-pill.done { background: var(--brand); }
  .ob-step-pill.active { background: rgba(255,255,255,0.15); }
  .ob-step-pill.active::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--brand);
    border-radius: 99px;
    animation: fillBar 0.6s cubic-bezier(.4,0,.2,1) forwards;
  }
  @keyframes fillBar {
    from { width: 0; }
    to   { width: 100%; }
  }
  .ob-step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    flex-shrink: 0;
    transition: background 0.3s;
    margin: 0 2px;
  }
  .ob-step-dot.done { background: var(--brand); }
  .ob-step-dot.active { background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.25); }

  .ob-step-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
  }
  .ob-step-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.2);
    transition: color 0.3s;
    flex: 1;
    text-align: center;
  }
  .ob-step-label.active { color: #fff; }
  .ob-step-label.done { color: var(--brand); }

  /* ── Main layout ── */
  .ob-body {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 0;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    padding: 60px 40px 80px;
    align-items: center;
  }

  /* ── Left: text ── */
  .ob-left { padding-right: 60px; }

  .ob-step-num {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--brand);
    margin-bottom: 20px;
  }
  .ob-step-num::before {
    content: '';
    display: block;
    width: 24px;
    height: 1px;
    background: var(--brand);
  }

  .ob-heading {
    font-family: 'Syne', sans-serif;
    font-size: clamp(32px, 4vw, 50px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.01em;
    margin-bottom: 16px;
  }
  .ob-heading em {
    font-style: italic;
    color: var(--brand);
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
  }

  .ob-desc {
    font-size: 15px;
    font-weight: 300;
    line-height: 1.8;
    color: rgba(255,255,255,0.55);
    margin-bottom: 32px;
    max-width: 420px;
  }

  /* ── Form fields ── */
  .ob-field-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 28px;
    max-width: 420px;
  }
  .ob-field-row {
    display: flex;
    gap: 12px;
  }
  .ob-field-row > * { flex: 1; }

  /* ── Choice cards (account type) ── */
  .ob-choice-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
    max-width: 420px;
  }
  .ob-choice-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 18px 20px;
    background: rgba(255,255,255,0.03);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .ob-choice-card:hover { border-color: rgba(255,255,255,0.25); }
  .ob-choice-card.selected { border-color: var(--brand); background: rgba(37,99,235,0.12); }
  .ob-choice-title { font-weight: 700; font-size: 15px; }
  .ob-choice-sub { font-size: 12.5px; color: rgba(255,255,255,0.45); font-weight: 300; }

  /* ── Slug input row ── */
  .ob-slug-row {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 0 4px 0 14px;
    max-width: 420px;
  }
  .ob-slug-prefix { font-size: 13px; color: rgba(255,255,255,0.35); font-family: monospace; white-space: nowrap; }
  .ob-slug-row input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #fff;
    font-family: monospace;
    font-size: 14px;
    padding: 12px 6px;
  }
  .ob-slug-hint { font-size: 12.5px; margin-top: 8px; min-height: 18px; }
  .ob-slug-hint.available { color: #4ade80; }
  .ob-slug-hint.taken { color: #f87171; }
  .ob-slug-hint.invalid, .ob-slug-hint.error { color: #f87171; }
  .ob-slug-hint.checking { color: rgba(255,255,255,0.35); }

  /* ── Availability day rows ── */
  .ob-day-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .ob-day-toggle {
    width: 44px;
    height: 24px;
    border-radius: 99px;
    background: rgba(255,255,255,0.1);
    border: none;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .ob-day-toggle.on { background: var(--brand); }
  .ob-day-toggle::after {
    content: '';
    position: absolute;
    top: 3px; left: 3px;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s;
  }
  .ob-day-toggle.on::after { transform: translateX(20px); }
  .ob-day-label { width: 44px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }
  .ob-day-times { display: flex; gap: 8px; align-items: center; opacity: 0.4; pointer-events: none; }
  .ob-day-times.enabled { opacity: 1; pointer-events: auto; }
  .ob-day-times input[type="time"] {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    color: #fff;
    padding: 5px 8px;
    font-size: 12.5px;
    font-family: 'DM Sans', sans-serif;
    color-scheme: dark;
  }

  /* ── CTA button ── */
  .ob-cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 15px 32px;
    background: var(--brand);
    color: #0a0a0a;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
  }
  .ob-cta:hover { opacity: 0.88; transform: translateY(-2px); }
  .ob-cta:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .ob-cta-arrow {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }
  .ob-cta:hover .ob-cta-arrow { transform: translateX(3px); }

  .ob-cta-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.2s;
  }
  .ob-cta-secondary:hover { color: rgba(255,255,255,0.6); }

  .ob-cta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* ── Right: card ── */
  .ob-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 36px;
    position: relative;
    overflow: hidden;
    animation: cardFadeIn 0.5s ease both;
  }
  @keyframes cardFadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ob-card::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .ob-card-eyebrow {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--brand);
    margin-bottom: 20px;
  }

  .ob-card-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: rgba(37,99,235,0.1);
    border: 1px solid rgba(37,99,235,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 20px;
  }

  .ob-card-title {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    margin-bottom: 8px;
  }

  .ob-card-body {
    font-size: 13px;
    color: rgba(255,255,255,0.45);
    line-height: 1.7;
    margin-bottom: 24px;
  }

  .ob-card-checklist { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .ob-card-check-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5; }
  .ob-card-check-icon {
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.3);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px; font-size: 9px;
  }

  /* ── Done state ── */
  .ob-done-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 0;
    animation: cardFadeIn 0.6s ease both;
  }
  .ob-done-ring {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(37,99,235,0.1);
    border: 2px solid rgba(37,99,235,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    margin-bottom: 24px;
    animation: pulseBrand 2s ease infinite;
  }
  @keyframes pulseBrand {
    0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.15); }
    50%       { box-shadow: 0 0 0 16px rgba(37,99,235,0); }
  }
  .ob-done-title {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 800;
    margin-bottom: 12px;
  }
  .ob-done-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.45);
    line-height: 1.7;
    max-width: 560px;
    margin-bottom: 32px;
  }

  .ob-done-wrap > .ob-cta-row { justify-content: center; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .ob-topbar { padding: 16px 20px; }
    .ob-progress-wrap { padding: 20px 20px 0; }
    .ob-body {
      grid-template-columns: 1fr;
      padding: 32px 20px 60px;
      gap: 32px;
    }
    .ob-left { padding-right: 0; }
    .ob-card { padding: 24px; }
    .ob-step-label { font-size: 8px; }
    .ob-desc { max-width: 100%; font-size: 14px; }
    .ob-heading { font-size: clamp(1.75rem, 8vw, 2.5rem); }
    .ob-field-stack, .ob-choice-grid, .ob-slug-row { max-width: 100%; }
    .ob-cta-secondary { margin-left: 0; }
    .ob-done-wrap { padding: 20px 0; }
  }

  @media (max-width: 420px) {
    .ob-topbar { padding: 12px 16px; }
    .ob-progress-wrap { padding: 14px 16px 0; }
    .ob-body { padding: 20px 16px 48px; gap: 24px; }
    .ob-card { padding: 18px; }
    .ob-step-labels { display: none; }
    .ob-cta { width: 100%; justify-content: center; }
    .ob-logo { font-size: 15px; }
    .ob-skip { font-size: 11px; }
    .ob-card-title { font-size: 18px; }
    .ob-field-row { flex-direction: column; }
  }
`;

const STEP_LABELS = ["Account", "Profile", "Link", "Service", "Hours", "Live"];

const BUSINESS_TYPES = [
  { value: "barber",      label: "Barbershop" },
  { value: "hairdresser", label: "Hair Salon" },
  { value: "decorator",   label: "Painting & Decorating" },
  { value: "trainer",     label: "Personal Trainer" },
  { value: "plumber",     label: "Plumbing, Heating & Electrical" },
];

const DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];
const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function addDays(dateStr, days) {
  const result = new Date(dateStr);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

/* ── Main Onboarding component ── */
export default function Onboarding({ brandColor: brandColorProp }) {
  const navigate = useNavigate();
  const { barber: authUser } = useAuth();
  const [step, setStep] = useState(0);
  const [key, setKey] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [brandColor, setBrandColor] = useState(brandColorProp || "#2563EB");
  const [accountType, setAccountType] = useState(null);
  const [businessName, setBusinessName] = useState("");
  // Starts unset (not "barber") so handleProfileSubmit below can tell "the
  // real value hasn't loaded yet" apart from "genuinely a barber" — signup
  // already saved the correct businessType, and this step only needs to
  // touch it when the user actually changes the dropdown. A hardcoded
  // default here previously meant any save landing before the async load
  // below finished silently overwrote a correct value (e.g. "plumber") with
  // "barber". Found 2026-08-21 after it happened to a real account.
  const [businessType, setBusinessType] = useState(null);
  const [location, setLocation] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState({ state: "idle", message: "" }); // idle | checking | available | taken | invalid
  const [claimedSlug, setClaimedSlug] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDeposit, setServiceDeposit] = useState("");
  const [days, setDays] = useState(() =>
    Object.fromEntries(DAYS.map(d => [d.key, { enabled: false, start: "09:00", end: "17:00" }]))
  );

  const completedLoggedRef = useRef(false);

  useEffect(() => { window.scrollTo(0, 0); logFunnelEvent("onboarding_view"); }, []);

  // Each onboarding panel replaces the previous one in place. Reset the
  // document scroll so the next heading, especially the final success screen,
  // can never appear clipped above the viewport.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  useEffect(() => {
    if (step >= steps.length && !completedLoggedRef.current) {
      completedLoggedRef.current = true;
      logFunnelEvent("onboarding_completed", { claimedSlug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Load existing profile to pre-fill (business name, type, brand colour)
  useEffect(() => {
    if (!authUser?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "barbers", authUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setBusinessName(data.businessName || data.name || "");
          setBusinessType(data.businessType || "barber");
          setLocation(data.location || data.city || "");
          if (data.brandColor) setBrandColor(data.brandColor);
          if (data.bookingSlug) setClaimedSlug(data.bookingSlug);
        }
      } catch { /* non-fatal — form just starts blank */ }
      finally { setLoadingProfile(false); }
    })();
  }, [authUser?.uid]);

  // Suggest a slug once we know the business name and reach that step
  useEffect(() => {
    if (step === 2 && !slug && businessName) {
      setSlug(sanitizeSlug(businessName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Live slug availability check (debounced)
  useEffect(() => {
    if (step !== 2) return;
    const clean = sanitizeSlug(slug);
    if (!clean) { setSlugStatus({ state: "idle", message: "" }); return; }
    if (!isValidSlugFormat(clean)) {
      setSlugStatus({ state: "invalid", message: "Use 3-30 lowercase letters, numbers, or hyphens." });
      return;
    }
    if (isReservedSlug(clean)) {
      setSlugStatus({ state: "taken", message: "This link is reserved." });
      return;
    }
    if (clean === claimedSlug) {
      setSlugStatus({ state: "available", message: "This is already your link." });
      return;
    }
    setSlugStatus({ state: "checking", message: "Checking…" });
    const t = setTimeout(async () => {
      try {
        const s = await getDoc(doc(db, "bookingSlugs", clean));
        if (s.exists() && s.data()?.barberId) {
          setSlugStatus({ state: "taken", message: `bookrightly.co.uk/${clean} is already taken.` });
        } else {
          setSlugStatus({ state: "available", message: `✓ bookrightly.co.uk/${clean} is available` });
        }
      } catch {
        // The claim function is the authoritative uniqueness check. A failed
        // preview request must not trap the user on this step.
        setSlugStatus({ state: "error", message: "Couldn't check availability. You can still try to claim this link." });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug, step, claimedSlug]);

  function skipToDashboard() {
    logFunnelEvent("onboarding_skipped", { atStep: step, stepLabel: STEP_LABELS[step] });
    navigate("/dashboard");
  }

  function goNext(meta = {}) {
    logFunnelEvent("onboarding_step_completed", { step, stepLabel: STEP_LABELS[step], ...meta });
    setStep(s => s + 1);
    setKey(k => k + 1);
    setError("");
  }

  async function handleAccountType(type) {
    setAccountType(type);
    setSaving(true);
    setError("");
    try {
      await updateBarber(authUser.uid, { accountType: type });
      goNext();
    } catch (e) {
      logFunnelEvent("onboarding_step_error", { step, message: e.message || "unknown" });
      setError("Couldn't save that — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSubmit() {
    if (!businessName.trim()) { setError("Please enter your business name."); return; }
    setSaving(true);
    setError("");
    try {
      let businessLogo;
      if (photoFile) {
        businessLogo = await uploadBarberImage(photoFile, "logo.jpg", authUser.uid);
      }
      await updateBarber(authUser.uid, {
        businessName: businessName.trim(),
        // Only ever include this if the real value has actually loaded (or
        // the user picked one) — never overwrite with a still-unset default.
        ...(businessType ? { businessType } : {}),
        location: location.trim(),
        ...(businessLogo ? { businessLogo, logoUrl: businessLogo } : {}),
      });
      goNext();
    } catch (e) {
      logFunnelEvent("onboarding_step_error", { step, message: e.message || "unknown" });
      setError("Couldn't save your profile — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlugSubmit() {
    const validation = validateSlug(slug);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    const clean = validation.slug;
    if (slugStatus.state === "taken") {
      setError("That booking link is already taken. Try a different one.");
      return;
    }
    if (clean === claimedSlug) {
      goNext();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const functions = getFunctions(getApp(), "us-central1");
      const claim = httpsCallable(functions, "claimBookingSlug");
      const res = await claim({ slug: clean });
      setClaimedSlug(res.data.slug);
      goNext();
    } catch (e) {
      logFunnelEvent("onboarding_step_error", { step, message: e.message || "unknown" });
      setError(e.message?.replace(/^.*claimBookingSlug:\s*/, "") || "Couldn't claim that link — please try a different one.");
    } finally {
      setSaving(false);
    }
  }

  async function handleServiceSubmit() {
    if (!serviceName.trim() || !servicePrice) { setError("Please add a service name and price."); return; }
    setSaving(true);
    setError("");
    try {
      const snap = await getDoc(doc(db, "barbers", authUser.uid));
      const existing = Array.isArray(snap.data()?.services) ? snap.data().services : [];
      const newService = {
        name: serviceName.trim(),
        price: Number(servicePrice) || 0,
        duration: Number(serviceDuration) || 30,
        ...(serviceDeposit ? { deposit: Number(serviceDeposit) } : {}),
      };
      await updateBarber(authUser.uid, { services: [...existing, newService] });
      if (serviceDeposit) {
        await updateBarber(authUser.uid, { depositAmount: Number(serviceDeposit) });
      }
      goNext();
    } catch (e) {
      logFunnelEvent("onboarding_step_error", { step, message: e.message || "unknown" });
      setError("Couldn't save that service — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvailabilitySubmit() {
    const enabledDays = DAYS.filter(d => days[d.key].enabled);
    setSaving(true);
    setError("");
    try {
      if (enabledDays.length > 0) {
        const today = new Date();
        const jobs = [];
        // Next 28 days — simple weekly pattern, repeated for 4 weeks.
        for (let i = 0; i < 28; i++) {
          const date = addDays(today.toISOString().split("T")[0], i);
          const weekday = new Date(date + "T00:00:00").getDay();
          const dayCfg = enabledDays.find(d => DAY_INDEX[d.key] === weekday);
          if (dayCfg) {
            const cfg = days[dayCfg.key];
            jobs.push(addSlot({ barberId: authUser.uid, shopId: authUser.uid, date, time: cfg.start }));
          }
        }
        await Promise.all(jobs);
      }
      goNext();
    } catch (e) {
      logFunnelEvent("onboarding_step_error", { step, message: e.message || "unknown" });
      setError("Couldn't save your availability — you can add it later from the Schedule tab.");
      goNext();
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(key) {
    setDays(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  }
  function setDayTime(key, field, value) {
    setDays(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  const steps = [
    // 0 — Account type
    {
      num: "Step 01",
      heading: <>How will you<br /><em>use Bookrightly?</em></>,
      desc: "Both work the same way underneath — this just tunes what you see, and you can change it later from Settings.",
      body: (
        <div className="ob-choice-grid">
          <button type="button" className={`ob-choice-card ${accountType === "solo" ? "selected" : ""}`} onClick={() => handleAccountType("solo")} disabled={saving}>
            <div className="ob-choice-title">Just me</div>
            <div className="ob-choice-sub">For self-employed professionals and individuals.</div>
          </button>
          <button type="button" className={`ob-choice-card ${accountType === "team" ? "selected" : ""}`} onClick={() => handleAccountType("team")} disabled={saving}>
            <div className="ob-choice-title">Me + my team</div>
            <div className="ob-choice-sub">For businesses with multiple staff members.</div>
          </button>
        </div>
      ),
      cardEyebrow: "Getting started",
      cardIcon: "success",
      cardTitle: "Welcome to Bookrightly",
      cardBody: "In the next few minutes you'll have your own booking page live — no website or domain needed.",
    },
    // 1 — Profile
    {
      num: "Step 02",
      heading: <>Tell us about<br /><em>your business</em></>,
      desc: "This appears on your public booking page — you can edit all of it later.",
      body: (
        <>
          <div className="ob-field-stack">
            <TextField label="Business or your name" value={businessName} onChange={e => setBusinessName(e.target.value)}
              variant="filled" fullWidth InputProps={{ disableUnderline: true }} sx={fieldSx} />
            <FormControl variant="filled" fullWidth sx={fieldSx}>
              <InputLabel sx={{ color: "rgba(255,255,255,0.5)" }}>Trade</InputLabel>
              <Select value={businessType || "barber"} onChange={e => setBusinessType(e.target.value)} disableUnderline sx={{ color: "#fff" }}>
                {BUSINESS_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Location (town/city)" value={location} onChange={e => setLocation(e.target.value)}
              variant="filled" fullWidth InputProps={{ disableUnderline: true }} sx={fieldSx} />
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              {photoPreview ? "Photo selected ✓" : "+ Add a logo or photo (optional)"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
              }} />
            </label>
          </div>
        </>
      ),
      onNext: handleProfileSubmit,
      ctaLabel: "Continue",
      cardEyebrow: "Your profile",
      cardIcon: "tag",
      cardTitle: "How clients find you",
      cardBody: "Your business name, trade and location help clients recognise your page immediately.",
    },
    // 2 — Booking link
    {
      num: "Step 03",
      heading: <>Choose your<br /><em>booking link</em></>,
      desc: "This is the address clients will use to book you — share it anywhere.",
      body: (
        <>
          <div className="ob-slug-row">
            <span className="ob-slug-prefix">bookrightly.co.uk/</span>
            <input
              value={slug}
              onChange={e => {
                setSlug(e.target.value.toLowerCase());
                setError("");
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !saving) handleSlugSubmit();
              }}
              placeholder="yourbusiness"
              autoComplete="off"
              spellCheck={false}
              aria-label="Choose your booking link"
              aria-describedby="booking-link-hint"
            />
          </div>
          <div id="booking-link-hint" className={`ob-slug-hint ${slugStatus.state}`} aria-live="polite">
            {slugStatus.message || "Use 3–30 lowercase letters, numbers, or hyphens."}
          </div>
        </>
      ),
      onNext: handleSlugSubmit,
      // Keep the button actionable so validation or a transient availability
      // error is explained on click instead of looking permanently broken.
      nextDisabled: false,
      ctaLabel: "Claim link",
      cardEyebrow: "Your address",
      cardIcon: "link",
      cardTitle: "One link, everywhere",
      cardBody: "Put it in your Instagram, TikTok, Facebook or WhatsApp bio so clients can book you anytime.",
    },
    // 3 — First service
    {
      num: "Step 04",
      heading: <>Add your<br /><em>first service</em></>,
      desc: "You can add more, edit prices, or change anything later from your dashboard.",
      body: (
        <div className="ob-field-stack">
          <TextField label="Service name" placeholder="e.g. Haircut, Consultation" value={serviceName} onChange={e => setServiceName(e.target.value)}
            variant="filled" fullWidth InputProps={{ disableUnderline: true }} sx={fieldSx} />
          <div className="ob-field-row">
            <TextField label="Duration (mins)" type="number" value={serviceDuration} onChange={e => setServiceDuration(e.target.value)}
              variant="filled" InputProps={{ disableUnderline: true }} sx={fieldSx} />
            <TextField label="Price (£)" type="number" value={servicePrice} onChange={e => setServicePrice(e.target.value)}
              variant="filled" InputProps={{ disableUnderline: true }} sx={fieldSx} />
          </div>
          <TextField label="Deposit (£, optional)" type="number" value={serviceDeposit} onChange={e => setServiceDeposit(e.target.value)}
            variant="filled" fullWidth InputProps={{ disableUnderline: true }} sx={fieldSx} />
        </div>
      ),
      onNext: handleServiceSubmit,
      ctaLabel: "Continue",
      cardEyebrow: "Services",
      cardIcon: "barber",
      cardTitle: "What you offer",
      cardBody: "A deposit here cuts no-shows — clients pay upfront to secure the slot.",
    },
    // 4 — Availability
    {
      num: "Step 05",
      heading: <>Set your<br /><em>weekly hours</em></>,
      desc: "Turn on the days you work — we'll open slots for the next four weeks. Fine-tune anytime from Schedule.",
      body: (
        <div style={{ maxWidth: 420, marginBottom: 28 }}>
          {DAYS.map(d => (
            <div className="ob-day-row" key={d.key}>
              <button type="button" className={`ob-day-toggle ${days[d.key].enabled ? "on" : ""}`} onClick={() => toggleDay(d.key)} />
              <span className="ob-day-label">{d.label}</span>
              <div className={`ob-day-times ${days[d.key].enabled ? "enabled" : ""}`}>
                <input type="time" value={days[d.key].start} onChange={e => setDayTime(d.key, "start", e.target.value)} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>to</span>
                <input type="time" value={days[d.key].end} onChange={e => setDayTime(d.key, "end", e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      ),
      onNext: handleAvailabilitySubmit,
      ctaLabel: "Continue",
      skipLabel: "Skip for now",
      cardEyebrow: "Availability",
      cardIcon: "calendar",
      cardTitle: "When you're free",
      cardBody: "Clients can only book the times you open — no double bookings, ever.",
    },
  ];

  const isLastFormStep = step === steps.length - 1;
  const current = steps[step];

  if (loadingProfile) {
    return (
      <div className="ob-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: brandColor }} />
      </div>
    );
  }

  // ── Final "live" step ──
  if (step >= steps.length) {
    return (
      <>
        <style>{css}</style>
        <div className="ob-root" style={{ "--brand": brandColor }}>
          <div className="ob-topbar">
            <div className="ob-logo">Bookrightly</div>
          </div>
          <div className="ob-body" style={{ gridTemplateColumns: "1fr" }}>
            <div className="ob-done-wrap">
              <div className="ob-done-ring"><AppIcon name="success" sx={{ fontSize: 42 }} /></div>
              <h1 className="ob-done-title">You're ready to take bookings</h1>
              <p className="ob-done-sub">Your booking page is live at bookrightly.co.uk/{claimedSlug}. Share it anywhere — no website or domain needed.</p>
              <BookingLinkCard
                bookingSlug={claimedSlug}
                brandColor={brandColor}
                showQrButton={false}
                sx={{ width: "100%", maxWidth: 720, mb: 4, textAlign: "left" }}
              />
              <div className="ob-cta-row">
                <a className="ob-cta" href={`/${claimedSlug}`} target="_blank" rel="noopener noreferrer">
                  View my booking page
                </a>
                <button className="ob-cta-secondary" onClick={() => navigate("/dashboard")}>
                  Go to dashboard →
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="ob-root" style={{ "--brand": brandColor }}>

        {/* Top bar */}
        <div className="ob-topbar">
          <div className="ob-logo">Bookrightly</div>
          <button className="ob-skip" onClick={skipToDashboard}>
            Skip setup →
          </button>
        </div>

        {/* Progress */}
        <div className="ob-progress-wrap">
          <div className="ob-step-row">
            {steps.map((_, i) => {
              const isDone = i < step;
              const isActive = i === step;
              return (
                <React.Fragment key={i}>
                  <div className={`ob-step-pill ${isDone ? "done" : isActive ? "active" : ""}`} key={isActive ? key : i} />
                  {i < steps.length - 1 && (
                    <div className={`ob-step-dot ${isDone ? "done" : isActive ? "active" : ""}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="ob-step-labels">
            {steps.map((_, i) => (
              <div key={i} className={`ob-step-label ${i < step ? "done" : i === step ? "active" : ""}`}>
                {STEP_LABELS[i]}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="ob-body" key={key}>

          {/* Left */}
          <div className="ob-left">
            <div className="ob-step-num">{current.num}</div>
            <h1 className="ob-heading">{current.heading}</h1>
            <p className="ob-desc">{current.desc}</p>

            {current.body}

            {error && <Alert severity="error" sx={{ mb: 2, maxWidth: 420 }}>{error}</Alert>}

            {current.onNext && (
              <div className="ob-cta-row">
                <button className="ob-cta" onClick={current.onNext} disabled={saving || current.nextDisabled}>
                  {saving ? "Saving…" : current.ctaLabel}
                  {!saving && <span className="ob-cta-arrow">→</span>}
                </button>
                {current.skipLabel && (
                  <button className="ob-cta-secondary" onClick={() => goNext({ skipped: true })} disabled={saving}>
                    {current.skipLabel}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right */}
          <div className="ob-card">
            <div className="ob-card-eyebrow">{current.cardEyebrow}</div>
            <div className="ob-card-icon"><AppIcon name={current.cardIcon} sx={{ fontSize: 28 }} /></div>
            <div className="ob-card-title">{current.cardTitle}</div>
            <p className="ob-card-body">{current.cardBody}</p>
          </div>

        </div>

      </div>
    </>
  );
}

const fieldSx = {
  "& .MuiFilledInput-root": { bgcolor: "rgba(255,255,255,0.04)", borderRadius: 1, border: "1.5px solid rgba(255,255,255,0.12)" },
  "& .MuiFilledInput-input": { color: "#fff" },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.5)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "var(--brand, #2563EB)" },
};
