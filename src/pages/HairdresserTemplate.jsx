import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { getFontFamily, loadGoogleFont } from '../utils/fontOptions';
import SlotPicker from '../components/SlotPicker';
import TenantFooter from '../components/TenantFooter';
import { formatCurrency } from '../stripe/formatters';
import { Star, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';

/* ─── Injected styles ──────────────────────────────────────────────────────── */
const HairdresserStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@1,300;1,400&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    .hs-page { font-family: 'DM Sans', sans-serif; color: #1a1714; background: #fdfcfa; overflow-x: hidden; }

    /* ── NAV ── */
    .hs-nav {
      position: fixed; top: 0; width: 100%; z-index: 200;
      height: 70px; display: flex; align-items: center; justify-content: space-between;
      padding: 0 clamp(1.5rem, 4vw, 3.5rem);
      background: rgba(253,252,250,0.94); backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(232,227,220,0.7);
    }
    .hs-nav-brand {
      font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700;
      color: #1a1714; text-decoration: none; letter-spacing: 0.02em; flex-shrink: 0;
    }
    .hs-nav-links { display: flex; gap: 2rem; }
    .hs-nav-links a {
      font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      color: #5c5449; text-decoration: none; transition: color 0.2s;
    }
    .hs-nav-links a:hover { color: #1a1714; }
    .hs-nav-cta {
      font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      padding: 0.65rem 1.75rem; border-radius: 2px; text-decoration: none; color: #fff;
      transition: opacity 0.2s, transform 0.15s; flex-shrink: 0;
    }
    .hs-nav-cta:hover { opacity: 0.85; transform: translateY(-1px); }
    .hs-hamburger {
      display: none; flex-direction: column; gap: 5px;
      background: none; border: none; cursor: pointer; padding: 8px; flex-shrink: 0;
    }
    .hs-hamburger span { display: block; width: 24px; height: 2px; background: #1a1714; border-radius: 2px; }
    .hs-mobile-menu {
      position: fixed; top: 70px; left: 0; right: 0; z-index: 199;
      background: rgba(253,252,250,0.98); backdrop-filter: blur(14px);
      border-bottom: 1px solid #e8e3dc; padding: 1rem 1.5rem 1.5rem;
    }
    .hs-mobile-menu a {
      display: block; padding: 0.85rem 0; font-size: 0.82rem; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none;
      color: #1a1714; border-bottom: 1px solid #e8e3dc;
    }
    .hs-mobile-cta {
      display: block; margin-top: 1rem; padding: 0.85rem; text-align: center;
      color: #fff; border-radius: 3px; font-size: 0.78rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none;
    }

    /* ── HERO — split layout ── */
    .hs-hero {
      display: grid; grid-template-columns: 55% 45%;
      height: 100vh; min-height: 620px; padding-top: 70px;
    }
    .hs-hero-img { position: relative; overflow: hidden; }
    .hs-hero-img img {
      width: 100%; height: 100%; object-fit: cover;
      object-position: center top; display: block;
    }
    .hs-hero-img::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(to right, transparent 60%, rgba(253,252,250,0.15));
    }
    .hs-hero-content {
      display: flex; flex-direction: column; justify-content: center;
      padding: clamp(2rem, 5vw, 4.5rem); background: #fdfcfa; position: relative; overflow: hidden;
    }
    .hs-hero-eyebrow {
      display: flex; align-items: center; gap: 0.75rem;
      font-size: 0.62rem; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase; margin-bottom: 1.5rem;
    }
    .hs-hero-eyebrow::after { content: ''; width: 36px; height: 1px; background: currentColor; }
    .hs-hero h1 {
      font-family: 'Playfair Display', serif;
      font-size: clamp(2.5rem, 4vw, 3.8rem); font-weight: 700;
      line-height: 1.08; letter-spacing: -0.01em; color: #1a1714; margin-bottom: 1.5rem;
    }
    .hs-hero-accent { font-style: italic; font-weight: 400; }
    .hs-hero-sub {
      font-size: 0.9rem; color: #8b8179; font-weight: 300;
      line-height: 1.85; max-width: 340px; margin-bottom: 2.5rem;
    }
    .hs-hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
    .hs-btn-primary {
      display: inline-block; padding: 1rem 2.25rem; border: none; cursor: pointer;
      font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      color: #fff; text-decoration: none; border-radius: 2px; font-family: 'DM Sans', sans-serif;
      transition: opacity 0.2s, transform 0.15s;
    }
    .hs-btn-primary:hover { opacity: 0.87; transform: translateY(-2px); }
    .hs-btn-outline {
      display: inline-block; padding: 0.95rem 2.25rem; border: none; cursor: pointer;
      font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      color: #1a1714; text-decoration: none; background: transparent;
      border: 1.5px solid #ccc8c2; border-radius: 2px; font-family: 'DM Sans', sans-serif;
      transition: border-color 0.2s;
    }
    .hs-btn-outline:hover { border-color: #1a1714; }
    .hs-hero-deco {
      position: absolute; right: -1.5rem; bottom: -1rem;
      font-family: 'Playfair Display', serif; font-size: 11rem; font-weight: 900;
      opacity: 0.025; line-height: 1; user-select: none; pointer-events: none; color: #1a1714;
    }

    /* ── STATS BAR ── */
    .hs-stats {
      display: grid; grid-template-columns: repeat(3, 1fr);
      padding: clamp(1.25rem, 2.5vw, 1.75rem) clamp(1.5rem, 5vw, 5rem);
    }
    .hs-stat { text-align: center; position: relative; padding: 0.5rem 0; }
    .hs-stat + .hs-stat::before {
      content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
      width: 1px; background: rgba(255,255,255,0.2);
    }
    .hs-stat-num {
      font-family: 'Playfair Display', serif; display: block;
      font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 700;
      color: #fff; line-height: 1; letter-spacing: 0.02em;
    }
    .hs-stat-label {
      display: block; font-size: 0.66rem; font-weight: 700;
      letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.65); margin-top: 0.35rem;
    }

    /* ── SERVICES ── */
    .hs-services { padding: clamp(4rem, 8vw, 8rem) clamp(1.5rem, 6vw, 5rem); background: #fdfcfa; }
    .hs-services-inner {
      display: grid; grid-template-columns: 1.1fr 0.9fr;
      gap: clamp(2.5rem, 5vw, 6rem); align-items: start; max-width: 1200px; margin: 0 auto;
    }
    .hs-section-label {
      display: block; font-size: 0.62rem; font-weight: 800;
      letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 0.75rem;
    }
    .hs-section-title {
      font-family: 'Playfair Display', serif;
      font-size: clamp(2rem, 3.8vw, 2.8rem); font-weight: 700; line-height: 1.15;
      color: #1a1714; margin-bottom: 2.5rem;
    }
    .hs-section-sub { font-size: 0.88rem; color: #8b8179; font-weight: 300; line-height: 1.8; margin-bottom: 2.5rem; max-width: 480px; }
    .hs-service-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.1rem 0; border-bottom: 1px solid #ede8e0; gap: 1rem;
    }
    .hs-service-row:first-of-type { border-top: 1px solid #ede8e0; }
    .hs-service-name { font-weight: 500; font-size: 0.94rem; color: #1a1714; }
    .hs-service-meta { display: flex; align-items: center; gap: 1.25rem; flex-shrink: 0; }
    .hs-service-duration {
      font-size: 0.7rem; font-weight: 600; color: #a8a29e;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .hs-service-price {
      font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; min-width: 48px; text-align: right;
    }
    .hs-services-img {
      position: sticky; top: 90px; border-radius: 4px; overflow: hidden;
      box-shadow: 0 32px 80px rgba(26,23,20,0.14);
    }
    .hs-services-img img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }

    /* ── ABOUT ── */
    .hs-about {
      padding: clamp(4rem, 8vw, 8rem) clamp(1.5rem, 6vw, 5rem);
      background: #f5f0e8;
      display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2.5rem, 5vw, 6rem); align-items: center;
    }
    .hs-about-img { border-radius: 4px; overflow: hidden; position: relative; }
    .hs-about-img img { width: 100%; height: clamp(380px, 50vw, 560px); object-fit: cover; display: block; }
    .hs-about-quote {
      font-family: 'Cormorant Garamond', serif; font-style: italic;
      font-size: clamp(1.3rem, 2.5vw, 1.75rem); font-weight: 300;
      color: #1a1714; line-height: 1.5; margin-bottom: 1.75rem;
      padding-left: 1.5rem; border-left: 3px solid; letter-spacing: -0.01em;
    }
    .hs-about-body {
      font-size: 0.9rem; color: #5c5449; font-weight: 300; line-height: 1.9; margin-bottom: 2rem;
    }

    /* ── TEAM ── */
    .hs-team { padding: clamp(4rem, 8vw, 8rem) clamp(1.5rem, 6vw, 5rem); background: #fdfcfa; }
    .hs-team-header { text-align: center; max-width: 480px; margin: 0 auto 3.5rem; }
    .hs-team-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 2rem; max-width: 1100px; margin: 0 auto;
    }
    .hs-team-card { text-align: center; }
    .hs-team-photo {
      width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 4px;
      display: block; margin-bottom: 1rem; transition: transform 0.4s ease;
    }
    .hs-team-avatar {
      width: 100%; aspect-ratio: 3/4; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 3rem;
      font-weight: 700; color: #fff; margin-bottom: 1rem;
    }
    .hs-team-card:hover .hs-team-photo { transform: scale(1.02); }
    .hs-team-name {
      font-family: 'Playfair Display', serif; font-size: 1.05rem; font-weight: 700;
      color: #1a1714; margin-bottom: 0.25rem;
    }
    .hs-team-role {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: #a8a29e;
    }

    /* ── REVIEWS ── */
    .hs-reviews {
      padding: clamp(4rem, 8vw, 8rem) clamp(1.5rem, 6vw, 5rem);
      background: #1a1714; position: relative; overflow: hidden;
    }
    .hs-reviews-deco {
      position: absolute; font-family: 'Playfair Display', serif;
      font-size: clamp(10rem, 22vw, 18rem); line-height: 0.85;
      opacity: 0.05; color: #fff; top: -10px; left: clamp(1rem, 4vw, 4rem);
      user-select: none; pointer-events: none;
    }
    .hs-reviews-inner { max-width: 660px; margin: 0 auto; text-align: center; position: relative; z-index: 1; }
    .hs-reviews-label {
      font-size: 0.62rem; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase; display: block; margin-bottom: 0.75rem;
    }
    .hs-reviews-title {
      font-family: 'Playfair Display', serif; font-size: clamp(1.8rem, 4vw, 2.6rem);
      font-weight: 700; color: #fff; margin-bottom: 3.5rem; line-height: 1.15;
    }
    .hs-review-stars { display: flex; justify-content: center; gap: 3px; margin-bottom: 1.75rem; }
    .hs-review-text {
      font-family: 'Cormorant Garamond', serif; font-style: italic;
      font-size: clamp(1.2rem, 2.5vw, 1.5rem); color: rgba(255,255,255,0.88);
      line-height: 1.75; margin-bottom: 2rem; font-weight: 300;
    }
    .hs-review-author {
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.22em;
      text-transform: uppercase; color: rgba(255,255,255,0.4);
    }
    .hs-review-nav {
      display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2.5rem;
    }
    .hs-review-btn {
      width: 40px; height: 40px; border-radius: 50%;
      background: transparent; border: 1px solid rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.55); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .hs-review-btn:hover { border-color: rgba(255,255,255,0.5); color: #fff; background: rgba(255,255,255,0.06); }
    .hs-review-dots { display: flex; gap: 6px; }
    .hs-review-dot {
      height: 6px; border-radius: 3px; background: rgba(255,255,255,0.2);
      border: none; cursor: pointer; padding: 0; transition: all 0.3s;
    }
    .hs-review-dot.active { background: rgba(255,255,255,0.6); }

    /* ── BOOKING ── */
    .hs-booking { padding: clamp(4rem, 8vw, 8rem) clamp(1.5rem, 6vw, 5rem); background: #fdfcfa; }
    .hs-booking-inner { max-width: 820px; margin: 0 auto; }
    .hs-booking-header { text-align: center; margin-bottom: 3.5rem; }

    /* ── FOOTER ── */
    .hs-footer {
      background: #1a1714; color: rgba(255,255,255,0.5);
      padding: clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 6vw, 5rem) 2rem;
    }
    .hs-footer-top {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 2rem; margin-bottom: 2rem;
      padding-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .hs-footer-brand {
      font-family: 'Playfair Display', serif; font-size: 1.2rem;
      font-weight: 700; text-decoration: none;
    }
    .hs-footer-links { display: flex; flex-wrap: wrap; gap: 1.5rem; }
    .hs-footer-link {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
      text-decoration: none; transition: color 0.2s; cursor: pointer;
    }
    .hs-footer-copy { font-size: 0.68rem; text-align: center; letter-spacing: 0.05em; opacity: 0.35; }

    /* ── RESPONSIVE ── */
    @media (max-width: 900px) {
      .hs-hero { grid-template-columns: 1fr; height: auto; min-height: unset; }
      .hs-hero-img { height: 55vw; min-height: 260px; max-height: 420px; }
      .hs-hero-content { padding: 2.5rem 1.5rem; }
      .hs-hero-sub { max-width: 100%; }
      .hs-services-inner, .hs-about { grid-template-columns: 1fr; gap: 2.5rem; }
      .hs-services-img { position: static; }
      .hs-about-img img { height: 300px; }
      .hs-nav-links, .hs-nav-cta { display: none !important; }
      .hs-hamburger { display: flex; }
    }
    @media (max-width: 600px) {
      .hs-service-row { flex-wrap: wrap; gap: 0.4rem; }
      .hs-service-meta { width: 100%; justify-content: flex-start; }
      .hs-section-title { font-size: clamp(1.6rem, 6vw, 2.4rem); }
    }
    @media (max-width: 480px) {
      .hs-hero-actions { flex-direction: column; }
      .hs-btn-primary, .hs-btn-outline { text-align: center; width: 100%; display: block; }
      .hs-team-grid { grid-template-columns: 1fr 1fr; gap: 1.25rem; }
      /* Section padding */
      .hs-services, .hs-about, .hs-team, .hs-reviews, .hs-booking {
        padding: 3rem 1.25rem;
      }
      /* Stats bar — stack to single column */
      .hs-stats { grid-template-columns: 1fr; padding: 0; }
      .hs-stat { padding: 0.75rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.15); }
      .hs-stat:last-child { border-bottom: none; }
      .hs-stat + .hs-stat::before { display: none; }
      .hs-stat-num { font-size: 1.8rem; }
      .hs-stat-label { font-size: 0.62rem; letter-spacing: 0.1em; }
      /* About section */
      .hs-about-img img { height: 240px; }
      .hs-about-quote { font-size: 1.15rem; padding-left: 1rem; }
      /* Reviews */
      .hs-review-text { font-size: 1.1rem; }
      /* Booking */
      .hs-booking-header { margin-bottom: 2rem; }
    }
  `}</style>
);

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function HairdresserTemplate({ tenantData }) {
  const navigate   = useNavigate();
  const [slots,      setSlots]      = useState([]);
  const [reviews,    setReviews]    = useState([]);
  const [team,       setTeam]       = useState([]);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [modal,      setModal]      = useState(null);
  const [revIdx,     setRevIdx]     = useState(0);
  const [teamMember, setTeamMember] = useState(null);

  const shopId      = tenantData?.id || tenantData?.uid;
  const brandColor  = tenantData?.brandColor  || '#a07850';
  const businessName = tenantData?.businessName || tenantData?.name || 'The Salon';
  const logo        = tenantData?.logoUrl || tenantData?.logo || null;
  const fontKey     = tenantData?.siteFont;
  const displayFont = getFontFamily(fontKey, 'playfair');

  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Save branding so TenantLogin/TenantSignup can pick it up if navigated directly
  useEffect(() => {
    if (tenantData) {
      localStorage.setItem('active_tenant_branding', JSON.stringify(tenantData));
    }
  }, [tenantData]);

  useEffect(() => {
    if (!shopId) return;
    async function load() {
      try {
        const [slotsSnap, revSnap, teamSnap] = await Promise.all([
          getDocs(query(collection(db, 'slots'), where('barberId', '==', shopId), where('isBooked', '==', false))),
          getDocs(collection(db, 'barbers', shopId, 'reviews')),
          getDocs(collection(db, 'barbers', shopId, 'staff')),
        ]);
        setSlots(slotsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setReviews(revSnap.docs.map(d => d.data()));
        setTeam(teamSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.name));
      } catch (err) { console.error(err); }
    }
    load();
  }, [shopId]);

  /* ── Content with fallbacks ── */
  const heroImage    = tenantData?.heroImage || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2069&auto=format&fit=crop';
  const heroEyebrow  = tenantData?.heroTagline || 'London\'s Premier Hair Salon';
  const heroLine1    = tenantData?.heroHeadingLine1 || 'Where Every';
  const heroLine2    = tenantData?.heroHeadingLine2 || 'Strand Shines';
  const heroSub      = tenantData?.heroSubtext || 'Expert colour, precision cuts and transformative styling. Your most confident hair starts with us.';
  const heroCta      = tenantData?.heroCtaText || 'Book Your Appointment';
  const aboutHeading = tenantData?.aboutHeading || 'Our story, your style';
  const aboutQuote   = tenantData?.aboutQuote   || '"We believe great hair is the foundation of everyday confidence."';
  const aboutBody    = tenantData?.aboutBody || tenantData?.aboutUs || 'Founded on the belief that every person deserves hair they love, our salon brings together award-winning stylists dedicated to the craft. From precision cuts to transformative colour, every visit is tailored to you.';
  const servicesImg  = tenantData?.servicesImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop';
  const aboutImg     = tenantData?.heroImageMobile || 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=2036&auto=format&fit=crop';

  const stats = [
    { num: tenantData?.stat1Value || '12+',  label: tenantData?.stat1Label || 'Years of expertise' },
    { num: tenantData?.stat2Value || '5.0★', label: tenantData?.stat2Label || 'Average rating' },
    { num: tenantData?.stat3Value || '400+', label: tenantData?.stat3Label || 'Happy clients monthly' },
  ];

  const services = (tenantData?.services?.length > 0 ? tenantData.services : [
    { name: 'Cut & Blow Dry',         duration: '60 min',  price: 65  },
    { name: 'Full Colour',            duration: '2 hrs',   price: 110 },
    { name: 'Highlights / Balayage',  duration: '2.5 hrs', price: 145 },
    { name: 'Keratin Treatment',      duration: '2 hrs',   price: 130 },
    { name: 'Bridal Hair',            duration: '90 min',  price: 195 },
    { name: 'Men\'s Cut',             duration: '45 min',  price: 45  },
    { name: 'Blow Dry Only',          duration: '45 min',  price: 35  },
  ]);

  // Owner always appears first in team
  const ownerMember = {
    id: shopId,
    name: tenantData?.ownerName || businessName,
    role: tenantData?.ownerRole || 'Owner / Lead Stylist',
    profilePic: tenantData?.profilePic || tenantData?.logoUrl || null,
    bio: tenantData?.bio || tenantData?.aboutBody || tenantData?.aboutUs || '',
    isOwner: true,
  };
  const allTeam = [ownerMember, ...team];

  const privacyText = tenantData?.privacyPolicy   || `At ${businessName}, we take your privacy seriously. We collect only the information needed to manage your appointments and never share your data with third parties.`;
  const termsText   = tenantData?.termsConditions || `By booking with ${businessName}, you agree to our cancellation policy. We require 24 hours notice for cancellations. Late cancellations or no-shows may incur a charge.`;

  const instagramUrl = tenantData?.instagramUrl || '';
  const tiktokUrl    = tenantData?.tiktokUrl    || '';
  const facebookUrl  = tenantData?.facebookUrl  || '';

  const totalReviews = reviews.length;
  const currentReview = reviews[revIdx];
  const prevRev = () => setRevIdx(i => (i - 1 + totalReviews) % totalReviews);
  const nextRev = () => setRevIdx(i => (i + 1) % totalReviews);

  const handleSlotSelect = (slot) =>
    navigate(`/book/${shopId}/${slot.id}?isStaff=false&shopId=${shopId}`, {
      state: { tenant: tenantData },
    });

  const scroll = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Render ── */
  return (
    <>
      <HairdresserStyles />
      <style>{`
        .hs-hero h1, .hs-section-title, .hs-about-quote, .hs-reviews-title,
        .hs-review-text, .hs-team-name, .hs-nav-brand, .hs-footer-brand,
        .hs-stat-num, .hs-service-price {
          font-family: ${displayFont} !important;
        }
      `}</style>

      <div className="hs-page">

        {/* ─── NAV ─── */}
        <nav className="hs-nav">
          <a href="#" className="hs-nav-brand" style={{ color: brandColor }}>
            {logo
              ? <img src={logo} alt="Logo" style={{ height: 36, display: 'block' }} />
              : businessName}
          </a>
          <div className="hs-nav-links">
            {[['about','About'],['services','Services'],['team','Our Team'],['reviews','Reviews']].map(([id, label]) => (
              <a key={id} href={`#${id}`}>{label}</a>
            ))}
          </div>
          <a href="#booking" className="hs-nav-cta" style={{ background: brandColor }}>
            Book Now
          </a>
          <button className="hs-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </nav>

        {menuOpen && (
          <div className="hs-mobile-menu">
            {[['about','About'],['services','Services'],['team','Our Team'],['reviews','Reviews'],['booking','Book']].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => scroll(id)}>{label}</a>
            ))}
            <a href="#booking" className="hs-mobile-cta" style={{ background: brandColor }} onClick={() => scroll('booking')}>
              Book an Appointment
            </a>
          </div>
        )}

        {/* ─── HERO — split screen ─── */}
        <section id="home">
          <div className="hs-hero">

            {/* Image panel */}
            <div className="hs-hero-img">
              <img src={heroImage} alt="Salon" />
              {/* Brand-coloured top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: brandColor, zIndex: 2 }} />
            </div>

            {/* Content panel */}
            <div className="hs-hero-content">
              <div className="hs-hero-eyebrow" style={{ color: brandColor }}>
                {heroEyebrow}
              </div>
              <h1>
                {heroLine1}<br />
                <span className="hs-hero-accent" style={{ color: brandColor }}>{heroLine2}</span>
              </h1>
              <p className="hs-hero-sub">{heroSub}</p>
              <div className="hs-hero-actions">
                <a href="#booking" className="hs-btn-primary" style={{ background: brandColor }}>
                  {heroCta}
                </a>
                <a href="#services" className="hs-btn-outline">
                  View Services
                </a>
              </div>
              <div className="hs-hero-deco">S</div>
            </div>

          </div>
        </section>

        {/* ─── STATS BAR ─── */}
        <div className="hs-stats" style={{ background: brandColor }}>
          {stats.map((s, i) => (
            <div key={i} className="hs-stat">
              <span className="hs-stat-num">{s.num}</span>
              <span className="hs-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ─── SERVICES ─── */}
        <section id="services" className="hs-services">
          <div className="hs-services-inner">
            <div>
              <span className="hs-section-label" style={{ color: brandColor }}>What We Offer</span>
              <h2 className="hs-section-title">Our Services</h2>
              <p className="hs-section-sub" style={{ display: 'block', marginTop: '-1.5rem' }}>
                All prices are a guide — your stylist will advise at consultation.
              </p>

              {services.map((svc, i) => (
                <div key={i} className="hs-service-row">
                  <span className="hs-service-name">{svc.name || svc}</span>
                  <div className="hs-service-meta">
                    {(svc.duration) && (
                      <span className="hs-service-duration">{svc.duration}</span>
                    )}
                    <span className="hs-service-price" style={{ color: brandColor }}>
                      {svc.price ? formatCurrency(svc.price) : ''}
                    </span>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '2rem' }}>
                <a href="#booking" className="hs-btn-primary" style={{ background: brandColor }}>
                  Book Appointment
                </a>
              </div>
            </div>

            <div className="hs-services-img">
              <img src={servicesImg} alt="Salon services" />
            </div>
          </div>
        </section>

        {/* ─── ABOUT ─── */}
        <section id="about" className="hs-about">
          <div className="hs-about-img">
            <img src={aboutImg} alt="About us" />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, rgba(245,240,232,0.6), transparent)' }} />
          </div>
          <div>
            <span className="hs-section-label" style={{ color: brandColor }}>Our Story</span>
            <h2 className="hs-section-title">{aboutHeading}</h2>
            <blockquote className="hs-about-quote" style={{ borderColor: brandColor }}>
              {aboutQuote}
            </blockquote>
            <p className="hs-about-body">{aboutBody}</p>
            <a href="#team" className="hs-btn-primary" style={{ background: '#1a1714' }}>
              Meet the Team
            </a>
          </div>
        </section>

        {/* ─── TEAM ─── */}
        <section id="team" className="hs-team">
          <div className="hs-team-header">
            <span className="hs-section-label" style={{ color: brandColor }}>The Stylists</span>
            <h2 className="hs-section-title" style={{ textAlign: 'center' }}>Meet Our Team</h2>
          </div>
          <div className="hs-team-grid">
            {allTeam.map((member, i) => (
              <div
                key={member.id || i}
                className="hs-team-card"
                onClick={() => setTeamMember(member)}
                style={{ cursor: 'pointer' }}
              >
                {member.profilePic ? (
                  <img src={member.profilePic} alt={member.name} className="hs-team-photo" />
                ) : (
                  <div className="hs-team-avatar" style={{ background: brandColor }}>
                    {member.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="hs-team-name">{member.name}</div>
                <div className="hs-team-role">{member.role || member.specialty || 'Stylist'}</div>
                <div style={{ fontSize: '0.65rem', color: brandColor, marginTop: '0.4rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  View Profile →
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── REVIEWS ─── */}
        <section id="reviews" className="hs-reviews">
          <div className="hs-reviews-deco">"</div>
          <div className="hs-reviews-inner">
            <span className="hs-reviews-label" style={{ color: brandColor }}>Testimonials</span>
            <h2 className="hs-reviews-title">What our clients say</h2>

            {totalReviews > 0 && currentReview ? (
              <>
                <div className="hs-review-stars">
                  {[...Array(Number(currentReview.rating) || 5)].map((_, i) => (
                    <Star key={i} size={18} fill={brandColor} color={brandColor} />
                  ))}
                </div>
                <p className="hs-review-text">"{currentReview.comment}"</p>
                <p className="hs-review-author">{currentReview.customerName || 'Verified Client'}</p>

                {totalReviews > 1 && (
                  <div className="hs-review-nav">
                    <button className="hs-review-btn" onClick={prevRev}>
                      <ChevronLeft size={18} />
                    </button>
                    <div className="hs-review-dots">
                      {reviews.map((_, i) => (
                        <button
                          key={i} className={`hs-review-dot${i === revIdx ? ' active' : ''}`}
                          style={{ width: i === revIdx ? 22 : 6 }}
                          onClick={() => setRevIdx(i)}
                        />
                      ))}
                    </div>
                    <button className="hs-review-btn" onClick={nextRev}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontSize: '1rem' }}>
                No reviews yet — be the first to share your experience.
              </p>
            )}

            <div style={{ marginTop: '2.5rem' }}>
              <button
                onClick={() => navigate(`/review/${shopId}`)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.6)', padding: '0.75rem 1.75rem', borderRadius: 4,
                  fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: '0.72rem',
                  letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                  transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <RateReviewIcon style={{ fontSize: 15 }} /> Leave a Review
              </button>
            </div>
          </div>
        </section>

        {/* ─── BOOKING ─── */}
        <section id="booking" className="hs-booking">
          <div className="hs-booking-inner">
            <div className="hs-booking-header">
              <span className="hs-section-label" style={{ color: brandColor }}>Availability</span>
              <h2 className="hs-section-title">Book Your Appointment</h2>
              <p style={{ color: '#8b8179', fontSize: '0.9rem', fontWeight: 300, marginTop: '0.5rem' }}>
                Choose a date and time that works for you. Confirmation sent by email.
              </p>
            </div>
            <SlotPicker
              slots={slots}
              brandColor={brandColor}
              onSelect={handleSlotSelect}
            />
          </div>
        </section>

        {/* ─── TEAM PROFILE MODAL ─── */}
        {teamMember && (
          <div
            onClick={() => setTeamMember(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(26,23,20,0.75)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fdfcfa', borderRadius: 6, maxWidth: 460, width: '100%',
                overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.35)',
                position: 'relative',
              }}
            >
              {/* Header strip */}
              <div style={{ height: 5, background: brandColor }} />
              <button
                onClick={() => setTeamMember(null)}
                style={{
                  position: 'absolute', top: 14, right: 14, background: 'transparent',
                  border: 'none', cursor: 'pointer', color: '#a8a29e', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
              <div style={{ display: 'flex', gap: '1.5rem', padding: '1.75rem', alignItems: 'flex-start' }}>
                {teamMember.profilePic ? (
                  <img
                    src={teamMember.profilePic}
                    alt={teamMember.name}
                    style={{ width: 90, height: 110, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 90, height: 110, borderRadius: 4, flexShrink: 0,
                    background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 700, color: '#fff',
                  }}>
                    {teamMember.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, marginBottom: '0.4rem' }}>
                    {teamMember.isOwner ? 'The Team' : 'Our Stylist'}
                  </p>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: '#1a1714', marginBottom: '0.3rem', lineHeight: 1.1 }}>
                    {teamMember.name}
                  </h3>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a8a29e' }}>
                    {teamMember.role || teamMember.specialty || 'Stylist'}
                  </p>
                </div>
              </div>
              {teamMember.bio && (
                <div style={{ padding: '0 1.75rem 1.75rem' }}>
                  <p style={{ fontSize: '0.9rem', color: '#5c5449', lineHeight: 1.85, fontWeight: 300 }}>
                    {teamMember.bio}
                  </p>
                </div>
              )}
              <div style={{ padding: '0 1.75rem 1.75rem' }}>
                <a
                  href="#booking"
                  onClick={() => setTeamMember(null)}
                  style={{
                    display: 'inline-block', padding: '0.85rem 2rem', background: brandColor,
                    color: '#fff', textDecoration: 'none', borderRadius: 2,
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}
                >
                  Book with {teamMember.name?.split(' ')[0]}
                </a>
              </div>
            </div>
          </div>
        )}

      </div>{/* end hs-page */}

      {/* ─── FOOTER (matches all other tenant pages) ─── */}
      <TenantFooter tenant={tenantData} businessType={tenantData?.businessType} />
    </>
  );
}
