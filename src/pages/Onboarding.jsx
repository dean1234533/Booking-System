import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";

/* ── Inline styles ── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

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
  .ob-step-dot.active { background: #fff; box-shadow: 0 0 0 3px rgba(201,168,76,0.25); }

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
    max-width: 380px;
  }

  /* ── Checklist ── */
  .ob-checklist {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 36px;
  }
  .ob-check-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    color: rgba(255,255,255,0.65);
    line-height: 1.5;
    font-weight: 400;
    opacity: 0;
    transform: translateX(-12px);
    animation: slideInLeft 0.4s ease forwards;
  }
  @keyframes slideInLeft {
    to { opacity: 1; transform: translateX(0); }
  }
  .ob-check-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(201,168,76,0.12);
    border: 1px solid rgba(201,168,76,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 10px;
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
  .ob-cta:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

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
    background: radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%);
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
    background: rgba(201,168,76,0.1);
    border: 1px solid rgba(201,168,76,0.2);
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

  /* ── Mockup elements inside card ── */
  .ob-mock-domain {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .ob-mock-domain-text { font-size: 13px; color: rgba(255,255,255,0.7); font-family: monospace; }
  .ob-mock-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 99px;
  }
  .ob-mock-badge.available { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
  .ob-mock-badge.taken     { background: rgba(239,68,68,0.12);  color: #f87171; border: 1px solid rgba(239,68,68,0.15); }

  .ob-mock-stripe {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(99,91,255,0.08);
    border: 1px solid rgba(99,91,255,0.15);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 10px;
  }
  .ob-mock-stripe-logo {
    width: 32px; height: 32px; border-radius: 8px;
    background: #635BFF;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 900; color: #fff; font-family: 'Syne', sans-serif;
  }
  .ob-mock-stripe-text { font-size: 13px; color: rgba(255,255,255,0.7); }
  .ob-mock-stripe-sub  { font-size: 11px; color: rgba(255,255,255,0.3); }

  .ob-mock-site-preview {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    overflow: hidden;
  }
  .ob-mock-site-bar {
    background: rgba(255,255,255,0.05);
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .ob-mock-dot { width: 8px; height: 8px; border-radius: 50%; }
  .ob-mock-url {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 10px;
    color: rgba(255,255,255,0.3);
    font-family: monospace;
    margin: 0 6px;
  }
  .ob-mock-site-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ob-mock-line {
    height: 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.06);
  }
  .ob-mock-line.accent { background: rgba(201,168,76,0.25); width: 40%; }
  .ob-mock-line.title  { background: rgba(255,255,255,0.12); width: 70%; height: 14px; }
  .ob-mock-line.short  { width: 50%; }

  /* ── Done state ── */
  .ob-done-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 40px 0;
    animation: cardFadeIn 0.6s ease both;
  }
  .ob-done-ring {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(201,168,76,0.1);
    border: 2px solid rgba(201,168,76,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    margin-bottom: 24px;
    animation: pulseBrand 2s ease infinite;
  }
  @keyframes pulseBrand {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.15); }
    50%       { box-shadow: 0 0 0 16px rgba(201,168,76,0); }
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
    max-width: 320px;
    margin-bottom: 32px;
  }

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
    .ob-mock-domain-text {
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
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
    .ob-check-item { font-size: 13px; }
    .ob-logo { font-size: 15px; }
    .ob-skip { font-size: 11px; }
    .ob-card-title { font-size: 18px; }
  }
