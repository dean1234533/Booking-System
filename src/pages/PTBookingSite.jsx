import React, { useEffect, useRef, useState } from 'react';

const FadeIn = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {children}
    </div>
  );
};

export default function PTBookingSite({ profile, barber, reviews = [], bookingWidgetMount }) {
  const [modalContent, setModalContent] = useState(null);

  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const businessName  = barber?.shopName          || "DB FITNESS";
  const heroTitle     = profile?.heroTitle        || "Stronger. Leaner. Unstoppable.";
  const heroSubtitle  = profile?.heroSubtitle     || "Tailored high-performance outdoor functional resistance training packages.";
  const brandColor    = profile?.brandColor       || "#dc2626";
  const logo          = profile?.logoUrl          || null;
  const aboutText1    = profile?.aboutText1       || "With years of experience in high-performance athletics and functional training, I specialize in helping individuals push past their perceived limits. My philosophy is simple: consistency, intensity, and smart programming.";
  const aboutText2    = profile?.aboutText2       || "Whether you're looking to build explosive strength, improve mobility, or completely transform your physique, I provide the tools and accountability to get you there.";
  const privacyText   = profile?.privacyPolicy    || `At ${businessName}, we value your privacy. We collect only the information necessary to provide our services and never sell your data to third parties.`;
  const termsText     = profile?.termsConditions  || `By using ${businessName}, you agree to our terms of service. All bookings are subject to our cancellation policy.`;

  const specializations = profile?.specializations || [
    { title: "Strength & Conditioning", description: "Build raw power and muscular endurance through proven compound lifting and progressive overload programming." },
    { title: "Fat Loss & Transformation", description: "Science-backed nutrition guidance and high-intensity training designed to strip fat while preserving muscle." },
    { title: "Functional Fitness", description: "Outdoor resistance training focused on real-world movement patterns, mobility, and athletic performance." },
    { title: "1-to-1 Coaching", description: "Fully personalised sessions tailored to your goals, schedule, and current fitness level." },
  ];

  const pricingPlans = profile?.pricingPlans || [
    {
      name: "Taster Session",
      price: "£40",
      period: "one-off",
      features: ["60-min session", "Fitness assessment", "Goal setting", "No commitment"],
      highlight: false,
    },
    {
      name: "Monthly Package",
      price: "£280",
      period: "per month",
      features: ["8 sessions/month", "Nutrition guidance", "WhatsApp support", "Progress tracking"],
      highlight: true,
    },
    {
      name: "10-Session Block",
      price: "£350",
      period: "block",
      features: ["10 x 60-min sessions", "Flexible scheduling", "Training plan", "Valid 3 months"],
      highlight: false,
    },
  ];

  return (
    <div className="bg-white text-zinc-900 antialiased font-sans scroll-smooth min-h-screen overflow-x-hidden">

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 py-4">
          <a href="#" className="font-bold text-lg md:text-xl tracking-tight uppercase truncate">
            {businessName}
          </a>
          <div className="flex items-center gap-4">
            <a href="#about" className="hidden md:block text-xs font-bold uppercase hover:text-red-600 transition-colors">About</a>
            <a href="#specializations" className="hidden md:block text-xs font-bold uppercase hover:text-red-600 transition-colors">Services</a>
            <a href="#pricing" className="hidden md:block text-xs font-bold uppercase hover:text-red-600 transition-colors">Pricing</a>
            <a
              href="#booking-section"
              className="rounded-full bg-zinc-900 px-5 py-2 text-[10px] md:text-xs font-bold uppercase text-white hover:bg-red-600 transition-all whitespace-nowrap"
            >
              Book Now
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-zinc-950 text-white p-6 text-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1920')" }}
        />
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-[1.1]">
            {heroTitle}
          </h1>
          <p className="text-base md:text-lg text-zinc-300 mb-10 max-w-lg mx-auto">{heroSubtitle}</p>
          <a
            href="#booking-section"
            className="inline-block w-full sm:w-auto rounded-full bg-red-600 px-10 py-4 font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* TRUST STATS */}
      <FadeIn>
        <section className="py-12 bg-zinc-50 border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 grid grid-cols-3 gap-4 md:gap-8 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-black" style={{ color: brandColor }}>100+</div>
              <div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Clients</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black" style={{ color: brandColor }}>5.0</div>
              <div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Rating</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black" style={{ color: brandColor }}>Pro</div>
              <div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Certified</div>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ABOUT */}
      <FadeIn>
        <section id="about" className="py-20 md:py-32 px-6 bg-white">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 w-full">
              <img
                src={profile?.heroImage || "https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=800"}
                alt="Trainer"
                className="rounded-3xl shadow-2xl w-full object-cover"
                style={{ maxHeight: 500 }}
              />
            </div>
            <div className="flex-1">
              <p
                className="text-xs font-black uppercase tracking-widest mb-3"
                style={{ color: brandColor }}
              >
                Meet Your Coach
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6">
                {profile?.coachName || barber?.name || "Your Personal Trainer"}
              </h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">{aboutText1}</p>
              <p className="text-zinc-600 leading-relaxed">{aboutText2}</p>
              <a
                href="#booking-section"
                className="inline-block mt-8 rounded-full px-8 py-3 font-bold uppercase text-sm text-white transition-all hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Book a Session
              </a>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* SPECIALIZATIONS */}
      <FadeIn>
        <section id="specializations" className="py-20 md:py-28 px-6 bg-zinc-50">
          <div className="max-w-5xl mx-auto">
            <p
              className="text-xs font-black uppercase tracking-widest text-center mb-3"
              style={{ color: brandColor }}
            >
              What I Do
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-14">
              Areas of Expertise
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {specializations.map((spec, i) => (
                <div
                  key={i}
                  className="p-8 bg-white border-t-4 shadow-sm hover:shadow-lg transition-all"
                  style={{ borderTopColor: brandColor }}
                >
                  <h3 className="text-xl font-bold mb-4 tracking-tight">{spec.title}</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed">{spec.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* PRICING */}
      <FadeIn>
        <section id="pricing" className="py-20 md:py-28 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <p
              className="text-xs font-black uppercase tracking-widest text-center mb-3"
              style={{ color: brandColor }}
            >
              Investment
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-zinc-500 text-center mb-14 max-w-lg mx-auto">
              No hidden fees. No long-term contracts. Just results.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, i) => (
                <div
                  key={i}
                  className="rounded-3xl overflow-hidden border transition-all hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    borderColor: plan.highlight ? brandColor : "#e4e4e7",
                    boxShadow: plan.highlight ? `0 0 0 2px ${brandColor}` : "none",
                  }}
                >
                  {plan.highlight && (
                    <div
                      className="text-white text-center text-xs font-black uppercase tracking-widest py-2"
                      style={{ backgroundColor: brandColor }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="p-8">
                    <h3 className="text-lg font-extrabold mb-1">{plan.name}</h3>
                    <div className="flex items-end gap-1 mb-6">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="text-zinc-400 text-sm mb-1">/ {plan.period}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-3 text-sm text-zinc-600">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                            style={{ backgroundColor: brandColor }}
                          >
                            ✓
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <a
                      href="#booking-section"
                      className="block text-center rounded-full py-3 font-bold text-sm uppercase transition-all"
                      style={
                        plan.highlight
                          ? { backgroundColor: brandColor, color: "#fff" }
                          : { backgroundColor: "#f4f4f5", color: "#18181b" }
                      }
                    >
                      Book Now
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* REVIEWS */}
      <FadeIn>
        <section id="reviews" className="bg-zinc-950 py-16 md:py-24 text-white px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-extrabold text-center mb-12">Client Success</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.length > 0 ? reviews.map((rev) => (
                <div key={rev.id} className="p-6 md:p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <div className="text-amber-400 mb-4">★★★★★</div>
                  <p className="text-zinc-300 italic text-sm md:text-base">"{rev.comment}"</p>
                  <p className="mt-6 font-bold text-xs">— {rev.customerName || "Client"}</p>
                </div>
              )) : (
                <div className="col-span-2 text-center text-zinc-500 py-12">
                  Reviews will appear here once clients leave feedback.
                </div>
              )}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* BOOKING */}
      <section id="booking-section" className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-xl text-center">
          <p
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ color: brandColor }}
          >
            Ready to Start?
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-8">Claim Your Slot</h2>
          <div className="p-2 border border-zinc-200 rounded-3xl bg-zinc-50 shadow-inner">
            {bookingWidgetMount}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: "#000", color: "#fff", padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "flex", flexWrap: "wrap",
              justifyContent: "space-between", alignItems: "center",
              gap: 24, marginBottom: 32,
            }}
          >
            <div>
              {logo && (
                <img src={logo} alt="Logo" style={{ height: 60, marginBottom: 12, display: "block" }} />
              )}
              <div style={{ fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: brandColor, fontSize: 18 }}>
                {businessName}
              </div>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <button
                onClick={() => setModalContent("privacy")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}
              >
                Privacy
              </button>
              <button
                onClick={() => setModalContent("terms")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}
              >
                Terms
              </button>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 24, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
              © {new Date().getFullYear()} {businessName}. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>

      {/* LEGAL MODAL */}
      {modalContent && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setModalContent(null)}
        >
          <div
            style={{ backgroundColor: "#111", color: "#fff", borderRadius: 16, padding: 32, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontWeight: 900, marginBottom: 16, textTransform: "uppercase" }}>
              {modalContent === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontSize: 14 }}>
              {modalContent === "privacy" ? privacyText : termsText}
            </p>
            <button
              onClick={() => setModalContent(null)}
              style={{ marginTop: 24, padding: "10px 24px", background: brandColor, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", fontSize: 12 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}