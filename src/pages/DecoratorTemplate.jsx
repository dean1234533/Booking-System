import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFontFamily, loadGoogleFont } from "../utils/fontOptions";
import { Star, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  Box, Typography, Container, Stack, Link, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, Paper, Avatar, IconButton
} from "@mui/material";
import { TextField } from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';

/* ─── Global style injection ─────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --cream:   #faf8f5;
      --sand:    #f0ebe2;
      --stone:   #e8e0d5;
      --ink:     #1c1917;
      --ink-mid: #44403c;
      --ink-soft:#78716c;
      --gold:    #b5924c;
      --gold-lt: #d4af6e;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--cream); }
    .dt-page { font-family: 'DM Sans', sans-serif; color: var(--ink); background: var(--cream); overflow-x: hidden; }
    .dt-nav {
      position: fixed; top: 0; width: 100%; z-index: 100;
      background: rgba(250,248,245,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--stone);
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 2.5rem; height: 72px;
    }
    .dt-nav-brand { display: flex; align-items: center; gap: 12px; }
    .dt-nav-logo {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--sand); border: 1.5px solid var(--stone);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .dt-nav-name { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 1.2rem; color: var(--ink); letter-spacing: 0.01em; }
    .dt-nav-links { display: flex; gap: 2rem; }
    .dt-nav-links a {
      font-size: 0.875rem; font-weight: 500; color: var(--ink-mid); text-decoration: none;
      letter-spacing: 0.04em; text-transform: uppercase;
      transition: color 0.2s;
    }
    .dt-nav-links a:hover { color: var(--ink); }
    .dt-nav-cta {
      font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 0.65rem 1.6rem; border-radius: 2px; text-decoration: none; color: #fff;
      transition: opacity 0.2s, transform 0.15s;
    }
    .dt-nav-cta:hover { opacity: 0.88; transform: translateY(-1px); }
    .dt-hero {
      position: relative; height: 100vh; display: flex; align-items: flex-end;
      justify-content: flex-start; overflow: hidden; padding: 0 0 6rem 6rem;
    }
    .dt-hero-bg { position: absolute; inset: 0; }
    .dt-hero-bg img { width: 100%; height: 100%; object-fit: cover; }
    .dt-hero-bg::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(120deg, rgba(28,25,23,0.75) 0%, rgba(28,25,23,0.3) 60%, transparent 100%);
    }
    .dt-hero-content { position: relative; z-index: 2; max-width: 680px; }
    .dt-hero-eyebrow {
      display: inline-block; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.2em;
      text-transform: uppercase; color: var(--gold-lt); margin-bottom: 1.25rem;
      padding: 0.35rem 0; border-bottom: 1px solid var(--gold);
    }
    .dt-hero h1 {
      font-family: 'Playfair Display', serif; font-size: clamp(2.8rem, 6vw, 5rem);
      font-weight: 900; color: #fff; line-height: 1.1; margin-bottom: 1.5rem; letter-spacing: -0.01em;
    }
    .dt-hero-accent { color: var(--gold-lt); font-style: italic; }
    .dt-hero-sub {
      font-size: 1.05rem; color: rgba(255,255,255,0.8); font-weight: 300;
      line-height: 1.7; margin-bottom: 2.5rem; max-width: 480px;
    }
    .dt-hero-actions { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .dt-hero-btn {
      font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 1rem 2.5rem; border-radius: 2px; border: none; cursor: pointer;
      color: #fff; transition: opacity 0.2s, transform 0.15s;
    }
    .dt-hero-btn:hover { opacity: 0.88; transform: translateY(-2px); }
    .dt-hero-badge {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.08); backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.18); border-radius: 2px;
      padding: 0.75rem 1.25rem;
    }
    .dt-hero-badge span { font-size: 0.8rem; color: rgba(255,255,255,0.9); font-weight: 500; }
    .dt-section-label {
      display: block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.22em;
      text-transform: uppercase; color: var(--ink-soft); margin-bottom: 0.75rem;
    }
    .dt-section-title {
      font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 2.8rem);
      font-weight: 700; color: var(--ink); line-height: 1.2;
    }
    .dt-underline {
      width: 48px; height: 3px; border-radius: 2px; margin-top: 1.25rem;
    }
    .dt-about {
      padding: 7rem 6rem;
      display: grid; grid-template-columns: 1fr 1.2fr; gap: 5rem; align-items: center;
      background: var(--cream);
    }
    .dt-about-text { font-size: 1.1rem; color: var(--ink-mid); line-height: 1.85; font-weight: 300; margin-top: 1.5rem; }
    .dt-about-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .dt-stat {
      background: var(--sand); border: 1px solid var(--stone); border-radius: 4px;
      padding: 1.75rem 1.5rem;
    }
    .dt-stat-num { font-family: 'Playfair Display', serif; font-size: 2.5rem; font-weight: 900; color: var(--ink); line-height: 1; }
    .dt-stat-label { font-size: 0.78rem; color: var(--ink-soft); font-weight: 500; margin-top: 0.35rem; letter-spacing: 0.06em; }
    .dt-services {
      padding: 7rem 6rem; background: var(--sand);
    }
    .dt-services-inner { display: grid; grid-template-columns: 1.1fr 1fr; gap: 5rem; align-items: center; max-width: 1200px; margin: 0 auto; }
    .dt-services-header { margin-bottom: 3rem; }
    .dt-service-card { background: var(--cream); border: 1px solid var(--stone); border-radius: 4px; padding: 2.5rem; }
    .dt-service-item {
      display: flex; align-items: center; gap: 1rem;
      padding: 0.85rem 0; border-bottom: 1px solid var(--stone);
      font-size: 1rem; font-weight: 400; color: var(--ink-mid); letter-spacing: 0.01em;
    }
    .dt-service-item:last-of-type { border-bottom: none; }
    .dt-service-btn {
      display: block; width: 100%; margin-top: 2rem; border: none; cursor: pointer;
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      padding: 1rem; border-radius: 2px; color: #fff; transition: opacity 0.2s;
    }
    .dt-service-btn:hover { opacity: 0.88; }
    .dt-services-img { border-radius: 4px; overflow: hidden; box-shadow: 0 24px 64px rgba(28,25,23,0.15); }
    .dt-services-img img { width: 100%; height: 480px; object-fit: cover; display: block; }
    .dt-portfolio { padding: 7rem 6rem; background: var(--cream); }
    .dt-portfolio-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 3rem; max-width: 1200px; margin-left: auto; margin-right: auto; }
    .dt-portfolio-sub { font-size: 0.9rem; color: var(--ink-soft); max-width: 360px; text-align: right; line-height: 1.6; }
    .dt-portfolio-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .dt-portfolio-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft); text-align: center; margin-top: 0.75rem; }
    .dt-reviews { padding: 7rem 6rem; background: var(--sand); }
    .dt-reviews-header { text-align: center; margin-bottom: 4rem; }
    .dt-review-card {
      background: var(--cream); border: 1px solid var(--stone);
      border-radius: 4px; padding: 2.25rem;
      display: flex; flex-direction: column; gap: 1.25rem;
      max-width: 600px; margin: 0 auto;
    }
    .dt-review-quote { font-size: 2.5rem; color: var(--stone); line-height: 1; font-family: 'Playfair Display', serif; }
    .dt-review-text { font-size: 1.1rem; color: var(--ink-mid); line-height: 1.75; font-weight: 300; }
    .dt-review-divider { height: 1px; background: var(--stone); }
    .dt-review-footer { display: flex; align-items: center; gap: 1rem; }
    .dt-review-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--sand); border: 1.5px solid var(--stone);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; color: var(--ink); flex-shrink: 0;
    }
    .dt-review-name { font-weight: 600; font-size: 0.9rem; color: var(--ink); }
    .dt-review-verified { font-size: 0.72rem; color: var(--ink-soft); margin-top: 2px; letter-spacing: 0.04em; }
    .dt-review-cta { text-align: center; margin-top: 4rem; }
    .dt-contact { padding: 7rem 6rem; background: var(--ink); }
    .dt-contact-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 6rem; max-width: 1100px; margin: 0 auto; align-items: start; }
    .dt-contact .dt-section-label { color: var(--gold); }
    .dt-contact .dt-section-title { color: #fff; }
    .dt-contact-sub { font-size: 0.95rem; color: rgba(255,255,255,0.5); line-height: 1.75; margin-top: 1.25rem; font-weight: 300; }
    .dt-contact-perks { margin-top: 2.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .dt-contact-perk { display: flex; align-items: center; gap: 0.75rem; font-size: 0.88rem; color: rgba(255,255,255,0.65); font-weight: 400; }
    .dt-contact-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .dt-form { display: flex; flex-direction: column; gap: 1rem; }
    .dt-input {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 3px; padding: 1rem 1.25rem; color: #fff; font-size: 0.9rem;
      font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s;
      width: 100%;
    }
    .dt-input::placeholder { color: rgba(255,255,255,0.3); }
    .dt-input:focus { border-color: rgba(255,255,255,0.4); }
    .dt-textarea { resize: vertical; min-height: 120px; }
    .dt-form-btn {
      border: none; cursor: pointer; color: #fff;
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      padding: 1.1rem; border-radius: 3px; margin-top: 0.5rem;
      transition: opacity 0.2s, transform 0.15s; font-family: 'DM Sans', sans-serif;
    }
    .dt-form-btn:hover { opacity: 0.88; transform: translateY(-2px); }
    .dt-footer { background: #111; border-top: 1px solid rgba(255,255,255,0.05); padding: 3rem 6rem; }
    .dt-footer-inner { display: flex; justify-content: space-between; align-items: center; }
    .dt-footer-brand { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; }
    .dt-footer-links { display: flex; gap: 2rem; }
    .dt-footer-link {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
      color: rgba(255,255,255,0.35); cursor: pointer; text-decoration: none;
      transition: color 0.2s;
    }
    .dt-footer-copy { font-size: 0.72rem; color: rgba(255,255,255,0.2); margin-top: 2rem; text-align: center; letter-spacing: 0.06em; }
    .ba-slider { position: relative; width: 100%; aspect-ratio: 4/5; border-radius: 4px; overflow: hidden; cursor: col-resize; border: 1px solid var(--stone); }
    .ba-handle { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; z-index: 10; }
    .ba-handle-knob {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 34px; height: 34px; background: #fff; border-radius: 50%;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;
    }
    .ba-label {
      position: absolute; bottom: 12px; font-size: 0.62rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase; color: #fff; z-index: 10;
      background: rgba(0,0,0,0.45); padding: 4px 10px; border-radius: 2px;
    }
    .ba-label-before { left: 14px; }
    .ba-label-after { right: 14px; }
    .dt-hamburger {
      display: none; flex-direction: column; gap: 5px;
      background: none; border: none; cursor: pointer; padding: 8px; flex-shrink: 0;
    }
    .dt-hamburger span {
      display: block; width: 24px; height: 2px; background: var(--ink); border-radius: 2px;
    }
    .dt-mobile-menu {
      position: fixed; top: 72px; left: 0; right: 0; z-index: 99;
      background: rgba(250,248,245,0.98); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--stone); padding: 12px 1.5rem 18px;
    }
    .dt-mobile-menu a {
      display: block; padding: 11px 0; font-size: 13px; font-weight: 600;
      letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none;
      color: var(--ink); border-bottom: 1px solid var(--stone);
    }
    .dt-mobile-menu-cta {
      display: block; margin-top: 14px; padding: 12px; text-align: center;
      color: #fff; border-radius: 2px; font-size: 12px; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none;
    }
    @media (max-width: 900px) {
      .dt-nav { padding: 0 1.5rem; }
      .dt-nav-links, .dt-nav-cta { display: none; }
      .dt-hamburger { display: flex; }
      .dt-hero { padding: 0 2rem 4rem; }
      .dt-about, .dt-services-inner, .dt-contact-inner { grid-template-columns: 1fr; gap: 2.5rem; }
      .dt-about, .dt-services, .dt-portfolio, .dt-reviews, .dt-contact, .dt-footer { padding: 4rem 1.5rem; }
      .dt-services-img img { height: 300px; }
      .dt-portfolio-grid { grid-template-columns: 1fr; }
      .dt-portfolio-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .dt-portfolio-sub { text-align: left; max-width: 100%; }
      .dt-footer-inner { flex-direction: column; gap: 1.5rem; text-align: center; }
      .dt-footer-links { flex-wrap: wrap; justify-content: center; gap: 1rem; }
    }
    @media (max-width: 480px) {
      .dt-nav { height: 60px; padding: 0 1.25rem; }
      .dt-mobile-menu { top: 60px; }
      .dt-hero { padding: 0 1.25rem 3rem; }
      .dt-hero h1 { font-size: clamp(2rem, 9vw, 2.8rem); }
      .dt-hero-sub { font-size: 0.9rem; }
      .dt-hero-actions { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .dt-hero-btn { width: 100%; text-align: center; }
      .dt-hero-badge { width: 100%; justify-content: center; }
      .dt-about, .dt-services, .dt-portfolio, .dt-reviews, .dt-contact, .dt-footer { padding: 3rem 1.25rem; }
      .dt-about-stats { gap: 0.75rem; }
      .dt-services-img img { height: 200px; }
      .dt-review-card { padding: 1.5rem; }
      .dt-review-text { font-size: 0.95rem; }
      .dt-contact-inner { gap: 2rem; }
      .dt-footer { padding: 2.5rem 1.25rem; }
    }
  `}</style>
);

const BeforeAfterSlider = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x)));
  };
  return (
    <div className="ba-slider" onMouseMove={handleMove} onTouchMove={(e) => handleMove(e.touches[0])}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <img src={after || 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2070'} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${sliderPos}%` }}>
        <img src={before || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069'} alt="Before" style={{ width: '100vw', height: '100%', maxWidth: 'none', objectFit: 'cover' }} />
      </div>
      <span className="ba-label ba-label-before">Before</span>
      <span className="ba-label ba-label-after">After</span>
      <div className="ba-handle" style={{ left: `${sliderPos}%` }}>
        <div className="ba-handle-knob">
          <div style={{ display: 'flex', gap: '3px' }}>
            <div style={{ width: '2px', height: '12px', background: '#9ca3af', borderRadius: '2px' }}></div>
            <div style={{ width: '2px', height: '12px', background: '#9ca3af', borderRadius: '2px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DecoratorTemplate = ({ tenantData }) => {
  const [reviews, setReviews] = useState([]);
  const [modalContent, setModalContent] = useState(null);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    async function fetchReviews() {
      try {
        const reviewsRef = collection(db, "barbers", tenantData?.id || "default", "reviews");
        const snapshot = await getDocs(reviewsRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }
    }
    fetchReviews();
  }, [tenantData?.id]);

  const nextReview = () => setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
  const prevReview = () => setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);

  const fontKey     = tenantData?.siteFont;
  const displayFont = getFontFamily(fontKey, "playfair");
  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);

  /* ── All content resolved from tenantData with fallbacks ── */
  const brandColor    = tenantData?.brandColor  || "#b5924c";
  const businessName  = tenantData?.businessName || tenantData?.name || "Your Business";
  const logo          = tenantData?.logoUrl      || tenantData?.logo || null;

  // Hero
  const heroImage     = tenantData?.heroImage    || "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop";
  const heroEyebrow   = tenantData?.heroTagline  || "London's Trusted Decorators";
  const heroLine1     = tenantData?.heroHeadingLine1 || "Home Painting,";
  const heroLine2     = tenantData?.heroHeadingLine2 || "Done Right.";
  const heroSub       = tenantData?.heroSubtext  || "Fully insured. Results guaranteed. Professional painting and decorating services tailored to your home.";
  const heroCta       = tenantData?.heroCtaText  || "Get Your Free Quote";
  const heroReview    = tenantData?.heroReviewText || "Rated by 30+ Homeowners";

  // About
  const aboutTagline  = tenantData?.aboutTagline || "Who We Are";
  const aboutHeading  = tenantData?.aboutHeading || "Craft, care & a flawless finish";
  const aboutBody     = tenantData?.aboutBody    || tenantData?.aboutUs || "With over 10 years of experience in high-end residential painting and decorating, I pride myself on meticulous prep work and a flawless finish. Whether it's a single feature wall or a complete property refresh, I treat every home as if it were my own.";

  // Stats
  const stats = [
    { num: tenantData?.stat1Value || "10+",  label: tenantData?.stat1Label || "Years of experience" },
    { num: tenantData?.stat2Value || "200+", label: tenantData?.stat2Label || "Projects completed" },
    { num: tenantData?.stat3Value || "30+",  label: tenantData?.stat3Label || "Five-star reviews" },
    { num: tenantData?.stat4Value || "100%", label: tenantData?.stat4Label || "Satisfaction guaranteed" },
  ];

  // Services
  const servicesHeading = tenantData?.servicesHeading || "Everything your home needs";
  const servicesImage   = tenantData?.servicesImage   || "https://images.unsplash.com/photo-1562619425-c307bb83bc42?q=80&w=1935&auto=format&fit=crop";
  const serviceItems    = (tenantData?.services || []).length > 0
    ? tenantData.services
    : [
        { name: "Room repaints" }, { name: "Kitchen cabinet refreshes" },
        { name: "Stairs (including repairs)" }, { name: "Ceilings only" },
        { name: "Feature walls" }, { name: "Woodwork & trim" },
        { name: "Colour consultation included" },
      ];

  // Portfolio
  const portfolioHeading = tenantData?.portfolioHeading || "Recent transformations";
  const portfolioSubtext = tenantData?.portfolioSubtext || "Drag the slider on each image to reveal the difference a professional finish makes.";
  const portfolioItems   = (tenantData?.portfolioItems || []).length > 0
    ? tenantData.portfolioItems
    : [
        { before: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069", after: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2070", label: "Living Room — SW London" },
        { before: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?q=80&w=2076", after: "https://images.unsplash.com/photo-1556912177-f547c184827a?q=80&w=2070", label: "Kitchen Refresh — North London" },
        { before: "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074", after: "https://images.unsplash.com/photo-1527359353448-615621ad9d20?q=80&w=2069", label: "Full Interior — East London" },
      ];

  // Legal
  const privacyText = tenantData?.privacyPolicy   || `At ${businessName}, we value your privacy. We collect only information necessary to provide our services and never sell your data.`;
  const termsText   = tenantData?.termsConditions || `By using ${businessName}, you agree to our terms of service. All bookings are subject to our cancellation policy.`;

  // Social
  const instagramUrl = tenantData?.instagramUrl || "";
  const tiktokUrl    = tenantData?.tiktokUrl    || "";
  const facebookUrl  = tenantData?.facebookUrl  || "";
  const contactEmail = tenantData?.contactEmail || tenantData?.email || "";

  const currentReview = reviews[currentReviewIndex];

  return (
    <>
      <GlobalStyles />
      <style>{`
        .dt-hero h1, .dt-section-title, .dt-nav-name, .dt-stat-num, .dt-review-quote, .dt-footer-brand {
          font-family: ${displayFont} !important;
        }
      `}</style>
      <div className="dt-page">

        {/* ── NAV ── */}
        <nav className="dt-nav">
          <div className="dt-nav-brand">
            <div className="dt-nav-logo">
              {logo && <img src={logo} alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />}
            </div>
            <span className="dt-nav-name">{businessName}</span>
          </div>
          <div className="dt-nav-links">
            {["home","about","portfolio","reviews","services","contact"].map(s => (
              <a key={s} href={`#${s}`}>{s}</a>
            ))}
          </div>
          <a href="#contact" className="dt-nav-cta" style={{ backgroundColor: brandColor }}>Free Quote</a>
          <button className="dt-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </nav>
        {menuOpen && (
          <div className="dt-mobile-menu">
            {["home","about","portfolio","reviews","services","contact"].map(s => (
              <a key={s} href={`#${s}`} onClick={() => setMenuOpen(false)}>{s}</a>
            ))}
            <a href="#contact" className="dt-mobile-menu-cta" style={{ backgroundColor: brandColor }} onClick={() => setMenuOpen(false)}>
              Free Quote
            </a>
          </div>
        )}

        {/* ── HERO ── */}
        <header id="home" className="dt-hero">
          <div className="dt-hero-bg">
            <img src={heroImage} alt="Background" />
          </div>
          <div className="dt-hero-content">
            <span className="dt-hero-eyebrow">{heroEyebrow}</span>
            <h1>
              {heroLine1}<br />
              <span className="dt-hero-accent">{heroLine2}</span>
            </h1>
            <p className="dt-hero-sub">{heroSub}</p>
            <div className="dt-hero-actions">
              <button className="dt-hero-btn" style={{ backgroundColor: brandColor }} onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                {heroCta}
              </button>
              <div className="dt-hero-badge">
                <div style={{ display: 'flex', color: '#f59e0b' }}>{[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}</div>
                <span>{heroReview}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── ABOUT ── */}
        <section id="about" className="dt-about">
          <div>
            <span className="dt-section-label">{aboutTagline}</span>
            <h2 className="dt-section-title">{aboutHeading}</h2>
            <div className="dt-underline" style={{ backgroundColor: brandColor }}></div>
            <p className="dt-about-text">{aboutBody}</p>
          </div>
          <div className="dt-about-stats">
            {stats.map((s, i) => (
              <div className="dt-stat" key={i}>
                <div className="dt-stat-num" style={{ color: brandColor }}>{s.num}</div>
                <div className="dt-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section id="services" className="dt-services">
          <div className="dt-services-inner">
            <div>
              <div className="dt-services-header">
                <span className="dt-section-label">Our Services</span>
                <h2 className="dt-section-title">{servicesHeading}</h2>
                <div className="dt-underline" style={{ backgroundColor: brandColor }}></div>
              </div>
              <div className="dt-service-card">
                <ul style={{ listStyle: 'none' }}>
                  {serviceItems.map((item, i) => (
                    <li key={i} className="dt-service-item">
                      <CheckCircle2 size={18} style={{ color: brandColor, flexShrink: 0 }} />
                      {item.name || item}
                      {item.price ? ` — £${item.price}` : ""}
                    </li>
                  ))}
                </ul>
                <button className="dt-service-btn" style={{ backgroundColor: brandColor }} onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                  Get Your Free Quote
                </button>
              </div>
            </div>
            <div className="dt-services-img">
              <img src={servicesImage} alt="Services" />
            </div>
          </div>
        </section>

        {/* ── PORTFOLIO ── */}
        <section id="portfolio" className="dt-portfolio">
          <div className="dt-portfolio-header">
            <div>
              <span className="dt-section-label">Portfolio</span>
              <h2 className="dt-section-title">{portfolioHeading}</h2>
              <div className="dt-underline" style={{ backgroundColor: brandColor }}></div>
            </div>
            <p className="dt-portfolio-sub">{portfolioSubtext}</p>
          </div>
          <div className="dt-portfolio-grid">
            {portfolioItems.map((p, i) => (
              <div key={i}>
                <BeforeAfterSlider before={p.before} after={p.after} />
                <p className="dt-portfolio-label">{p.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── REVIEWS ── */}
        <section id="reviews" className="dt-reviews">
          <div className="dt-reviews-header">
            <span className="dt-section-label">Testimonials</span>
            <h2 className="dt-section-title">What clients say</h2>
            <div className="dt-underline" style={{ backgroundColor: brandColor, margin: '1.25rem auto 0' }}></div>
          </div>

          <Container maxWidth="md">
            {reviews.length > 0 && currentReview ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={prevReview}><ChevronLeft /></IconButton>
                <Box sx={{ flex: 1 }}>
                  <div className="dt-review-card">
                    <div style={{ display: 'flex', color: brandColor }}>
                      {[...Array(currentReview.rating || 5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                    </div>
                    <div className="dt-review-quote">"</div>
                    <p className="dt-review-text">{currentReview.comment}</p>
                    <div className="dt-review-divider"></div>
                    <div className="dt-review-footer">
                      <div className="dt-review-avatar">{currentReview.customerName?.charAt(0) || 'U'}</div>
                      <div>
                        <div className="dt-review-name">{currentReview.customerName || "Anonymous"}</div>
                        <div className="dt-review-verified">Verified Customer</div>
                      </div>
                    </div>
                  </div>
                </Box>
                <IconButton onClick={nextReview}><ChevronRight /></IconButton>
              </Box>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>No reviews yet.</p>
            )}

            <div className="dt-review-cta">
              <button
                onClick={() => window.location.href = `/review/${tenantData?.id || 'default'}`}
                className="dt-form-btn"
                style={{ background: 'transparent', border: '2px solid var(--ink)', color: 'var(--ink)' }}
              >
                <RateReviewIcon style={{ fontSize: 16, marginRight: 8 }} /> Leave a Review
              </button>
            </div>
          </Container>
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" className="dt-contact">
          <div className="dt-contact-inner">
            <div>
              <span className="dt-section-label">Get in Touch</span>
              <h2 className="dt-section-title">Request a free quote</h2>
              <p className="dt-contact-sub">Tell us about your project and we'll be in touch within 24 hours to discuss your vision and provide a no-obligation quote.</p>
              <div className="dt-contact-perks">
                {["No call centres — speak directly with the decorator", "Free, no-obligation quote within 24 hours", "Fully insured and 100% satisfaction guaranteed"].map((p, i) => (
                  <div key={i} className="dt-contact-perk">
                    <div className="dt-contact-dot" style={{ backgroundColor: brandColor }}></div>
                    {p}
                  </div>
                ))}
              </div>
              {/* Social links — shown if set */}
              {(instagramUrl || tiktokUrl || facebookUrl || contactEmail) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
                  {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.08em' }}>📸 Instagram</a>}
                  {tiktokUrl    && <a href={tiktokUrl}    target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.08em' }}>🎵 TikTok</a>}
                  {facebookUrl  && <a href={facebookUrl}  target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.08em' }}>📘 Facebook</a>}
                  {contactEmail && <a href={`mailto:${contactEmail}`} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.08em' }}>✉ Email</a>}
                </div>
              )}
            </div>
            <form className="dt-form" onSubmit={(e) => { e.preventDefault(); alert("Message sent! We'll be in touch within 24 hours."); }}>
              <input className="dt-input" placeholder="Full Name" required />
              <input className="dt-input" placeholder="Phone Number" type="tel" required />
              <textarea className="dt-input dt-textarea" placeholder="Tell me about your project…" />
              <button type="submit" className="dt-form-btn" style={{ backgroundColor: brandColor }}>Send Request</button>
            </form>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="dt-footer">
          <div className="dt-footer-inner">
            <div className="dt-footer-brand" style={{ color: brandColor }}>
              {logo && <img src={logo} alt="Logo" style={{ height: 36, marginBottom: 8, display: 'block' }} />}
              {businessName}
            </div>
            <div className="dt-footer-links">
              {privacyText  && <span className="dt-footer-link" onClick={() => setModalContent('privacy')}>Privacy</span>}
              {termsText    && <span className="dt-footer-link" onClick={() => setModalContent('terms')}>Terms</span>}
              {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="dt-footer-link">Instagram</a>}
              {facebookUrl  && <a href={facebookUrl}  target="_blank" rel="noopener noreferrer" className="dt-footer-link">Facebook</a>}
              {tiktokUrl    && <a href={tiktokUrl}    target="_blank" rel="noopener noreferrer" className="dt-footer-link">TikTok</a>}
            </div>
          </div>
          <p className="dt-footer-copy">© {new Date().getFullYear()} {businessName}. All rights reserved.</p>
        </footer>

        {/* ── LEGAL MODAL ── */}
        <Dialog
          open={Boolean(modalContent)}
          onClose={() => setModalContent(null)}
          maxWidth="sm" fullWidth
          PaperProps={{ sx: { bgcolor: '#1c1917', color: '#fff', borderRadius: '4px' } }}
        >
          <DialogTitle sx={{ fontFamily: 'Playfair Display, serif', fontWeight: 700 }}>
            {modalContent === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
          </DialogTitle>
          <DialogContent dividers sx={{ borderColor: '#333' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
              {modalContent === 'privacy' ? privacyText : termsText}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalContent(null)} sx={{ color: brandColor }}>Close</Button>
          </DialogActions>
        </Dialog>

      </div>
    </>
  );
};

export default DecoratorTemplate;