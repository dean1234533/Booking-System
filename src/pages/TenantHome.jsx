import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { getShopStaff, getBarber } from "../firebase/firestore";
import BarberCard from "../components/BarberCard";

// ── Google Fonts — add to your index.html ─────────────────────────────────────
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,400;1,300;1,400&display=swap" rel="stylesheet" />
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

// ── CSS injected once ─────────────────────────────────────────────────────────
const CSS = `
  :root {
    --gold: #C9A84C;
    --gold-light: #e8c97a;
    --gold-pale: #f5e9c8;
    --dark: #0d0d0d;
    --dark2: #1a1a1a;
    --warm-white: #faf8f4;
    --cream: #f2ede3;
    --text-muted: #7a7060;
    --serif: 'Playfair Display', serif;
    --sans: 'DM Sans', sans-serif;
    --italic: 'Cormorant Garamond', serif;
  }

  .th-body { font-family: var(--sans); background: var(--warm-white); color: var(--dark); overflow-x: hidden; }

  /* HERO */
  .th-hero {
    position: relative; height: 520px;
    display: flex; align-items: flex-end; justify-content: center;
    overflow: hidden;
    background: linear-gradient(160deg,#1a0e00 0%,#0d0d0d 40%,#1c1408 100%);
    padding-bottom: 56px;
  }
  .th-hero-img {
    position: absolute; inset: 0;
    background-size: cover; background-position: center 35%; opacity: 0.28;
  }
  .th-hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom,rgba(13,13,13,0.2) 0%,rgba(13,13,13,0.9) 100%);
  }
  .th-hero-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg,transparent,var(--gold),transparent);
  }
  .th-hero-content {
    position: relative; z-index: 1; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
  }
  .th-eyebrow { display: flex; align-items: center; gap: 12px; }
  .th-eyebrow-line { width: 32px; height: 1px; background: var(--gold); opacity: 0.6; }
  .th-eyebrow span {
    font-family: var(--sans); font-size: 10px; font-weight: 500;
    letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.6);
  }
  .th-hero-title {
    font-family: var(--serif); font-weight: 400; font-size: 78px;
    line-height: 0.92; letter-spacing: -0.03em; color: #fff; text-transform: uppercase;
  }
  .th-hero-title .accent { color: var(--gold); }
  .th-hero-stars { display: flex; gap: 4px; }
  .th-hero-stars span { color: var(--gold); font-size: 14px; }
  .th-hero-tagline {
    font-family: var(--sans); font-size: 10px; font-weight: 300;
    letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.5);
  }
  .th-hero-cta {
    margin-top: 8px; padding: 14px 40px;
    background: var(--gold); color: #0d0d0d;
    font-family: var(--sans); font-size: 10px; font-weight: 500;
    letter-spacing: 0.2em; text-transform: uppercase;
    border: none; cursor: pointer; transition: background 0.25s, transform 0.2s;
  }
  .th-hero-cta:hover { background: var(--gold-light); transform: translateY(-1px); }

  /* TRUST BAR */
  .th-trust-bar {
    background: var(--dark);
    display: grid; grid-template-columns: repeat(3,1fr);
    border-bottom: 1px solid rgba(201,168,76,0.15);
  }
  .th-trust-item {
    padding: 22px 24px; display: flex; align-items: center; gap: 14px;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .th-trust-item:last-child { border-right: none; }
  .th-trust-icon { color: var(--gold); font-size: 20px; flex-shrink: 0; }
  .th-trust-label {
    font-family: var(--sans); font-size: 11px; font-weight: 500;
    letter-spacing: 0.08em; color: #fff; display: block;
  }
  .th-trust-sub {
    font-family: var(--sans); font-size: 10px; font-weight: 300;
    color: rgba(255,255,255,0.35); letter-spacing: 0.03em; display: block; margin-top: 2px;
  }

  /* SECTION UTILS */
  .th-section-label { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .th-section-label-line { width: 24px; height: 1px; background: var(--gold); }
  .th-section-label span {
    font-family: var(--sans); font-size: 10px; font-weight: 500;
    letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold);
  }
  .th-section-title {
    font-family: var(--serif); font-weight: 400; font-size: 34px; line-height: 1.15; color: var(--dark);
  }
  .th-divider { width: 36px; height: 1px; background: var(--gold); margin-top: 16px; }

  /* LOCATION + HOURS */
  .th-info-wrapper { padding: 72px 40px 0; background: var(--warm-white); }
  .th-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 0 0 80px; }
  .th-info-card { background: #fff; border: 1px solid #ebebeb; padding: 40px; }
  .th-info-card.dark { background: var(--dark2); border-color: rgba(201,168,76,0.2); }
  .th-info-card.dark .th-section-title { color: #fff; }
  .th-info-address {
    font-family: var(--sans); font-size: 14px; font-weight: 300;
    color: var(--text-muted); line-height: 1.7; margin: 12px 0 28px;
  }
  .th-info-card.dark .th-info-address { color: rgba(255,255,255,0.5); }
  .th-btn-primary {
    padding: 13px 32px; background: transparent;
    border: 1px solid var(--dark); color: var(--dark);
    font-family: var(--sans); font-size: 10px; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; transition: all 0.25s;
  }
  .th-btn-primary:hover { background: var(--gold); border-color: var(--gold); color: #0d0d0d; }
  .th-hours-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .th-hours-row:last-child { border-bottom: none; }
  .th-hours-row.today {
    background: rgba(201,168,76,0.06); padding: 10px 8px;
    margin: 0 -8px; border-radius: 4px; border-bottom: none;
  }
  .th-hours-day { font-family: var(--sans); font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.75); }
  .th-hours-day.today { color: var(--gold); font-weight: 500; }
  .th-today-badge { font-size: 9px; opacity: 0.6; }
  .th-hours-time { font-family: var(--sans); font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.45); }
  .th-hours-time.open { color: var(--gold); font-weight: 400; }
  .th-hours-time.closed { color: #c0392b; }

  /* ABOUT */
  .th-about {
    background: var(--dark); padding: 100px 40px;
    text-align: center; position: relative; overflow: hidden;
  }
  .th-about-deco {
    position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
    font-family: var(--serif); font-size: 220px; line-height: 1;
    color: var(--gold); opacity: 0.04; pointer-events: none; user-select: none;
  }
  .th-about-ring {
    width: 52px; height: 52px; border-radius: 50%;
    border: 1px solid rgba(201,168,76,0.35);
    display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;
  }
  .th-about-eyebrow {
    font-family: var(--sans); font-size: 10px; font-weight: 500;
    letter-spacing: 0.3em; text-transform: uppercase; color: var(--gold);
    margin-bottom: 16px; display: block;
  }
  .th-about-title {
    font-family: var(--serif); font-weight: 400; font-size: 40px;
    color: #fff; line-height: 1.2; margin-bottom: 32px;
  }
  .th-about-body {
    font-family: var(--italic); font-style: italic; font-weight: 300;
    font-size: 20px; line-height: 1.75; color: rgba(255,255,255,0.6);
    max-width: 580px; margin: 0 auto;
  }

  /* TEAM */
  .th-team { padding: 80px 40px; background: var(--warm-white); }
  .th-team-header { text-align: center; margin-bottom: 52px; }
  .th-team-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
  .th-barber-card {
    background: #fff; border: 1px solid #ebebeb;
    overflow: hidden; cursor: pointer;
    transition: transform 0.25s, border-color 0.25s; position: relative;
  }
  .th-barber-card:hover { transform: translateY(-4px); border-color: var(--gold); }
  .th-barber-photo {
    height: 200px; background: var(--cream);
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .th-barber-initial {
    font-family: var(--serif); font-size: 52px; font-weight: 400;
    color: rgba(201,168,76,0.4);
  }
  .th-barber-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top,rgba(13,13,13,0.7) 0%,transparent 50%);
    opacity: 0; transition: opacity 0.3s;
  }
  .th-barber-card:hover .th-barber-overlay { opacity: 1; }
  .th-barber-book {
    position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
    padding: 8px 22px; background: var(--gold); color: #0d0d0d;
    font-family: var(--sans); font-size: 9px; font-weight: 500;
    letter-spacing: 0.18em; text-transform: uppercase;
    opacity: 0; transition: opacity 0.3s; white-space: nowrap;
  }
  .th-barber-card:hover .th-barber-book { opacity: 1; }
  .th-barber-info { padding: 20px 22px; }
  .th-barber-name {
    font-family: var(--serif); font-size: 17px; font-weight: 400; color: var(--dark); margin-bottom: 4px;
  }
  .th-barber-role {
    font-family: var(--sans); font-size: 10px; font-weight: 300;
    letter-spacing: 0.1em; color: var(--text-muted); text-transform: uppercase;
  }
  .th-barber-tag {
    display: inline-block; margin-top: 10px; padding: 3px 10px;
    background: var(--gold-pale); font-family: var(--sans); font-size: 9px;
    font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #8a6a20;
  }

  /* REVIEWS */
  .th-reviews {
    background: linear-gradient(135deg,var(--cream) 0%,#fff 60%,var(--cream) 100%);
    padding: 80px 40px; border-top: 1px solid #e8e0d0;
  }
  .th-reviews-header { text-align: center; margin-bottom: 52px; }
  .th-review-card { max-width: 640px; margin: 0 auto; position: relative; }
  .th-review-quote {
    font-family: var(--serif); font-size: 100px; line-height: 1;
    color: var(--gold); opacity: 0.18; position: absolute; top: -18px; left: -8px;
    user-select: none; pointer-events: none;
  }
  .th-review-stars { display: flex; gap: 3px; margin-bottom: 20px; }
  .th-review-stars span { color: var(--gold); font-size: 13px; }
  .th-review-text {
    font-family: var(--italic); font-style: italic; font-weight: 400;
    font-size: 20px; line-height: 1.7; color: var(--dark2); margin-bottom: 28px;
    transition: opacity 0.25s;
  }
  .th-review-text.fade { opacity: 0; }
  .th-review-author { display: flex; align-items: center; gap: 12px; }
  .th-review-bar { width: 28px; height: 1px; background: var(--gold); }
  .th-review-name {
    font-family: var(--sans); font-size: 11px; font-weight: 500;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--dark);
  }
  .th-review-verified {
    font-family: var(--sans); font-size: 10px; font-weight: 300;
    color: var(--text-muted); letter-spacing: 0.08em;
  }
  .th-review-dots { display: flex; justify-content: center; gap: 8px; margin-top: 32px; }
  .th-dot {
    height: 6px; border-radius: 3px; background: #d0c8b8;
    cursor: pointer; transition: all 0.35s; width: 6px;
  }
  .th-dot.active { width: 22px; background: var(--gold); }

  /* FOOTER */
  .th-footer {
    background: var(--dark); border-top: 2px solid var(--gold);
    padding: 32px 40px; display: flex; justify-content: space-between; align-items: center;
  }
  .th-footer-brand { font-family: var(--serif); font-size: 20px; font-weight: 400; color: #fff; }
  .th-footer-copy {
    font-family: var(--sans); font-size: 10px; font-weight: 300;
    color: rgba(255,255,255,0.3); letter-spacing: 0.08em;
  }
  .th-footer-socials { display: flex; gap: 8px; }
  .th-social-btn {
    width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.5); font-size: 15px; cursor: pointer; transition: all 0.2s;
    text-decoration: none;
  }
  .th-social-btn:hover { border-color: var(--gold); color: var(--gold); }

  /* LOADING */
  .th-loading {
    display: flex; align-items: center; justify-content: center;
    height: 100vh; background: #000;
  }
  .th-spinner {
    width: 40px; height: 40px; border-radius: 50%;
    border: 1.5px solid rgba(201,168,76,0.2);
    border-top-color: var(--gold);
    animation: th-spin 0.9s linear infinite;
  }
  @keyframes th-spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .th-trust-bar { grid-template-columns: 1fr; }
    .th-trust-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .th-trust-item:last-child { border-bottom: none; }
    .th-info-grid { grid-template-columns: 1fr; }
    .th-team-grid { grid-template-columns: 1fr 1fr; }
    .th-hero-title { font-size: 48px; }
    .th-footer { flex-direction: column; gap: 16px; text-align: center; }
  }
  @media (max-width: 480px) {
    .th-team-grid { grid-template-columns: 1fr; }
  }
`;