`;

/* ── Step data ── */
const STEPS = [
  {
    num: "Step 01",
    heading: <>Your<br /><em>domain</em> name</>,
    desc: "Claim your corner of the web. A custom domain makes your booking site look professional and is memorable for your clients.",
    checks: [
      "Search any domain name you want",
      "We register it and connect it automatically — no DNS setup needed",
      "Free SSL certificate included",
      "Or skip and add one later from the Domain tab",
    ],
    ctaLabel: "Search Domains",
    ctaRoute: "/dashboard",
    ctaTab: "domain",
    skipLabel: "Skip for now",
    cardEyebrow: "Domain Setup",
    cardIcon: "🌐",
    cardTitle: "Find your perfect domain",
    cardBody: "Type a name and we'll tell you instantly if it's available. Once purchased, it goes live in minutes.",
    card: "domain",
  },
  {
    num: "Step 02",
    heading: <>Connect<br /><em>Stripe</em> payments</>,
    desc: "Start taking deposits and payments from clients online. Stripe is the world's most trusted payment platform — setup takes 5 minutes.",
    checks: [
      "Accept booking deposits automatically",
      "Take full payments or send pay links",
      "Funds land directly in your bank account",
      "Cancel & refund bookings with one click",
    ],
    ctaLabel: "Connect Stripe",
    ctaRoute: "/dashboard",
    ctaTab: "finance",
    skipLabel: "Skip for now",
    cardEyebrow: "Payments Setup",
    cardIcon: "💳",
    cardTitle: "Stripe — trusted by millions",
    cardBody: "Your money goes straight to your bank. Bookrty never holds your funds.",
    card: "stripe",
  },
  {
    num: "Step 03",
    heading: <>Customise<br /><em>your site</em></>,
    desc: "Make your booking page yours. Upload your logo, set your brand colour, write your bio, add services and pricing — all in minutes.",
    checks: [
      "Upload your hero image and logo",
      "Set your brand colour — it applies everywhere",
      "Add your services and pricing plans",
      "Edit every line of text on your public page",
    ],
    ctaLabel: "Go to Dashboard",
    ctaRoute: "/dashboard",
    ctaTab: "domain",
    skipLabel: null,
    cardEyebrow: "Your Website",
    cardIcon: "✨",
    cardTitle: "Your site, your brand",
    cardBody: "Everything your clients see is editable. No code required.",
    card: "site",
  },
];

/* ── Card visuals ── */
function DomainCard() {
  return (
    <div>
      {[
        { domain: "yourbusiness.co.uk", status: "available" },
        { domain: "myshop.com",         status: "taken" },
        { domain: "yourbusiness.com",   status: "available" },
      ].map((d, i) => (
        <div key={i} className="ob-mock-domain" style={{ animationDelay: `${i * 80}ms` }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span className="ob-mock-domain-text">{d.domain}</span>
          <span className={`ob-mock-badge ${d.status}`}>
            {d.status === "available" ? "✓ Available" : "✗ Taken"}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
        🔒 Free SSL · Auto DNS · Renews yearly
      </div>
    </div>
  );
}

function StripeCard() {
  return (
    <div>
      <div className="ob-mock-stripe">
        <div className="ob-mock-stripe-logo">S</div>
        <div>
          <div className="ob-mock-stripe-text">Stripe Connect</div>
          <div className="ob-mock-stripe-sub">Secure · Instant payouts · No setup fees</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        {[
          { label: "Deposits", val: "✓ Auto", color: "#4ade80" },
          { label: "Pay links", val: "✓ Tap-to-Pay", color: "#4ade80" },
          { label: "Refunds",  val: "✓ 1-click", color: "#4ade80" },
          { label: "Payouts",  val: "Next day", color: "rgba(255,255,255,0.5)" },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteCard() {
  return (
    <div className="ob-mock-site-preview">
      <div className="ob-mock-site-bar">
        <div className="ob-mock-dot" style={{ background: "#ff5f57" }} />
        <div className="ob-mock-dot" style={{ background: "#ffbd2e" }} />
        <div className="ob-mock-dot" style={{ background: "#28c840" }} />
        <div className="ob-mock-url">yourbusiness.co.uk</div>
      </div>
      <div className="ob-mock-site-body">
        <div className="ob-mock-line accent" />
        <div className="ob-mock-line title" />
        <div className="ob-mock-line" style={{ width: "85%" }} />
        <div className="ob-mock-line short" />
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ height: 28, flex: 1, borderRadius: 4, background: "rgba(201,168,76,0.25)" }} />
          <div style={{ height: 28, flex: 1, borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 40, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Onboarding component ── */
export default function Onboarding({ brandColor = "#C9A84C" }) {
  const navigate  = useNavigate();
  const [step, setStep] = useState(0);
  const [key,  setKey]  = useState(0); // force re-animation on step change

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const current = STEPS[step];

  function advance(tab) {
    // CTA always navigates directly — to a specific tab or the root dashboard
    navigate(tab ? `/dashboard?tab=${tab}` : "/dashboard");
  }

  function skip() {
    setStep(s => s + 1);
    setKey(k => k + 1);
  }

  return (
    <>
      <style>{css}</style>
      <div className="ob-root" style={{ "--brand": brandColor }}>

        {/* Top bar */}
        <div className="ob-topbar">
          <div className="ob-logo">Bookrty</div>
          <button className="ob-skip" onClick={() => navigate("/dashboard")}>
            Skip setup →
          </button>
        </div>

        {/* Progress */}
        <div className="ob-progress-wrap">
          <div className="ob-step-row">
            {STEPS.map((_, i) => {
              const isDone   = i < step;
              const isActive = i === step;
              return (
                <React.Fragment key={i}>
                  <div className={`ob-step-pill ${isDone ? "done" : isActive ? "active" : ""}`} key={isActive ? key : i} />
                  {i < STEPS.length - 1 && (
                    <div className={`ob-step-dot ${isDone ? "done" : isActive ? "active" : ""}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="ob-step-labels">
            {STEPS.map((s, i) => (
              <div key={i} className={`ob-step-label ${i < step ? "done" : i === step ? "active" : ""}`}>
                {i === 0 ? "Domain" : i === 1 ? "Payments" : "Website"}
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

            <ul className="ob-checklist">
              {current.checks.map((c, i) => (
                <li key={i} className="ob-check-item" style={{ animationDelay: `${i * 80 + 100}ms` }}>
                  <div className="ob-check-icon">✓</div>
                  {c}
                </li>
              ))}
            </ul>

            <div className="ob-cta-row">
              {step < STEPS.length - 1 ? (
                /* Steps 1 & 2 — informational only, just advance */
                <button className="ob-cta" onClick={skip}>
                  Next
                  <span className="ob-cta-arrow">→</span>
                </button>
              ) : (
                /* Step 3 — final, go to dashboard */
                <button className="ob-cta" onClick={() => advance(current.ctaTab)}>
                  {current.ctaLabel}
                  <span className="ob-cta-arrow">→</span>
                </button>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="ob-card">
            <div className="ob-card-eyebrow">{current.cardEyebrow}</div>
            <div className="ob-card-icon">{current.cardIcon}</div>
            <div className="ob-card-title">{current.cardTitle}</div>
            <p className="ob-card-body">{current.cardBody}</p>

            {current.card === "domain" && <DomainCard />}
            {current.card === "stripe" && <StripeCard />}
            {current.card === "site"   && <SiteCard />}
          </div>

        </div>

      </div>
    </>
  );
}