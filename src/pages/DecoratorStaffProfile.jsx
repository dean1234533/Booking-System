import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFontFamily, loadGoogleFont } from '../utils/fontOptions';
import { Star, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import SlotPicker from '../components/SlotPicker';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { GlobalStyles } from './DecoratorTemplate';

// A single decorator's own page, linked from the shop's "Meet the Team"
// grid — same .dt-* dark/gold visual language as DecoratorTemplate,
// trimmed to one person. Booking runs against the shop's shared slot
// pool, same as DecoratorTemplate's own booking (no per-staff slots yet).
export default function DecoratorStaffProfile({ tenant }) {
  const { tenantId, staffId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [member, setMember] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revIdx, setRevIdx] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!tenantId || !staffId) return;
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [shopSnap, staffSnap, revSnap, slotsSnap] = await Promise.all([
          getDoc(doc(db, 'barbers', tenantId)),
          getDoc(doc(db, 'barbers', tenantId, 'staff', staffId)),
          getDocs(collection(db, 'barbers', tenantId, 'reviews')),
          getDocs(query(collection(db, 'slots'), where('barberId', '==', tenantId), where('isBooked', '==', false))),
        ]);
        if (shopSnap.exists()) setShop({ id: shopSnap.id, ...shopSnap.data() });
        if (staffSnap.exists()) setMember({ id: staffSnap.id, ...staffSnap.data() });
        setReviews(revSnap.docs.map(d => d.data()));
        setSlots(slotsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.date >= today));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, staffId]);

  const brandColor = shop?.brandColor || tenant?.brandColor || '#2563eb';
  const businessName = shop?.businessName || shop?.name || 'the team';
  const fontKey = shop?.siteFont;
  const displayFont = getFontFamily(fontKey, 'playfair');
  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);

  const services = member?.services?.length > 0 ? member.services : (shop?.services || []);
  const portfolioItems = member?.portfolioItems || [];
  const totalReviews = reviews.length;
  const currentReview = reviews[revIdx];
  const nextReview = () => setRevIdx(i => (i + 1) % totalReviews);
  const prevReview = () => setRevIdx(i => (i - 1 + totalReviews) % totalReviews);

  const handleSlotSelect = (slot) =>
    navigate(`/book/${tenantId}/${slot.id}?isStaff=false&shopId=${tenantId}`, { state: { tenant: shop } });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <CircularProgress sx={{ color: brandColor }} />
      </div>
    );
  }
  if (!member) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', fontFamily: "'DM Sans', sans-serif" }}>
        Profile not found.
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <style>{`
        .dtp-hero { display: grid; grid-template-columns: ${member.profilePic ? '260px 1fr' : '1fr'}; }
        @media (max-width: 640px) { .dtp-hero { grid-template-columns: 1fr !important; } }
      `}</style>
      <div className="dt-page" style={{ fontFamily: displayFont, overflowX: 'hidden' }}>

        <nav className="dt-nav">
          <a className="dt-nav-brand" href={`/decorator/${tenantId}`}>
            <span className="dt-nav-name">{businessName}</span>
          </a>
          <button className="dt-nav-cta" style={{ backgroundColor: brandColor }} onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
            Book Now
          </button>
        </nav>

        {/* ── HERO ── */}
        <section className="dtp-hero" style={{ padding: 'clamp(7rem,14vw,10rem) clamp(1.5rem,6vw,5rem) clamp(3rem,6vw,5rem)', background: 'var(--ink)', gap: 'clamp(2rem,5vw,4rem)', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
          {member.profilePic && (
            <img src={member.profilePic} alt={member.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 4, boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }} />
          )}
          <div>
            <span className="dt-section-label" style={{ color: 'var(--gold)' }}>{businessName}</span>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0.25rem', lineHeight: 1.05 }}>
              {member.name}
            </h1>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '1.25rem' }}>
              {member.role || member.specialty || 'Decorator'}
            </p>
            {member.bio && <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.85, fontWeight: 300, maxWidth: 480 }}>{member.bio}</p>}
          </div>
        </section>

        {/* ── SERVICES ── */}
        {services.length > 0 && (
          <section className="dt-services" style={{ display: 'block' }}>
            <div className="dt-services-header">
              <span className="dt-section-label">What I Do</span>
              <h2 className="dt-section-title">Services</h2>
              <div className="dt-underline" style={{ backgroundColor: brandColor }}></div>
            </div>
            <div className="dt-service-card">
              <ul style={{ listStyle: 'none' }}>
                {services.map((item, i) => (
                  <li key={i} className="dt-service-item">
                    <CheckCircle2 size={18} style={{ color: brandColor, flexShrink: 0 }} />
                    {item.name || item}
                    {item.price ? ` — ${typeof item.price === 'number' ? `£${item.price}` : item.price}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── PORTFOLIO ── */}
        {portfolioItems.length > 0 && (
          <section id="portfolio" className="dt-portfolio">
            <div className="dt-portfolio-header">
              <div>
                <span className="dt-section-label">My Work</span>
                <h2 className="dt-section-title">Recent projects</h2>
                <div className="dt-underline" style={{ backgroundColor: brandColor }}></div>
              </div>
            </div>
            <div className="dt-portfolio-grid">
              {portfolioItems.map((p, i) => (
                <div key={i} className="dt-portfolio-item">
                  <BeforeAfterSlider before={p.before} after={p.after} />
                  {p.label && <p className="dt-portfolio-label">{p.label}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── REVIEWS (shop-wide) ── */}
        <section id="reviews" className="dt-reviews">
          <div className="dt-reviews-header">
            <span className="dt-section-label">Testimonials</span>
            <h2 className="dt-section-title">What clients say</h2>
            <div className="dt-underline" style={{ backgroundColor: brandColor, margin: '1.25rem auto 0' }}></div>
          </div>
          {totalReviews > 0 && currentReview ? (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div className="dt-review-card">
                <div className="dt-review-quote" style={{ color: brandColor }}>"</div>
                <p className="dt-review-text">{currentReview.comment}</p>
                <div className="dt-review-divider" />
                <div className="dt-review-footer">
                  <div className="dt-review-avatar">{(currentReview.customerName || 'V')[0].toUpperCase()}</div>
                  <div>
                    <div className="dt-review-name">{currentReview.customerName || 'Verified Client'}</div>
                    <div className="dt-review-verified">Verified booking</div>
                  </div>
                </div>
              </div>
              {totalReviews > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                  <button onClick={prevReview} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} /></button>
                  <button onClick={nextReview} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontStyle: 'italic' }}>No reviews yet — be the first to share your experience.</p>
          )}
        </section>

        {/* ── BOOKING ── */}
        <section id="booking" className="dt-contact" style={{ display: 'block' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="dt-section-label">Availability</span>
            <h2 className="dt-section-title">Book with {member.name?.split(' ')[0]}</h2>
          </div>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <SlotPicker slots={slots} brandColor={brandColor} onSelect={handleSlotSelect} />
          </div>
        </section>

      </div>
    </>
  );
}
