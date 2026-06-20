import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { getFontFamily, loadGoogleFont } from "../utils/fontOptions";
import SlotPicker from "../components/SlotPicker";
import { Box, Container, Typography, Paper, Stack, Avatar, Divider, Button, useMediaQuery } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import RateReviewIcon from '@mui/icons-material/RateReview';

/* ─── Google Fonts ─────────────────────────────────────────── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&family=Playfair+Display:ital@1&display=swap';
document.head.appendChild(fontLink);

/* ─── CSS Variables injected once ──────────────────────────── */
const styleTag = document.createElement('style');
styleTag.textContent = `
  :root {
    --brand: #1a1a1a;
    --brand-dark: #1a1a1a;
    --brand-glow: rgba(220,38,38,0.18);
    --ink: #0f0f0f;
    --ink-soft: #3d3d3d;
    --cream: #faf8f5;
    --warm-white: #fff9f5;
    --mid: #e8e3dc;
    --charcoal: #1a1a1a;
    --charcoal-2: #222220;
  }
  html { scroll-behavior: smooth; }
  body { overflow-x: hidden; }

  .slash-divider { position: relative; z-index: 1; }
  .slash-divider::after {
    content: ''; position: absolute; bottom: -3vw; left: 0; right: 0;
    height: 6vw; background: inherit;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 0); z-index: 2;
  }

  .noise::before {
    content: ''; position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.8s cubic-bezier(.22,.68,0,1.2) both; }

  @keyframes popIn {
    0%   { transform: scale(0.7); opacity: 0; }
    70%  { transform: scale(1.08); }
    100% { transform: scale(1); opacity: 1; }
  }
  .pop-in { animation: popIn 0.6s cubic-bezier(.22,.68,0,1.2) both; }

  @keyframes slideIn  { from { opacity:0; transform:translateX(40px);  } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOut { from { opacity:1; transform:translateX(0);  }    to { opacity:0; transform:translateX(-40px); } }
  .slide-in  { animation: slideIn  0.45s cubic-bezier(.22,.68,0,1.1) both; }
  .slide-out { animation: slideOut 0.35s cubic-bezier(.4,0,1,1) both; }

  .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,0,0,0.12); }

  .ruled-heading { position: relative; display: inline-block; }
  .ruled-heading::after {
    content: ''; position: absolute; bottom: -6px; left: 0;
    width: 56px; height: 3px; background: var(--brand);
  }

  .stat-num { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--cream); }
  ::-webkit-scrollbar-thumb { background: var(--brand); border-radius: 3px; }

  #booking-section ::-webkit-scrollbar { height: 4px; width: 4px; }
  #booking-section ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
  #booking-section ::-webkit-scrollbar-thumb { background: var(--brand); border-radius: 4px; }
`;
document.head.appendChild(styleTag);

/* ─── FadeIn on scroll ──────────────────────────────────────── */
const FadeIn = ({ children, delay = 0 }) => {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => ref.current && obs.unobserve(ref.current);
  }, []);
  return (
    <div ref={ref} style={{ animationDelay: `${delay}ms` }}
      className={vis ? 'fade-up' : 'opacity-0'}>
      {children}
    </div>
  );
};

/* ─── YouTube helper ────────────────────────────────────────── */
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (u.hostname.includes('youtube.com'))
      id = u.searchParams.get('v') || u.pathname.split('/embed/')[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch { return null; }
}

