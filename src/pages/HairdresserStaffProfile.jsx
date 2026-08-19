import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFontFamily, loadGoogleFont } from '../utils/fontOptions';
import SlotPicker from '../components/SlotPicker';
import TenantFooter from '../components/TenantFooter';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { formatCurrency } from '../stripe/formatters';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import { HairdresserStyles } from './HairdresserTemplate';

const TikTokIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

function SocialLink({ href, brandColor, children }) {
  if (!href) return null;
  const url = href.startsWith('http') ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1.5px solid rgba(26,23,20,0.15)', color: '#1a1714', transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,23,20,0.15)'; e.currentTarget.style.color = '#1a1714'; }}
    >
      {children}
    </a>
  );
}

// A single stylist's own page, linked from the salon's "Meet the Team"
// grid — same .hs-* visual language as HairdresserTemplate, trimmed to
// one person (bio, services, gallery, socials, booking). Booking still
// runs against the shop's shared slot pool since hairdresser has no
// per-staff slot concept yet — same as HairdresserTemplate's own booking.
export default function HairdresserStaffProfile({ tenant }) {
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
        const [shopSnap, staffSnap, revSnap, slotsSnap] = await Promise.all([
          getDoc(doc(db, 'barbers', tenantId)),
          getDoc(doc(db, 'barbers', tenantId, 'staff', staffId)),
          getDocs(collection(db, 'barbers', tenantId, 'reviews')),
          getDocs(query(collection(db, 'slots'), where('barberId', '==', tenantId), where('isBooked', '==', false))),
        ]);
        if (shopSnap.exists()) setShop({ id: shopSnap.id, ...shopSnap.data() });
        if (staffSnap.exists()) setMember({ id: staffSnap.id, ...staffSnap.data() });
        setReviews(revSnap.docs.map(d => d.data()));
        setSlots(slotsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, staffId]);

  const brandColor = shop?.brandColor || tenant?.brandColor || '#a07850';
  const fontKey = shop?.siteFont;
  const displayFont = getFontFamily(fontKey, 'playfair');
  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);

  const services = member?.services?.length > 0 ? member.services : (shop?.services || []);
  const portfolioItems = member?.portfolioItems || [];
  const totalReviews = reviews.length;
  const currentReview = reviews[revIdx];
  const prevRev = () => setRevIdx(i => (i - 1 + totalReviews) % totalReviews);
  const nextRev = () => setRevIdx(i => (i + 1) % totalReviews);

  const handleSlotSelect = (slot) =>
    navigate(`/book/${tenantId}/${slot.id}?isStaff=false&shopId=${tenantId}`, { state: { tenant: shop } });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdfcfa' }}>
        <CircularProgress sx={{ color: brandColor }} />
      </div>
    );
  }
  if (!member) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdfcfa', fontFamily: "'DM Sans', sans-serif" }}>
        Profile not found.
      </div>
    );
  }

  return (
    <>
      <HairdresserStyles />
      <style>{`
        .hsp-hero { display: grid; grid-template-columns: ${member.profilePic ? '260px 1fr' : '1fr'}; }
        @media (max-width: 640px) { .hsp-hero { grid-template-columns: 1fr !important; } }
      `}</style>
      <div className="hs-page" style={{ '--brand': brandColor, overflowX: 'hidden' }}>

        <nav className="hs-nav">
          <a href={`/hairdresser/${tenantId}`} className="hs-nav-brand">{shop?.businessName || 'Back to salon'}</a>
          <a href="#booking" className="hs-nav-cta" style={{ background: brandColor }}>Book Now</a>
        </nav>

        {/* ── HERO — single-person, photo + name/role/bio ── */}
        <section className="hsp-hero" style={{ padding: 'clamp(6rem,14vw,10rem) clamp(1.5rem,6vw,5rem) clamp(3rem,6vw,5rem)', maxWidth: 1000, margin: '0 auto', gap: 'clamp(2rem,5vw,4rem)', alignItems: 'center' }}>
          {member.profilePic && (
            <img src={member.profilePic} alt={member.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 12, boxShadow: '0 32px 80px rgba(26,23,20,0.14)' }} />
          )}
          <div>
            <span className="hs-section-label" style={{ color: brandColor }}>{shop?.businessName}</span>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem,5vw,3.4rem)', fontWeight: 700, color: '#1a1714', margin: '0.5rem 0 0.25rem', lineHeight: 1.05 }}>
              {member.name}
            </h1>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a8a29e', marginBottom: '1.25rem' }}>
              {member.role || member.specialty || 'Stylist'}
            </p>
            {member.bio && <p style={{ fontSize: '0.95rem', color: '#5c5449', lineHeight: 1.85, fontWeight: 300, maxWidth: 480, marginBottom: '1.25rem' }}>{member.bio}</p>}
            {(member.staffInstagram || member.staffFacebook || member.staffTiktok) && (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <SocialLink href={member.staffInstagram} brandColor={brandColor}><InstagramIcon sx={{ fontSize: 18 }} /></SocialLink>
                <SocialLink href={member.staffFacebook} brandColor={brandColor}><FacebookIcon sx={{ fontSize: 18 }} /></SocialLink>
                <SocialLink href={member.staffTiktok} brandColor={brandColor}><TikTokIcon size={16} /></SocialLink>
              </div>
            )}
          </div>
        </section>

        {/* ── SERVICES ── */}
        {services.length > 0 && (
          <section id="services" className="hs-services" style={{ display: 'block' }}>
            <span className="hs-section-label" style={{ color: brandColor }}>What I Offer</span>
            <h2 className="hs-section-title">Services</h2>
            {services.map((svc, i) => (
              <div key={i} className="hs-service-row">
                <span className="hs-service-name">{svc.name}</span>
                <span className="hs-service-meta">
                  {svc.duration && <span className="hs-service-duration">{svc.duration}</span>}
                  <span className="hs-service-price" style={{ color: brandColor }}>{formatCurrency(svc.price)}</span>
                </span>
              </div>
            ))}
          </section>
        )}

        {/* ── PORTFOLIO ── */}
        {portfolioItems.length > 0 && (
          <section id="portfolio" className="hs-portfolio">
            <div className="hs-portfolio-header">
              <span className="hs-section-label" style={{ color: brandColor }}>My Work</span>
              <h2 className="hs-section-title" style={{ textAlign: 'center' }}>Recent transformations</h2>
            </div>
            <div className="hs-portfolio-grid">
              {portfolioItems.map((item, i) => (
                <div key={i} className="hs-portfolio-item">
                  <BeforeAfterSlider before={item.before} after={item.after} />
                  {item.label && <p className="hs-portfolio-label">{item.label}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── REVIEWS (shop-wide) ── */}
        <section id="reviews" className="hs-reviews">
          <div className="hs-reviews-deco">"</div>
          <div className="hs-reviews-inner">
            <span className="hs-reviews-label" style={{ color: brandColor }}>Testimonials</span>
            <h2 className="hs-reviews-title">What clients say</h2>
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
                    <button className="hs-review-btn" onClick={prevRev}><ChevronLeft size={18} /></button>
                    <div className="hs-review-dots">
                      {reviews.map((_, i) => (
                        <button key={i} className={`hs-review-dot${i === revIdx ? ' active' : ''}`}
                          style={{ width: i === revIdx ? 22 : 6 }} onClick={() => setRevIdx(i)} />
                      ))}
                    </div>
                    <button className="hs-review-btn" onClick={nextRev}><ChevronRight size={18} /></button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontSize: '1rem' }}>
                No reviews yet — be the first to share your experience.
              </p>
            )}
          </div>
        </section>

        {/* ── BOOKING ── */}
        <section id="booking" className="hs-booking">
          <div className="hs-booking-inner">
            <div className="hs-booking-header">
              <span className="hs-section-label" style={{ color: brandColor }}>Availability</span>
              <h2 className="hs-section-title">Book with {member.name?.split(' ')[0]}</h2>
            </div>
            <SlotPicker slots={slots} brandColor={brandColor} onSelect={handleSlotSelect} />
          </div>
        </section>

      </div>

      <TenantFooter tenant={shop} businessType="hairdresser" />
    </>
  );
}
