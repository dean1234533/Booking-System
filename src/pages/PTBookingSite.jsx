import React, { useEffect, useRef, useState } from 'react';

// FADE-IN COMPONENT
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
    <div ref={ref} className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      {children}
    </div>
  );
};

export default function PTBookingSite({ profile, barber, reviews = [], bookingWidgetMount }) {
  const businessName = barber?.shopName || "DB FITNESS";
  const heroTitle = profile?.heroTitle || "Stronger. Leaner. Unstoppable.";
  const heroSubtitle = profile?.heroSubtitle || "Tailored high-performance outdoor functional resistance training packages.";
  
  const SocialIcon = ({ d, url }) => (
    <a href={url || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors p-2">
      <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24"><path d={d}/></svg>
    </a>
  );

  return (
    <div className="bg-white text-zinc-900 antialiased font-sans scroll-smooth min-h-screen overflow-x-hidden">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 py-4">
          <a href="#" className="font-bold text-lg md:text-xl tracking-tight uppercase truncate">{businessName}</a>
          <a href="#booking-section" className="rounded-full bg-zinc-900 px-5 py-2 text-[10px] md:text-xs font-bold uppercase text-white hover:bg-red-600 transition-all whitespace-nowrap">Book Now</a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-zinc-950 text-white p-6 text-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1920')] bg-cover bg-center opacity-30"></div>
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-[1.1]">{heroTitle}</h1>
          <p className="text-base md:text-lg text-zinc-300 mb-10 max-w-lg mx-auto">{heroSubtitle}</p>
          <a href="#booking-section" className="inline-block w-full sm:w-auto rounded-full bg-red-600 px-10 py-4 font-bold uppercase tracking-widest hover:bg-red-700 transition-all">Get Started</a>
        </div>
      </section>

      {/* TRUST STATS */}
      <FadeIn>
        <section className="py-12 bg-zinc-50 border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 grid grid-cols-3 gap-4 md:gap-8 text-center">
            <div><div className="text-2xl md:text-3xl font-black text-red-600">100+</div><div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Clients</div></div>
            <div><div className="text-2xl md:text-3xl font-black text-red-600">5.0</div><div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Rating</div></div>
            <div><div className="text-2xl md:text-3xl font-black text-red-600">Pro</div><div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Certified</div></div>
          </div>
        </section>
      </FadeIn>

      {/* VIDEO GRID */}
      <FadeIn>
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-10 md:mb-12 text-center md:text-left">Latest Sessions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group rounded-2xl overflow-hidden bg-zinc-100 aspect-[9/16] relative shadow-lg">
                <img src={`https://picsum.photos/seed/${i}/400/800`} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" alt="Training" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <span className="bg-white/20 px-6 py-2 rounded-full backdrop-blur-md text-white font-bold text-sm">Watch</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* REVIEWS */}
      <FadeIn>
        <section id="reviews" className="bg-zinc-950 py-16 md:py-24 text-white px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-extrabold text-center mb-12">Client Success</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-6 md:p-8 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <div className="text-amber-400 mb-4">★★★★★</div>
                  <p className="text-zinc-300 italic text-sm md:text-base">"{rev.comment}"</p>
                  <p className="mt-6 font-bold text-xs">— {rev.customerName || "Client"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* BOOKING */}
      <section id="booking-section" className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-8">Claim Your Slot</h2>
          <div className="p-2 border border-zinc-200 rounded-3xl bg-zinc-50 shadow-inner">
            {bookingWidgetMount}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-zinc-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="font-bold text-lg uppercase">{businessName}</div>
          <div className="flex gap-2 text-zinc-500">
            <SocialIcon d="M12 2.163c3.2 0 3.6.01 4.8.07 3.3.15 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2-.1 3.5-.1 4.8-.1 3.3-1.6 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1-3.2 0-3.5-.1-4.8-.1-3.3-.1-4.8-1.6-4.9-4.9-.1-1.3-.1-1.6-.1-4.8 0-3.2.1-3.5.1-4.8.1-3.3 1.6-4.8 4.9-4.9 1.3-.06 1.6-.07 4.8-.07zm0-2.163c-3.26 0-3.67.01-4.95.07-4.36.2-6.79 2.62-6.99 6.98-.06 1.28-.07 1.69-.07 4.95 0 3.26.01 3.67.07 4.95.2 4.36 2.62 6.79 6.99 6.99 1.28.06 1.69.07 4.95.07 3.26 0 3.67-.01 4.95-.07 4.36-.2 6.79-2.62 6.99-6.99.06-1.28.07-1.69.07-4.95 0-3.26-.01-3.67-.07-4.95-.2-4.36-2.62-6.79-6.99-6.99-1.28-.06-1.69-.07-4.95-.07zm0 5.838c-3.4 0-6.16 2.76-6.16 6.16 0 3.4 2.76 6.16 6.16 6.16 3.4 0 6.16-2.76 6.16-6.16 0-3.4-2.76-6.16-6.16-6.16zm0 10.162c-2.2 0-4-1.8-4-4 0-2.2 1.8-4 4-4 2.2 0 4 1.8 4 4 0 2.2-1.8 4-4 4zm6.4-11.8c-.8 0-1.4.6-1.4 1.4 0 .8.6 1.4 1.4 1.4.8 0 1.4-.6 1.4-1.4 0-.8-.6-1.4-1.4-1.4z" url={profile?.instagramUrl} />
            <SocialIcon d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.78 0 2.89 2.89 0 0 1 2.89-2.89h.7V8.5h-.7a6.39 6.39 0 1 0 6.39 6.39V8.5h3.45z" url={profile?.tiktokUrl} />
            <SocialIcon d="M24 12.07c0-6.63-5.37-12-12-12s-12 5.37-12 12c0 5.99 4.38 10.97 10.12 11.87v-8.39H7.08v-3.48h3.04V9.41c0-3.02 1.8-4.67 4.54-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88v2.24h3.32l-.53 3.48h-2.79v8.39C19.62 23.04 24 18.06 24 12.07z" url={profile?.facebookUrl} />
          </div>
        </div>
      </footer>
    </div>
  );
}