/* ─── Review Carousel ───────────────────────────────────────── */
function ReviewCarousel({ reviews, brandColor, cardBg = '#ffffff', cardBorder = '2px solid #0f0f0f',displayFont }) {
  const [idx, setIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const go = (dir) => {
    setIdx(i => (i + dir + reviews.length) % reviews.length);
    setAnimKey(k => k + 1);
  };

  if (!reviews.length) return (
    <p style={{ color: '#71717a', textAlign: 'center', fontWeight: 300 }}>
      No testimonials yet — be the first!
    </p>
  );

  const rev = reviews[idx];
  const name = rev.customerName || rev.name || 'Client';
  const stars = Number(rev.rating) || 5;
  const text  = rev.comment || rev.text || 'Great experience!';

  return (
    <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 'clamp(80px, 14vw, 160px)',
        lineHeight: 0.8, color: '#b8962e', opacity: 0.22,
        position: 'absolute', top: -16, left: 0,
        userSelect: 'none', pointerEvents: 'none',
      }}>"</div>

      <div key={animKey} className="slide-in" style={{
        background: cardBg, border: cardBorder, borderRadius: 20,
        padding: 'clamp(28px, 5vw, 52px)', paddingTop: 'clamp(36px, 6vw, 64px)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 4,
          background: `linear-gradient(90deg, #b8962e, #e0c060, #b8962e)`,
        }} />
        <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
          {[...Array(stars)].map((_, i) => (
            <StarIcon key={i} sx={{ fontSize: 20, color: '#b8962e' }} />
          ))}
        </div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', fontWeight: 400,
          fontSize: 'clamp(15px, 2.2vw, 19px)', lineHeight: 1.75,
          color: '#1a1a1a', marginBottom: 28, minHeight: 80,
        }}>"{text}"</p>
        <div style={{ height: 1, background: '#e4e4e7', marginBottom: 24 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: `linear-gradient(135deg, #b8962e, #e0c060)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: displayFont, fontSize: 22, color: '#fff', flexShrink: 0,
          }}>{name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: '#0f0f0f', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 13 }}>{name}</div>
            <div style={{ fontSize: 11, color: '#b8962e', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Verified Client</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#a1a1aa', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
            {idx + 1} / {reviews.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        {[{ label: '←', dir: -1 }, { label: '→', dir: 1 }].map(({ label, dir }) => (
          <button key={dir} onClick={() => go(dir)} style={{
            width: 48, height: 48, border: `1px solid rgba(255,255,255,0.25)`,
            borderRadius: '50%', background: 'transparent', color: '#fff',
            fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#b8962e'; e.currentTarget.style.borderColor = '#b8962e'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          >{label}</button>
        ))}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          {reviews.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); setAnimKey(k => k + 1); }} style={{
              width: i === idx ? 20 : 7, height: 7, borderRadius: 4,
              background: i === idx ? '#b8962e' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Pricing Card ──────────────────────────────────────────── */
function PricingCard({ plan, brandColor,displayFont }) {
  const gold = '#b8962e';
  return (
    <div className="card-hover" style={{
      borderRadius: 16, overflow: 'hidden', background: 'var(--cream)',
      border: '1px solid var(--mid)', position: 'relative',
    }}>
      {plan.highlight && (
        <div style={{
          position: 'absolute', top: 16, right: 16, background: gold, color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase',
          fontFamily: "'DM Sans', sans-serif",
        }}>★ Most Popular</div>
      )}
      <div style={{ padding: 'clamp(24px, 4vw, 40px)' }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8 }}>{plan.name}</div>
        <div style={{ fontFamily: displayFont, fontSize: 'clamp(44px, 6vw, 60px)', lineHeight: 1, color: 'var(--ink)', letterSpacing: '0.02em', marginBottom: 4 }}>{plan.price}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 24, fontFamily: "'DM Sans', sans-serif" }}>/ {plan.period}</div>
        <div style={{ height: 1, background: 'var(--mid)', marginBottom: 24 }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plan.features.map((f, j) => (
            <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: 'var(--ink-soft)' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
        <a href="#booking-section" style={{
          display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 8,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 12,
          letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
          background: 'var(--ink)', color: '#fff', transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >Book Now</a>
      </div>
    </div>
  );
}

/* ─── Consultation Form Modal ────────────────────────────────── */
const GOAL_OPTIONS = [
  'Weight / fat reduction',
  'Build muscle',
  'Increase strength',
  'Muscle toning',
  'Increase fitness / stamina',
  'Other',
];

function ConsultationModal({ slot, brandColor, displayFont, ownerEmail, businessName, onClose }) {
  const isSmall = useMediaQuery('(max-width: 480px)');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', age: '', address: '',
    goalText: '', goalTypes: [],
    diet: '', availability: '', holdingBack: '', startDate: '',
  });
  const [status, setStatus]   = useState('idle'); // idle | sending | success | error
  const [errMsg, setErrMsg]   = useState('');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleGoal = (g) => setForm(prev => {
    const already = prev.goalTypes.includes(g);
    return { ...prev, goalTypes: already ? prev.goalTypes.filter(x => x !== g) : [...prev.goalTypes, g] };
  });

  const slotDisplay = slot ? (() => {
    try {
      const d = new Date(slot.date);
      return `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${slot.time}`;
    } catch { return `${slot.date} at ${slot.time}`; }
  })() : '';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      setErrMsg('Please fill in your name, phone, and email.');
      return;
    }
    setStatus('sending');
    setErrMsg('');
    try {
      const res = await fetch('/api/send-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail,
          businessName,
          brandColor,
          clientName:    form.name,
          clientPhone:   form.phone,
          clientEmail:   form.email,
          clientAge:     form.age,
          clientAddress: form.address,
          slotDate:      slot?.date,
          slotTime:      slot?.time,
          goalText:      form.goalText,
          goalTypes:     form.goalTypes,
          diet:          form.diet,
          availability:  form.availability,
          holdingBack:   form.holdingBack,
          startDate:     form.startDate,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || json.error || 'Failed to send');
      setStatus('success');
    } catch (err) {
      setErrMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.16em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6,
  };
  const fieldWrap = { marginBottom: 20 };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111', borderRadius: 16, padding: 'clamp(24px,4vw,40px)', maxWidth: 560, width: '100%', border: '1px solid #222', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', marginTop: 'auto', marginBottom: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: brandColor }}>Consultation Request</p>
            <h2 style={{ margin: 0, fontFamily: displayFont, fontSize: 'clamp(24px,4vw,32px)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1.1 }}>Book Your Consultation</h2>
          </div>
          <button onClick={onClose} style={{ background: '#222', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>

        {/* Slot badge */}
        <div style={{ background: `${brandColor}20`, border: `1px solid ${brandColor}55`, borderLeft: `4px solid ${brandColor}`, borderRadius: 8, padding: '12px 16px', marginBottom: 28 }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Selected Slot</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>{slotDisplay}</p>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontFamily: displayFont, fontSize: 28, color: '#fff', letterSpacing: '0.06em', marginBottom: 8 }}>Request Sent!</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Your consultation request for <strong style={{ color: '#fff' }}>{slotDisplay}</strong> has been submitted. We'll be in touch shortly to confirm.
            </p>
            <button onClick={onClose} style={{ background: brandColor, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* ─── Personal details ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} placeholder="John Smith" value={form.name} onChange={e => set('name', e.target.value)} required
                  onFocus={e => e.target.style.borderColor = brandColor} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Age *</label>
                <input style={inputStyle} placeholder="28" value={form.age} onChange={e => set('age', e.target.value)} required
                  onFocus={e => e.target.style.borderColor = brandColor} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} placeholder="123 Example Street, London" value={form.address} onChange={e => set('address', e.target.value)}
                onFocus={e => e.target.style.borderColor = brandColor} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1fr 1fr', gap: '0 16px' }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Phone Number *</label>
                <input style={inputStyle} type="tel" placeholder="07700 900000" value={form.phone} onChange={e => set('phone', e.target.value)} required
                  onFocus={e => e.target.style.borderColor = brandColor} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>Email Address *</label>
                <input style={inputStyle} type="email" placeholder="john@email.com" value={form.email} onChange={e => set('email', e.target.value)} required
                  onFocus={e => e.target.style.borderColor = brandColor} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0 24px' }} />

            {/* ─── Goals ─── */}
            <div style={fieldWrap}>
              <label style={labelStyle}>What's the biggest goal you're trying to achieve right now?</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="Describe your main goal…"
                value={form.goalText}
                onChange={e => set('goalText', e.target.value)}
                onFocus={e => e.target.style.borderColor = brandColor}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            <div style={{ ...fieldWrap, marginBottom: 24 }}>
              <label style={labelStyle}>Goal type (select all that apply)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_OPTIONS.map(g => {
                  const checked = form.goalTypes.includes(g);
                  return (
                    <button
                      key={g} type="button" onClick={() => toggleGoal(g)}
                      style={{
                        padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                        letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.2s',
                        background: checked ? brandColor : 'rgba(255,255,255,0.07)',
                        color: checked ? '#fff' : 'rgba(255,255,255,0.6)',
                        border: `1.5px solid ${checked ? brandColor : 'rgba(255,255,255,0.15)'}`,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >{g}</button>
                  );
                })}
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>How is your diet / nutrition currently?</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="e.g. I eat fairly well but snack a lot in the evenings…"
                value={form.diet}
                onChange={e => set('diet', e.target.value)}
                onFocus={e => e.target.style.borderColor = brandColor}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>What days and times are you available to train?</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="e.g. Weekday mornings before 9am, or Saturday afternoons…"
                value={form.availability}
                onChange={e => set('availability', e.target.value)}
                onFocus={e => e.target.style.borderColor = brandColor}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>What's the biggest thing holding you back from achieving your goals?</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="e.g. Lack of motivation, not sure where to start…"
                value={form.holdingBack}
                onChange={e => set('holdingBack', e.target.value)}
                onFocus={e => e.target.style.borderColor = brandColor}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>When are you able to start training from?</label>
              <input
                style={inputStyle}
                placeholder="e.g. Immediately / 1st of next month"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                onFocus={e => e.target.style.borderColor = brandColor}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              />
            </div>

            {errMsg && (
              <p style={{ color: '#f87171', fontSize: 13, margin: '-8px 0 16px', lineHeight: 1.5 }}>{errMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%', padding: '15px 0', background: brandColor, color: '#fff',
                border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
                fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                opacity: status === 'sending' ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Submit Consultation Request'}
            </button>

            <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
              Your details will be sent to {businessName}. We'll confirm your {slotDisplay} slot by phone or email.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function PTBookingSite({ profile, barber, reviews: propReviews = [] }) {
  const [slots,    setSlots]    = useState([]);
  const [reviews,  setReviews]  = useState(propReviews);
  const [modal,    setModal]    = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [consultationSlot, setConsultationSlot] = useState(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isSmall  = useMediaQuery('(max-width: 480px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  const fontKey     = barber?.siteFont || profile?.siteFont || "bebas";
  const displayFont = getFontFamily(fontKey, "bebas");

  useEffect(() => { loadGoogleFont(fontKey); }, [fontKey]);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    async function fetchData() {
      if (!barber?.uid) return;
      try {
        const qSlots = query(
          collection(db, 'slots'),
          where('barberId', '==', barber.uid),
          where('isBooked', '==', false)
        );
        const ssSlots = await getDocs(qSlots);
        setSlots(ssSlots.docs.map(d => ({ id: d.id, ...d.data() })));

        const revRef = collection(db, 'barbers', barber.uid, 'reviews');
        const ssRevs = await getDocs(revRef);
        setReviews(ssRevs.docs.map(d => d.data()));
      } catch (err) { console.error(err); }
    }
    fetchData();
  }, [barber?.uid]);

  /* ── Resolved values ── */
  const businessName = barber?.shopName    || 'DB FITNESS';
  const brandColor   = profile?.brandColor || '#dc2626';
  const logo         = profile?.logoUrl    || null;
  const heroTitle    = profile?.heroTitle  || 'Stronger.\nLeaner.\nUnstoppable.';
  const heroSubtitle = profile?.heroSubtitle || 'Tailored high-performance outdoor functional resistance training.';
  const aboutText1   = profile?.aboutText1 || 'With years of experience in high-performance athletics and functional training, I specialise in helping individuals push past their perceived limits.';
  const aboutText2   = profile?.aboutText2 || 'Whether you\'re building explosive strength, improving mobility, or transforming your physique — I provide the tools and accountability to get you there.';
  const privacyText  = profile?.privacyPolicy   || `At ${businessName}, we value your privacy. We collect only information necessary to provide our services and never sell your data.`;
  const termsText    = profile?.termsConditions || `By using ${businessName}, you agree to our terms of service. All bookings are subject to our cancellation policy.`;
  const youtubeUrl   = getYouTubeEmbedUrl(profile?.youtubeUrl);
  const contactPhone  = profile?.phone || '';
  const contactEmail  = profile?.businessEmail || profile?.contactEmail || barber?.email || '';
  const instagramUrl  = profile?.instagramUrl || '';
  const facebookUrl   = profile?.facebookUrl  || '';
  const tiktokUrl     = profile?.tiktokUrl    || '';

  /* ── Stats bar — editable from Dashboard > Website tab ── */
  const statBar = [
    { num: profile?.statBar1Num || '100+', label: profile?.statBar1Label || 'Happy Clients' },
    { num: profile?.statBar2Num || '5.0★', label: profile?.statBar2Label || 'Average Rating' },
    { num: profile?.statBar3Num || 'Pro',  label: profile?.statBar3Label || 'Certified Trainer' },
  ];

  const specializations = (profile?.specializations?.length > 0 ? profile.specializations : null) || [
    { title: 'Strength & Conditioning', description: 'Build raw power and muscular endurance through proven compound lifting and progressive overload.' },
    { title: 'Fat Loss & Transformation', description: 'Science-backed nutrition guidance paired with high-intensity training protocols for real results.' },
    { title: 'Functional Fitness', description: 'Outdoor resistance training focused on real-world movement patterns that carry over to daily life.' },
    { title: '1-to-1 Coaching', description: 'Fully personalised sessions tailored to your goals, schedule, and current level of fitness.' },
  ];

  const pricingPlans = (profile?.pricingPlans?.length > 0 ? profile.pricingPlans : null) || [
    { name: 'Taster',   price: '£40',  period: 'one-off',   features: ['60-min session', 'Fitness assessment'], highlight: false },
    { name: 'Monthly',  price: '£280', period: 'per month', features: ['8 sessions/month', 'Nutrition guidance', 'Progress tracking'], highlight: true },
    { name: '10-Block', price: '£350', period: 'block',     features: ['10 × 60-min sessions', 'Flexible scheduling', 'Priority booking'], highlight: false },
  ];

  const navLinks = [
    { label: 'About',    href: '#about' },
    { label: 'Services', href: '#specializations' },
    { label: 'Pricing',  href: '#pricing' },
    { label: 'Reviews',  href: '#reviews' },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--ink)', background: '#fff', overflowX: 'hidden' }}>
      <style>{`.stat-num { font-family: ${displayFont}; }`}</style>

      {/* ══════════ NAV ══════════ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--mid)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <a href="#" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo
              ? <img src={logo} alt="logo" style={{ height: 36 }} />
              : (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontFamily: displayFont, fontSize: 26, letterSpacing: '0.12em', color: 'var(--ink)' }}>{businessName.split(' ')[0]}</span>
                  {businessName.split(' ').length > 1 && (
                    <span style={{ fontFamily: displayFont, fontSize: 26, letterSpacing: '0.12em', color: brandColor }}>{' ' + businessName.split(' ').slice(1).join(' ')}</span>
                  )}
                </div>
              )
            }
          </a>

          <nav style={{ display: isMobile ? 'none' : 'flex', gap: 6, alignItems: 'center' }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', color: 'var(--ink-soft)', borderRadius: 6, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = brandColor}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
              >{l.label}</a>
            ))}
            <a href="#booking-section" style={{ marginLeft: 8, padding: '9px 22px', background: brandColor, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Book Now</a>
          </nav>

          <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: isMobile ? 'flex' : 'none', flexDirection: 'column', gap: 5, padding: 8 }}>
            {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 24, height: 2, background: 'var(--ink)', borderRadius: 2 }} />)}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid var(--mid)', padding: '16px 24px 20px' }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', color: 'var(--ink)', borderBottom: '1px solid var(--mid)' }}>{l.label}</a>
            ))}
            <a href="#booking-section" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: 14, padding: '12px 0', textAlign: 'center', background: brandColor, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>Book Now</a>
          </div>
        )}
      </header>

      {/* ══════════ HERO ══════════ */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', alignItems: 'center', background: 'var(--charcoal)', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: profile?.heroBgImage
            ? `url('${profile.heroBgImage}')`
            : "url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1920')",
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25,
        }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(105deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 60%, ${brandColor}22 100%)` }} />
        <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 4, background: brandColor, borderRadius: '0 4px 4px 0' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', width: '100%' }}>
          <div className="fade-up" style={{ animationDelay: '100ms' }}>
            <span style={{ display: 'inline-block', background: brandColor, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 4, marginBottom: 24 }}>Personal Training</span>
          </div>
          <h1 className="fade-up" style={{ animationDelay: '200ms', fontFamily: displayFont, fontSize: 'clamp(40px, 12vw, 110px)', lineHeight: 0.95, letterSpacing: '0.02em', color: '#fff', margin: '0 0 28px', whiteSpace: 'pre-line' }}>{heroTitle}</h1>
          <p className="fade-up" style={{ animationDelay: '340ms', fontSize: 'clamp(15px, 3.5vw, 18px)', color: 'rgba(255,255,255,0.65)', maxWidth: 440, lineHeight: 1.7, marginBottom: 40, fontWeight: 300 }}>{heroSubtitle}</p>
          <div className="fade-up" style={{ animationDelay: '460ms', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#booking-section" style={{ padding: '14px 36px', background: brandColor, color: '#fff', borderRadius: 8, fontWeight: 800, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', transition: 'opacity 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
            >Start Today</a>
            <a href="#about" style={{ padding: '14px 36px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = brandColor}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
            >Learn More</a>
          </div>
        </div>

        <div className="fade-up" style={{ animationDelay: '700ms', position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)' }}>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>Scroll</span>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <FadeIn>
        <section style={{ background: brandColor, padding: 'clamp(20px,4vw,36px) clamp(16px,4vw,24px)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: isSmall ? '1fr' : 'repeat(3, 1fr)', gap: isSmall ? 0 : 16, textAlign: 'center' }}>
            {statBar.map((s, i) => (
              <div key={i} style={{
                padding: isSmall ? '0.6rem 0' : '4px 0',
                borderBottom: isSmall && i < statBar.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
              }}>
                <div className="stat-num" style={{ fontSize: isSmall ? 'clamp(26px,7vw,36px)' : 'clamp(28px, 5vw, 44px)', color: '#fff', letterSpacing: '0.04em' }}>{s.num}</div>
                <div style={{ fontSize: isSmall ? 10 : 11, color: 'rgba(255,255,255,0.72)', fontWeight: 700, letterSpacing: isSmall ? '0.06em' : '0.14em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* ══════════ ABOUT ══════════ */}
      <FadeIn>
        <section id="about" style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: 'var(--cream)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px,5vw,72px)', alignItems: 'center' }}>
            <div style={{ flex: isMobile ? '0 0 100%' : '0 0 clamp(260px, 38%, 440px)' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={profile?.heroImage || 'https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=800'}
                  alt="Trainer"
                  style={{ width: '100%', borderRadius: 16, objectFit: 'cover', aspectRatio: '4/5', display: 'block', boxShadow: '0 24px 72px rgba(0,0,0,0.12)' }}
                />
                <div style={{ position: 'absolute', bottom: isMobile ? 12 : -18, right: isMobile ? 12 : -18, background: brandColor, color: '#fff', width: 90, height: 90, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 28px ${brandColor}55` }}>
                  <span style={{ fontFamily: displayFont, fontSize: 28, lineHeight: 1 }}>PRO</span>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>Certified</span>
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 320px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, marginBottom: 12 }}>Meet Your Coach</p>
              <h2 className="ruled-heading" style={{ fontFamily: displayFont, fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '0.04em', margin: '0 0 28px', lineHeight: 1 }}>
                {profile?.coachName || barber?.name || 'Your Personal Trainer'}
              </h2>
              <p style={{ color: 'var(--ink-soft)', lineHeight: 1.8, marginBottom: 16, fontSize: 15, fontWeight: 300 }}>{aboutText1}</p>
              <p style={{ color: 'var(--ink-soft)', lineHeight: 1.8, marginBottom: 32, fontSize: 15, fontWeight: 300 }}>{aboutText2}</p>
              <a href="#booking-section" style={{ display: 'inline-block', padding: '12px 30px', background: 'var(--ink)', color: '#fff', borderRadius: 8, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = brandColor}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ink)'}
              >Book a Session</a>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ══════════ VIDEO ══════════ */}
      {youtubeUrl && (
        <FadeIn>
          <section id="video" style={{ background: 'var(--charcoal-2)', padding: 'clamp(60px,8vw,100px) clamp(24px,5vw,80px)' }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>See It In Action</p>
              <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(36px,6vw,56px)', color: '#fff', textAlign: 'center', marginBottom: 32, letterSpacing: '0.04em' }}>Watch My Training</h2>
              <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
                <iframe src={youtubeUrl} title="Training video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <a href="#booking-section" style={{ display: 'inline-block', padding: '12px 32px', background: brandColor, color: '#fff', borderRadius: 8, fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Book Your Session</a>
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* ══════════ SERVICES ══════════ */}
      <FadeIn>
        <section id="specializations" style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>What I Do</p>
            <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(36px,6vw,56px)', letterSpacing: '0.04em', textAlign: 'center', marginBottom: isMobile ? 32 : 56 }}>Areas of Expertise</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {specializations.map((spec, i) => (
                <div key={i} className="card-hover" style={{ background: 'var(--cream)', borderRadius: 12, padding: isMobile ? 20 : 32, borderLeft: `4px solid ${brandColor}`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -8, right: 12, fontFamily: displayFont, fontSize: 72, color: brandColor, opacity: 0.07, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>0{i + 1}</div>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 16, color: '#fff', fontWeight: 900 }}>
                    {['💪', '🔥', '⚡', '🎯'][i % 4]}
                  </div>
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 10, lineHeight: 1.2 }}>{spec.title}</h3>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.7, fontWeight: 300, margin: 0 }}>{spec.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ══════════ PRICING ══════════ */}
      <FadeIn>
        <section id="pricing" style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: 'var(--cream)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>Investment</p>
            <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(36px,6vw,56px)', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 16 }}>Simple, Transparent Pricing</h2>
            <p style={{ color: 'var(--ink-soft)', textAlign: 'center', fontWeight: 300, maxWidth: 460, margin: '0 auto 52px' }}>No contracts. No hidden fees. Just results.</p>
            {/* On tablet (iPad) the cards stack in a single, wider column; desktop keeps the multi-column grid. */}
            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, maxWidth: isTablet ? 560 : '100%', margin: isTablet ? '0 auto' : undefined }}>
              {pricingPlans.map((plan, i) => (
                <PricingCard key={i} plan={plan} brandColor={brandColor} displayFont={displayFont}/>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ══════════ REVIEWS ══════════ */}
      <FadeIn>
        <section id="reviews" style={{ background: 'var(--charcoal)', padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '30%', height: '100%', background: `linear-gradient(180deg, ${brandColor}11 0%, transparent 100%)`, pointerEvents: 'none' }} />
          <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, textAlign: 'center', marginBottom: 8 }}>Testimonials</p>
            <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(36px,6vw,56px)', color: '#fff', letterSpacing: '0.04em', textAlign: 'center', marginBottom: 48 }}>Client Experiences</h2>
            <ReviewCarousel reviews={reviews} brandColor={brandColor} displayFont={displayFont} cardBg="#ffffff" cardBorder="2px solid #0f0f0f" />
          </div>
        </section>
      </FadeIn>

      {/* ══════════ BOOKING ══════════ */}
      <FadeIn>
        <section id="booking-section" style={{ padding: 'clamp(60px,8vw,120px) clamp(24px,5vw,80px)', background: '#fff' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: brandColor, marginBottom: 8 }}>Ready to Start?</p>
            <h2 style={{ fontFamily: displayFont, fontSize: 'clamp(36px,6vw,52px)', letterSpacing: '0.04em', marginBottom: 8 }}>Claim Your Slot</h2>
            <p style={{ color: 'var(--ink-soft)', fontWeight: 300, marginBottom: 40, fontSize: 15 }}>Choose a time that works for you and let's get to work.</p>
            <SlotPicker slots={slots} brandColor={brandColor} onSelect={slot => setConsultationSlot(slot)} />
          </div>
        </section>
      </FadeIn>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ background: '#000', color: '#fff', padding: 'clamp(48px,6vw,80px) clamp(24px,5vw,80px) 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, marginBottom: 40 }}>
            <div>
              {logo ? <img src={logo} alt="Logo" style={{ height: 48, marginBottom: 12, display: 'block' }} /> : null}
              <div style={{ fontFamily: displayFont, fontSize: 22, letterSpacing: '0.12em', color: brandColor, marginBottom: 6 }}>{businessName}</div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 300, maxWidth: 220, lineHeight: 1.6, marginBottom: (contactPhone || contactEmail) ? 12 : 0 }}>High-performance personal training tailored to your goals.</p>
              {contactPhone && (
                <a href={`tel:${contactPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', marginBottom: 8, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <span style={{ fontSize: 14 }}>📞</span> {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >
                  <span style={{ fontSize: 14 }}>✉</span> {contactEmail}
                </a>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Navigate</div>
              {navLinks.map(l => (
                <a key={l.label} href={l.href} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', fontWeight: 400, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >{l.label}</a>
              ))}
            </div>
            {/* Social column */}
            {(instagramUrl || facebookUrl || tiktokUrl) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Follow Us</div>
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E1306C'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#1877F2'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </a>
                )}
                {tiktokUrl && (
                  <a href={tiktokUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z"/></svg>
                    TikTok
                  </a>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Legal</div>
              {[{ key: 'privacy', label: 'Privacy Policy' }, { key: 'terms', label: 'Terms & Conditions' }].map(({ key, label }) => (
                <button key={key} onClick={() => setModal(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 400, textAlign: 'left', padding: 0, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = brandColor}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                >{label}</button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: '0.08em' }}>© {new Date().getFullYear()} {businessName}. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <a
                href="/login"
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2,
                  padding: '6px 14px', transition: 'color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = brandColor; e.currentTarget.style.borderColor = brandColor; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              >
                Professional Login
              </a>
              <a href="#" style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textDecoration: 'none', letterSpacing: '0.08em', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = brandColor}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.18)'}
              >↑ Back to top</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════ CONSULTATION FORM ══════════ */}
      {consultationSlot && (
        <ConsultationModal
          slot={consultationSlot}
          brandColor={brandColor}
          displayFont={displayFont}
          ownerEmail={barber?.email || profile?.businessEmail || profile?.email || ''}
          businessName={businessName}
          onClose={() => setConsultationSlot(null)}
        />
      )}

      {/* ══════════ MODAL ══════════ */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', borderRadius: 16, padding: 36, maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontFamily: displayFont, fontSize: 28, letterSpacing: '0.06em', margin: 0 }}>
                {modal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </h2>
              <button onClick={() => setModal(null)} style={{ background: '#222', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontSize: 14, fontWeight: 300 }}>
              {modal === 'privacy' ? privacyText : termsText}
            </p>
            <button onClick={() => setModal(null)} style={{ marginTop: 24, padding: '10px 24px', background: brandColor, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.1em' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}