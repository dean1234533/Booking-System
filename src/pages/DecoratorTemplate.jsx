import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFontFamily, loadGoogleFont } from "../utils/fontOptions";
import { Star, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import RateReviewIcon  from '@mui/icons-material/RateReview';
import TenantNav       from '../components/TenantNav';

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
      border-radius: 4px; padding: 2.5rem;
      display: flex; flex-direction: column; gap: 1.25rem;
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
    .ba-slider { position: relative; width: 100%; aspect-ratio: 4/5; border-radius: 4px; overflow: hidden; cursor: col-resize; border: 1px solid var(--stone); touch-action: none; user-select: none; -webkit-user-select: none; }
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
  const containerRef = useRef(null);

  const updatePos = (clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x)));
  };

  return (
    <div
      ref={containerRef}
      className="ba-slider"
      onMouseMove={e => updatePos(e.clientX)}
      onTouchStart={e => updatePos(e.touches[0].clientX)}
      onTouchMove={e => updatePos(e.touches[0].clientX)}
    >
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
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [enquiry, setEnquiry] = useState({ name: "", phone: "", message: "" });
  const [enquiryStatus, setEnquiryStatus] = useState("idle");
  const [enquiryError, setEnquiryError] = useState("");
  const [legalModal, setLegalModal] = useState(null);

  useEffect(() => {
    if (tenantData) localStorage.setItem('active_tenant_branding', JSON.stringify(tenantData));
  }, [tenantData]);

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
  const ownerEmail   = tenantData?.businessEmail || tenantData?.email || "";
  const phone        = tenantData?.phone || "";

  const currentReview = reviews[currentReviewIndex];

  async function handleEnquirySubmit(e) {
    e.preventDefault();
    if (!ownerEmail) {
      setEnquiryError("No contact email configured for this business.");
      setEnquiryStatus("error");
      return;
    }
    setEnquiryStatus("sending");
    setEnquiryError("");
    try {
      const res = await fetch("/api/send-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail,
          businessName,
          brandColor,
          clientName: enquiry.name,
          clientPhone: enquiry.phone,
          projectDetails: enquiry.message,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || json.error || "Failed to send");
      setEnquiryStatus("success");
    } catch (err) {
      setEnquiryError(err.message || "Something went wrong. Please try again.");
      setEnquiryStatus("error");
    }
  }

  return (
    <>
      <GlobalStyles />
      <style>{`
        .dt-hero h1, .dt-section-title, .dt-stat-num, .dt-review-quote {
          font-family: ${displayFont} !important;
        }
      `}</style>

      <TenantNav tenant={tenantData} />

      <div className="dt-page">

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

          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {reviews.length > 0 && currentReview ? (
              <>
                <div className="dt-review-card">
                  <div style={{ display: 'flex', color: brandColor }}>
                    {[...Array(currentReview.rating || 5)].map((_, i) => <Star key={i} size={18} fill="currentColor" />)}
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

                {reviews.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.25rem', marginTop: '1.5rem' }}>
                    <button
                      onClick={prevReview}
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        border: '1.5px solid var(--stone)', background: 'var(--cream)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--ink-mid)', transition: 'border-color 0.2s',
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: '0.08em' }}>
                      {currentReviewIndex + 1} / {reviews.length}
                    </span>
                    <button
                      onClick={nextReview}
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        border: '1.5px solid var(--stone)', background: 'var(--cream)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--ink-mid)', transition: 'border-color 0.2s',
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </>
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
          </div>
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
            {enquiryStatus === "success" ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem 2rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, textAlign: 'center' }}>
                <CheckCircle2 size={48} style={{ color: brandColor }} />
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Request sent!</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>We'll be in touch within 24 hours to discuss your project.</p>
                <button
                  className="dt-form-btn"
                  style={{ backgroundColor: 'transparent', border: `1px solid ${brandColor}`, color: brandColor, marginTop: '0.5rem' }}
                  onClick={() => { setEnquiryStatus("idle"); setEnquiry({ name: "", phone: "", message: "" }); }}
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form className="dt-form" onSubmit={handleEnquirySubmit}>
                <input
                  className="dt-input"
                  placeholder="Full Name"
                  required
                  value={enquiry.name}
                  onChange={e => setEnquiry(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="dt-input"
                  placeholder="Phone Number"
                  type="tel"
                  required
                  value={enquiry.phone}
                  onChange={e => setEnquiry(prev => ({ ...prev, phone: e.target.value }))}
                />
                <textarea
                  className="dt-input dt-textarea"
                  placeholder="Tell me about your project…"
                  value={enquiry.message}
                  onChange={e => setEnquiry(prev => ({ ...prev, message: e.target.value }))}
                />
                {enquiryStatus === "error" && (
                  <p style={{ color: '#f87171', fontSize: '0.82rem', margin: '-0.25rem 0 0', lineHeight: 1.5 }}>{enquiryError}</p>
                )}
                <button
                  type="submit"
                  className="dt-form-btn"
                  style={{ backgroundColor: brandColor, opacity: enquiryStatus === "sending" ? 0.7 : 1, cursor: enquiryStatus === "sending" ? "not-allowed" : "pointer" }}
                  disabled={enquiryStatus === "sending"}
                >
                  {enquiryStatus === "sending" ? "Sending…" : "Send Request"}
                </button>
              </form>
            )}
          </div>
        </section>

      </div>{/* end dt-page */}

      {/* ── FOOTER ── */}
      <footer style={{ background: '#111', color: '#fff', padding: 'clamp(48px,6vw,80px) clamp(24px,5vw,80px) 32px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 40, marginBottom: 48 }}>

            {/* Brand column */}
            <div style={{ minWidth: 200 }}>
              {logo && <img src={logo} alt="Logo" style={{ height: 48, marginBottom: 16, display: 'block', borderRadius: 4 }} />}
              <div style={{ fontFamily: displayFont, fontSize: 22, letterSpacing: '0.08em', color: brandColor, marginBottom: 8 }}>{businessName}</div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 300, maxWidth: 220, lineHeight: 1.6, marginBottom: phone || ownerEmail ? 16 : 0 }}>
                Professional painting &amp; decorating services.
              </p>
              {phone && (
                <a href={`tel:${phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', marginBottom: 8, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <span style={{ fontSize: 14 }}>📞</span> {phone}
                </a>
              )}
              {ownerEmail && (
                <a href={`mailto:${ownerEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <span style={{ fontSize: 14 }}>✉</span> {ownerEmail}
                </a>
              )}
            </div>

            {/* Navigate column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Navigate</div>
              {[['about','About'],['services','Services'],['portfolio','Portfolio'],['reviews','Reviews'],['contact','Contact']].map(([id, label]) => (
                <a key={id} href={`#${id}`}
                  style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', fontWeight: 400, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >{label}</a>
              ))}
            </div>

            {/* Social column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Follow Us</div>
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E1306C'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#1877F2'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
              )}
              {tiktokUrl && (
                <a href={tiktokUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z"/></svg>
                  TikTok
                </a>
              )}
            </div>

            {/* Legal column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Legal</div>
              {[{ key: 'privacy', label: 'Privacy Policy' }, { key: 'terms', label: 'Terms & Conditions' }].map(({ key, label }) => (
                <button key={key} onClick={() => setLegalModal(key)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 400, textAlign: 'left', padding: 0, transition: 'color 0.2s', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >{label}</button>
              ))}
            </div>

          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: '0.08em', margin: 0 }}>© {new Date().getFullYear()} {businessName}. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <a href="/login"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, padding: '6px 14px', transition: 'color 0.2s, border-color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = brandColor; e.currentTarget.style.borderColor = brandColor; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              >Pro Login</a>
              <a href="#" style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textDecoration: 'none', letterSpacing: '0.08em', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = brandColor}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.18)'}
              >↑ Back to top</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Legal modal */}
      {legalModal && (
        <div onClick={() => setLegalModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', borderRadius: 8, padding: 36, maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222', boxShadow: '0 32px 80px rgba(0,0,0,0.8)', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontFamily: displayFont, fontSize: 24, margin: 0 }}>
                {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </h2>
              <button onClick={() => setLegalModal(null)} style={{ background: '#222', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: 14, fontWeight: 300, margin: 0 }}>
              {legalModal === 'privacy' ? privacyText : termsText}
            </p>
            <button onClick={() => setLegalModal(null)} style={{ marginTop: 24, padding: '10px 24px', background: brandColor, color: '#fff', border: 'none', borderRadius: 4, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.1em', fontFamily: "'DM Sans', sans-serif" }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default DecoratorTemplate;