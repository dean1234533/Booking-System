import React from 'react';

export default function PTBookingSite({ profile, barber, reviews = [], bookingWidgetMount }) {
  // Graceful fallbacks using profile keys or clean professional strings
  const businessName = barber?.shopName || "DB FITNESS";
  const heroTitle = profile?.heroTitle || "Stronger. Leaner. Unstoppable.";
  const heroSubtitle = profile?.heroSubtitle || "Tailored high-performance outdoor functional resistance training packages in East London.";
  const aboutText = profile?.aboutUs || "We strip away the intimidation of crowded commercial gym floors to construct true functional athleticism in the open air.";
  
  // Custom video anchor links configured in the customizer tab
  const mainVideoUrl = profile?.instagramVideoUrl || "https://www.instagram.com";
  const aboutVideoUrl = profile?.aboutVideoUrl || "https://www.instagram.com";

  return (
    <div className="bg-zinc-50 text-zinc-900 antialiased font-sans scroll-smooth min-h-screen">
      
      {/* STICKY STYLED NAVIGATION */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-8">
          <a href="#" className="flex items-center gap-2 font-extrabold tracking-tight text-xl">
            <span className="bg-red-600 px-2 py-0.5 text-white rounded">PT</span> {businessName.toUpperCase()}
          </a>
          
          <nav className="hidden space-x-8 text-sm font-semibold text-zinc-600 md:flex">
            <a href="#" className="transition-colors hover:text-red-600">Home</a>
            <a href="#about" className="transition-colors hover:text-red-600">About</a>
            <a href="#services" className="transition-colors hover:text-red-600">Services</a>
            <a href="#reviews" className="transition-colors hover:text-red-600">Reviews</a>
          </nav>

          <div>
            <a 
              href="#booking-section" 
              className="inline-block rounded bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white select-none transition-all duration-75 active:translate-y-[2px] active:shadow-none shadow-[0_4px_0_#991b1b]"
            >
              Book Consultation
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION WITH EXTRACTED INSTAGRAM VIDEO REDIRECTS */}
      <section className="relative flex min-h-[85vh] items-center justify-center bg-zinc-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1920')] bg-cover bg-center opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
        
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="inline-block rounded bg-red-600/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-400 border border-red-600/30 mb-4">
            Outdoor Performance Coaching
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-zinc-300 md:text-lg">
            {heroSubtitle}
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a 
              href="#booking-section" 
              className="w-full rounded bg-red-600 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all duration-75 active:translate-y-[2px] active:shadow-none shadow-[0_5px_0_#991b1b] sm:w-auto text-center"
            >
              Get Started Free
            </a>
            <a 
              href={mainVideoUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex w-full items-center justify-center gap-2 rounded bg-zinc-800 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white border border-zinc-700 transition-all duration-75 active:translate-y-[2px] active:shadow-none shadow-[0_5px_0_#374151] sm:w-auto"
            >
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Watch Training Video
            </a>
          </div>
        </div>
      </section>

      {/* SCROLL FADE-IN ANIMATED ABOUT US COMPONENT */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-24 md:px-8 transition-all duration-1000 transform motion-safe:opacity-100">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">The Program</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Meet Your Personal Trainer
            </h2>
            <p className="mt-6 text-zinc-600 leading-relaxed text-base">
              {aboutText}
            </p>
          </div>
          
          {/* LINKED INSTAGRAM VIDEO POST WITH PLACEHOLDER COVER */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-200 shadow-xl border border-zinc-200">
            <a href={aboutVideoUrl} target="_blank" rel="noopener noreferrer" className="group absolute inset-0 block">
              <img 
                src="https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=800" 
                alt="Instagram Session Cover" 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 group-hover:bg-zinc-950/50 transition-colors">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform group-hover:scale-110">
                  <svg className="h-6 w-6 fill-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* SERVICES DISPLAY SECTION */}
      <section id="services" className="bg-zinc-100 py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">Training Capabilities</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">Expertise Options</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-8 border border-zinc-200 shadow-sm">
              <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-900">Strength Build</h3>
              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">Hypertrophy mechanics and structural output improvements via outdoor loaded setups.</p>
            </div>
            <div className="rounded-xl bg-white p-8 border border-zinc-200 shadow-sm">
              <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-900">Fat Loss & Conditioning</h3>
              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">High metabolic stress circuits built dynamically to shed fat efficiently.</p>
            </div>
            <div className="rounded-xl bg-white p-8 border border-zinc-200 shadow-sm">
              <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-900">Mobility Metrics</h3>
              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">Joint workspace expansions, core integration work, and corrective postural fixes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DYNAMIC REVIEWS SECTION WITH 3D STARS */}
      <section id="reviews" className="bg-zinc-950 py-24 text-white">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="text-center mb-16">
            {/* 3D Gold Star Text Shadows */}
            <div className="text-amber-400 text-5xl font-black tracking-tight select-none [text-shadow:0_3px_0_#b45309,0_6px_8px_rgba(0,0,0,0.4)]">
              ★ ★ ★ ★ ★
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">Verified Client Transformations</h2>
          </div>

          {reviews.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm italic">No reviews loaded yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-xl bg-zinc-900 p-8 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="text-amber-400 text-sm">{"★".repeat(rev.rating || 5)}</div>
                    <p className="mt-4 text-zinc-300 italic text-sm leading-relaxed">"{rev.comment}"</p>
                  </div>
                  <span className="mt-6 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                    — {rev.customerName || "Anonymous Trainer Client"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CORE SCHEDULING INTERFACE LAYER */}
      <section id="booking-section" className="bg-white py-24 border-t border-zinc-200">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight">Claim Your Time Slot</h2>
            <p className="text-zinc-500 mt-2">Sync directly to calendar workflows by scheduling below.</p>
          </div>
          
          <div className="p-2 border border-zinc-200 rounded-2xl bg-zinc-50">
            {bookingWidgetMount}
          </div>
        </div>
      </section>

    </div>
  );
}