import React from 'react';
import '../styles/PTBookingSite.css'; 

export default function PTBookingSite({ profile, barber, reviews = [], bookingWidgetMount }) {
  const businessName = barber?.shopName || "DB FITNESS";
  const heroTitle = profile?.heroTitle || "Stronger. Leaner. Unstoppable.";
  const heroSubtitle = profile?.heroSubtitle || "Tailored high-performance outdoor functional resistance training packages in East London.";
  const aboutText = profile?.aboutUs || "We strip away the intimidation of crowded commercial gym floors to construct true functional athleticism in the open air.";
  
  const mainVideoUrl = profile?.instagramVideoUrl || "https://www.instagram.com";
  const aboutVideoUrl = profile?.aboutVideoUrl || "https://www.instagram.com";

  return (
    <div className="pt-site">
      
      {/* NAVIGATION */}
      <header className="pt-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-8">
          <a href="#" className="flex items-center gap-2 font-extrabold tracking-tight text-xl">
            <span className="bg-red-600 px-2 py-0.5 text-white rounded">PT</span> {businessName.toUpperCase()}
          </a>
          
          <nav className="hidden space-x-8 text-sm font-semibold text-zinc-600 md:flex">
            <a href="#">Home</a>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#reviews">Reviews</a>
          </nav>

          <a href="#booking-section" className="pt-btn-red">Book Consultation</a>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-hero">
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="pt-text-red">Outdoor Performance Coaching</span>
          <h1 className="pt-h2">{heroTitle}</h1>
          <p className="mx-auto mt-6 max-w-xl text-zinc-300">{heroSubtitle}</p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#booking-section" className="pt-btn-red">Get Started Free</a>
            <a href={mainVideoUrl} target="_blank" rel="noopener noreferrer" className="pt-btn-dark">
              Watch Training Video
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="pt-section">
        <div className="pt-grid lg:grid-cols-2 lg:items-center">
          <div>
            <span className="pt-text-red">The Program</span>
            <h2 className="pt-h2">Meet Your Personal Trainer</h2>
            <p className="mt-6 text-zinc-600">{aboutText}</p>
          </div>
          <div className="pt-card aspect-video">
             <a href={aboutVideoUrl} target="_blank" rel="noopener noreferrer">
                <img src="https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=800" alt="Video" className="h-full w-full object-cover" />
             </a>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="pt-section bg-zinc-100">
        <div className="pt-grid">
          <div className="pt-card"><h3>Strength Build</h3></div>
          <div className="pt-card"><h3>Fat Loss & Conditioning</h3></div>
          <div className="pt-card"><h3>Mobility Metrics</h3></div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="pt-section bg-zinc-950 text-white">
        {reviews.length === 0 ? (
          <p className="text-center text-zinc-500">No reviews loaded yet.</p>
        ) : (
          <div className="pt-grid">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-card bg-zinc-900 border-zinc-800">
                <p className="text-zinc-300">"{rev.comment}"</p>
                <span className="mt-6 block text-xs font-bold uppercase text-zinc-500">— {rev.customerName}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BOOKING */}
      <section id="booking-section" className="pt-section">
        <div className="pt-card">{bookingWidgetMount}</div>
      </section>
    </div>
  );
}