// ── Inject styles once ────────────────────────────────────────────────────────
function useGlobalStyles(css) {
  useEffect(() => {
    const id = "th-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = css;
    document.head.appendChild(tag);
  }, []);
}

// ── Review Carousel ───────────────────────────────────────────────────────────
function ReviewCarousel({ reviews }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((next) => {
    setFading(true);
    setTimeout(() => { setIdx(next); setFading(false); }, 250);
  }, []);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const t = setInterval(() => go((idx + 1) % reviews.length), 5500);
    return () => clearInterval(t);
  }, [idx, reviews.length, go]);

  if (!reviews.length) return null;

  const rev = reviews[idx];
  const text = rev.comment || rev.text || "An exceptional experience from start to finish.";
  const name = rev.customerName || rev.name || "Client";

  return (
    <div className="th-review-card">
      <div className="th-review-quote">"</div>
      <div className="th-review-stars">
        {[1,2,3,4,5].map(i => <span key={i}>★</span>)}
      </div>
      <div className={`th-review-text${fading ? " fade" : ""}`}>
        "{text}"
      </div>
      <div className="th-review-author">
        <div className="th-review-bar" />
        <div>
          <div className="th-review-name">{name}</div>
          <div className="th-review-verified">Verified Client</div>
        </div>
      </div>
      <div className="th-review-dots">
        {reviews.map((_, i) => (
          <div
            key={i}
            className={`th-dot${i === idx ? " active" : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Hours Row ─────────────────────────────────────────────────────────────────
function HoursRow({ day, dayData }) {
  const isClosed = !dayData || dayData.isClosed || !dayData.open || !dayData.close;
  const todayName = new Date().toLocaleDateString("en-GB", { weekday: "long" });
  const isToday = day === todayName;

  return (
    <div className={`th-hours-row${isToday ? " today" : ""}`}>
      <span className={`th-hours-day${isToday ? " today" : ""}`}>
        {day}
        {isToday && <span className="th-today-badge"> (today)</span>}
      </span>
      <span className={`th-hours-time${isClosed ? " closed" : " open"}`}>
        {isClosed ? "Closed" : `${dayData.open} – ${dayData.close}`}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function TenantHome({ tenant: initialTenant }) {
  useGlobalStyles(CSS);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { tenantId } = useParams();

  const [team, setTeam]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [freshTenant, setFreshTenant] = useState(initialTenant || location.state?.tenant);

  const businessName = freshTenant?.businessName || "TRIMZ";
  const address      = freshTenant?.address      || "123 High Street, Brentwood, Essex";
  const aboutUs      = freshTenant?.aboutUs      || `Welcome to ${businessName}. We believe a great haircut is more than a service — it's a ritual. Our master barbers bring precision, passion, and years of expertise to every chair.`;
  const heroImage    = freshTenant?.heroImage    || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80";
  const instagramUrl = freshTenant?.instagramUrl || "";
  const tiktokUrl    = freshTenant?.tiktokUrl    || "";
  const facebookUrl  = freshTenant?.facebookUrl  || "";

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => { window.scrollTo(0, 0); }, [tenantId, initialTenant?.id]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let tid  = initialTenant?.id || tenantId || location.state?.tenant?.id;
        let base = initialTenant || location.state?.tenant;

        if (!tid) {
          const host = window.location.hostname;
          const snap = await getDocs(query(collection(db, "tenants"), where("vercelUrl", "==", host), limit(1)));
          if (!snap.empty) { tid = snap.docs[0].id; base = { id: tid, ...snap.docs[0].data() }; }
        }
        if (!tid) { setLoading(false); return; }

        const [ownerData, staffMembers, reviewsSnap] = await Promise.all([
          getBarber(tid),
          getShopStaff(tid),
          getDocs(collection(db, "barbers", tid, "reviews")),
        ]);

        const reviews    = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const tenantData = { ...(ownerData || base), id: tid, reviews };
        setFreshTenant(tenantData);

        const owner = { ...tenantData, name: tenantData.name || "Master Barber", profilePic: tenantData.profilePic || "", isOwner: true, shopId: tid };
        const staff = staffMembers.map(m => ({ ...m, shopId: tid })).filter(m => m.name);
        setTeam([owner, ...staff]);
      } catch (err) {
        console.error("Error loading shop data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [initialTenant?.id, tenantId, location.state]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="th-loading">
        <div className="th-spinner" />
      </div>
    );
  }

  const reviews = freshTenant?.reviews || [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="th-body">

      {/* ── HERO ── */}
      <div className="th-hero">
        <div className="th-hero-img" style={{ backgroundImage: `url('${heroImage}')` }} />
        <div className="th-hero-overlay" />
        <div className="th-hero-accent" />
        <div className="th-hero-content">
          <div className="th-eyebrow">
            <div className="th-eyebrow-line" />
            <span>Welcome to</span>
            <div className="th-eyebrow-line" />
          </div>
          <div className="th-hero-title">
            {businessName.slice(0, -1)}
            <span className="accent">{businessName.slice(-1)}</span>
          </div>
          <div className="th-hero-stars">
            <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
          </div>
          <div className="th-hero-tagline">5.0 · Top Rated Excellence</div>
          <button
            className="th-hero-cta"
            onClick={() => document.getElementById("th-team")?.scrollIntoView({ behavior: "smooth" })}
          >
            Book a Barber
          </button>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div className="th-trust-bar">
        {[
          { icon: "ti-certificate", label: "Licensed Barbers",   sub: "All staff fully certified"   },
          { icon: "ti-sparkles",    label: "Hygiene Guaranteed", sub: "Sanitised tools, every cut"  },
          { icon: "ti-award",       label: "Premium Products",   sub: "Professional-grade only"     },
        ].map(({ icon, label, sub }) => (
          <div className="th-trust-item" key={label}>
            <i className={`ti ${icon} th-trust-icon`} aria-hidden="true" />
            <div>
              <span className="th-trust-label">{label}</span>
              <span className="th-trust-sub">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── LOCATION + HOURS ── */}
      <div className="th-info-wrapper">
        <div className="th-info-grid">

          {/* Location */}
          <div className="th-info-card">
            <div className="th-section-label">
              <div className="th-section-label-line" />
              <span>Find Us</span>
            </div>
            <div className="th-section-title">Visit the Shop</div>
            <div className="th-divider" style={{ marginBottom: 20 }} />
            <p className="th-info-address">{address}</p>
            <button
              className="th-btn-primary"
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)}
            >
              Get Directions
            </button>
          </div>

          {/* Hours */}
          <div className="th-info-card dark">
            <div className="th-section-label">
              <div className="th-section-label-line" />
              <span>Hours</span>
            </div>
            <div className="th-section-title">When We're Open</div>
            <div className="th-divider" style={{ marginBottom: 20 }} />
            {freshTenant?.hours ? (
              DAYS.map(day => (
                <HoursRow
                  key={day}
                  day={day}
                  dayData={freshTenant.hours[day] || freshTenant.hours[day.toLowerCase()]}
                />
              ))
            ) : (
              <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.7 }}>
                {freshTenant?.openingHours || "Contact us for opening times"}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ── ABOUT ── */}
      <div className="th-about">
        <div className="th-about-deco">&amp;</div>
        <div className="th-about-ring">
          <i className="ti ti-scissors" style={{ color: "var(--gold)", fontSize: 20 }} aria-hidden="true" />
        </div>
        <span className="th-about-eyebrow">Our Story</span>
        <div className="th-about-title">Craft, Care<br />&amp; Character</div>
        <p className="th-about-body">{aboutUs}</p>
      </div>

      {/* ── TEAM ── */}
      <div className="th-team" id="th-team">
        <div className="th-team-header">
          <div className="th-section-label" style={{ justifyContent: "center" }}>
            <div className="th-section-label-line" />
            <span>The Experts</span>
            <div className="th-section-label-line" />
          </div>
          <div className="th-section-title" style={{ marginTop: 8 }}>Meet the Barbers</div>
          <div className="th-divider" style={{ margin: "14px auto 0" }} />
        </div>

        <div className="th-team-grid">
          {team.map((barber, i) => (
            <div
              className="th-barber-card"
              key={barber.id || i}
              onClick={() => navigate(`/book/${freshTenant?.id || freshTenant?.uid}/${barber.id}`)}
            >
              <div className="th-barber-photo" style={barber.profilePic ? {} : { background: ["var(--cream)", "#e8e0d4", "#dde4e0"][i % 3] }}>
                {barber.profilePic
                  ? <img src={barber.profilePic} alt={barber.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span className="th-barber-initial">{(barber.name || "?")[0]}</span>
                }
                <div className="th-barber-overlay" />
                <div className="th-barber-book">Book Now</div>
              </div>
              <div className="th-barber-info">
                <div className="th-barber-name">{barber.name}</div>
                <div className="th-barber-role">{barber.isOwner ? "Master Barber · Owner" : barber.role || "Barber"}</div>
                <div className="th-barber-tag">⭑ {barber.rating || "5.0"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── REVIEWS ── */}
      <div className="th-reviews">
        <div className="th-reviews-header">
          <div className="th-section-label" style={{ justifyContent: "center" }}>
            <div className="th-section-label-line" />
            <span>Testimonials</span>
            <div className="th-section-label-line" />
          </div>
          <div className="th-section-title" style={{ marginTop: 8 }}>What Clients Say</div>
          <div className="th-divider" style={{ margin: "14px auto 0" }} />
        </div>

        {reviews.length > 0
          ? <ReviewCarousel reviews={reviews} />
          : (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--sans)", fontSize: 14 }}>
              No reviews yet — be the first to leave one.
            </p>
          )
        }

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button
            className="th-btn-primary"
            onClick={() => navigate(`/review/${freshTenant?.id || freshTenant?.uid}`)}
          >
            Leave a Review
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="th-footer">
        <div className="th-footer-brand">{businessName}</div>
        <div className="th-footer-copy">© {new Date().getFullYear()} {businessName}. All rights reserved.</div>
        <div className="th-footer-socials">
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="th-social-btn">
              <i className="ti ti-brand-instagram" aria-hidden="true" />
            </a>
          )}
          {tiktokUrl && (
            <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="th-social-btn">
              <i className="ti ti-brand-tiktok" aria-hidden="true" />
            </a>
          )}
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="th-social-btn">
              <i className="ti ti-brand-facebook" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

    </div>
  );
}