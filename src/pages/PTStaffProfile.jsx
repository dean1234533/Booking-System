import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getFontFamily, loadGoogleFont } from '../utils/fontOptions';
import SlotPicker from '../components/SlotPicker';
import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { CircularProgress, useMediaQuery } from '@mui/material';
import { FadeIn, ReviewCarousel } from './PTBookingSite';

// A single trainer's own page, linked from the gym/studio's team section
// — same inline-style, dark-charcoal visual language as PTBookingSite,
// trimmed to one person. Booking runs against the shop's shared slot
// pool. Video is intentionally omitted here — that stays a shop/owner
// level feature, not duplicated per staff member.
export default function PTStaffProfile({ tenant }) {
  const { tenantId, staffId } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [shop, setShop] = useState(null);
  const [member, setMember] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const brandColor = shop?.brandColor || tenant?.brandColor || '#dc2626';
  const businessName = shop?.businessName || shop?.name || 'the team';
  const fontKey = shop?.siteFont;
  const displayFont = getFontFamily(fontKey, 'bebas');
  useEffect(() => { if (fontKey) loadGoogleFont(fontKey); }, [fontKey]);

  const services = member?.services?.length > 0 ? member.services : (shop?.services || []);
  const portfolioItems = member?.portfolioItems || [];

  const handleSlotSelect = (slot) =>
    navigate(`/book/${tenantId}/${slot.id}?isStaff=false&shopId=${tenantId}`, { state: { tenant: shop } });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf8f5' }}>
        <CircularProgress sx={{ color: brandColor }} />
      </div>
    );
  }
  if (!member) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf8f5', fontFamily: "'DM Sans', sans-serif" }}>
        Profile not found.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--ink)', background: '#fff', overflowX: 'hidden' }}>
      <style>{`
        .ptsp-hero { display: grid; grid-template-columns: ${member.profilePic ? '260px 1fr' : '1fr'}; }
        @media (max-width: 640px) { .ptsp-hero { grid-template-columns: 1fr !important; } }
      `}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--mid)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <a href={`/pt-booking/${tenantId}`} style={{ fontFamily: displayFont, fontSize: 22, letterSpacing: '0.1em', color: 'var(--ink)', textDecoration: 'none' }}>{businessName}</a>
          <a href="#booking-section" style={{ padding: '9px 22px', background: brandColor, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>Book Now</a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="ptsp-hero" style={{ position: 'relative', padding: 'clamp(60px,10vw,100px) clamp(24px,5vw,80px)', background: 'var(--charcoal)', gap: 'clamp(2rem,5vw,4rem)', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        {member.profilePic && (
          <img src={member.profilePic} alt={member.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }} />
        )}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, marginBottom: 8 }}>{businessName}</p>
          <h1 style={{ fontFamily: displayFont, fontSize: 'clamp(40px,7vw,64px)', color: '#fff', letterSpacing: '0.02em', margin: '0 0 8px', lineHeight: 1 }}>{member.name}</h1>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>{member.role || member.specialty || 'Trainer'}</p>
          {member.bio && <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.8, fontWeight: 300, maxWidth: 480 }}>{member.bio}</p>}
        </div>
      </section>

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <FadeIn>
          <section style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: '#fff' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>What I Offer</p>
              <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 40 }}>Services</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {services.map((svc, i) => (
                  <div key={i} style={{ background: 'var(--cream)', borderRadius: 12, padding: 24, borderLeft: `4px solid ${brandColor}` }}>
                    <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{svc.name}</h3>
                    <p style={{ color: brandColor, fontWeight: 800, fontSize: 15, margin: 0 }}>
                      {typeof svc.price === 'number' ? `£${svc.price}` : svc.price}{svc.duration ? ` · ${svc.duration}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── GALLERY ── */}
      {portfolioItems.length > 0 && (
        <FadeIn>
          <section style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: 'var(--charcoal)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>Results</p>
              <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(28px,5vw,48px)', color: '#fff', textAlign: 'center', marginBottom: 40, letterSpacing: '0.04em' }}>Client Transformations</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 24 }}>
                {portfolioItems.map((item, i) => (
                  <div key={i}>
                    <BeforeAfterSlider before={item.before} after={item.after} />
                    {item.label && <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 10 }}>{item.label}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── REVIEWS (shop-wide) ── */}
      <FadeIn>
        <section style={{ background: 'var(--charcoal)', padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>Testimonials</p>
            <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(36px,6vw,56px)', color: '#fff', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 48 }}>Client Experiences</h2>
            <ReviewCarousel reviews={reviews} brandColor={brandColor} displayFont={displayFont} cardBg="#ffffff" cardBorder="2px solid #0f0f0f" />
          </div>
        </section>
      </FadeIn>

      {/* ── BOOKING ── */}
      <FadeIn>
        <section id="booking-section" style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: '#fff' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>Availability</p>
            <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 40 }}>Book with {member.name?.split(' ')[0]}</h2>
            <SlotPicker slots={slots} brandColor={brandColor} onSelect={handleSlotSelect} />
          </div>
        </section>
      </FadeIn>

    </div>
  );
}
