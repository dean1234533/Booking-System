import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Star, 
  ChevronRight, 
  Instagram, 
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';

/**
 * BEFORE/AFTER SLIDER COMPONENT
 * A professional, touch-enabled comparison slider.
 */
const BeforeAfterSlider = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x)));
  };

  return (
    <div 
      className="relative w-full aspect-square md:aspect-video rounded-xl overflow-hidden cursor-col-resize shadow-lg border-4 border-white"
      onMouseMove={handleMove}
      onTouchMove={(e) => handleMove(e.touches[0])}
    >
      <div className="absolute inset-0 w-full h-full">
        <img src={after} alt="After" className="w-full h-full object-cover" />
      </div>
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden" 
        style={{ width: `${sliderPos}%` }}
      >
        <img src={before} alt="Before" className="w-full h-[100%] max-w-none object-cover" style={{ width: '100vw' }} />
      </div>
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded uppercase tracking-widest">Before</div>
      <div className="absolute bottom-4 right-4 bg-white/50 text-black text-xs px-2 py-1 rounded uppercase tracking-widest">After</div>
    </div>
  );
};

const DecoratorTemplate = ({ tenantData }) => {
  // Use tenantData from your Firebase to make it dynamic
  const brandColor = tenantData?.brandColor || "#6366f1"; // Accent Purple from your video
  const businessName = tenantData?.businessName || "Amazon Clean";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
             <img src={tenantData?.logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight">{businessName}</span>
        </div>
        
        <div className="hidden md:flex gap-8 font-medium text-slate-600">
          <a href="#home" className="hover:text-slate-900 transition">Home</a>
          <a href="#portfolio" className="hover:text-slate-900 transition">Portfolio</a>
          <a href="#reviews" className="hover:text-slate-900 transition">Reviews</a>
          <a href="#services" className="hover:text-slate-900 transition">Services</a>
          <a href="#contact" className="hover:text-slate-900 transition">Contact</a>
        </div>

        <a href="#contact" 
           style={{ backgroundColor: brandColor }}
           className="hidden md:block text-white px-5 py-2.5 rounded-full font-bold shadow-md hover:scale-105 transition active:scale-95">
          Free Quote
        </a>
      </nav>

      {/* --- HERO SECTION --- */}
      <header id="home" className="relative h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop" 
            className="w-full h-full object-cover"
            alt="Background"
          />
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-lg">
            London's Home <br /> Painters, <span style={{ color: brandColor }}>Done Right</span>
          </h1>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium">
            Fully insured. Results guaranteed. Professional painting and decorating services tailored to your home.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <button 
              style={{ backgroundColor: brandColor }}
              className="w-full md:w-auto text-white px-10 py-5 rounded-full text-xl font-bold shadow-2xl hover:brightness-110 transition active:scale-95"
            >
              Get Your Free Quote
            </button>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="currentColor" />)}
              </div>
              <span className="text-white font-bold">Rated by 30+ Homeowners</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- SERVICES SECTION (What I Offer) --- */}
      <section id="services" className="py-24 px-6" style={{ backgroundColor: `${brandColor}10` }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">What I Offer</h2>
            <div className="w-24 h-1.5 mx-auto rounded-full" style={{ backgroundColor: brandColor }}></div>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
              Quality workmanship at fair prices. I keep your home tidy during the job and help you choose the perfect colors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <ul className="space-y-4">
                {[
                  "Room repaints", "Kitchen cabinet refreshes", "Stairs (including repairs)", 
                  "Ceilings only", "Feature walls", "Woodwork & trim", "Color consultation included"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-lg font-medium text-slate-700">
                    <CheckCircle2 style={{ color: brandColor }} />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                style={{ backgroundColor: brandColor }}
                className="w-full mt-10 text-white py-4 rounded-2xl font-bold shadow-lg hover:brightness-110 transition"
              >
                Get Your Free Quote
              </button>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
              <img src="https://images.unsplash.com/photo-1562619425-c307bb83bc42?q=80&w=1935&auto=format&fit=crop" alt="Painting" />
            </div>
          </div>
        </div>
      </section>

      {/* --- PORTFOLIO (Recent Work) --- */}
      <section id="portfolio" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-16">Recent Work</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <BeforeAfterSlider 
              before="https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop" 
              after="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2070&auto=format&fit=crop" 
            />
            <BeforeAfterSlider 
              before="https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?q=80&w=2076&auto=format&fit=crop" 
              after="https://images.unsplash.com/photo-1556912177-f547c184827a?q=80&w=2070&auto=format&fit=crop" 
            />
            <BeforeAfterSlider 
              before="https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop" 
              after="https://images.unsplash.com/photo-1527359353448-615621ad9d20?q=80&w=2069&auto=format&fit=crop" 
            />
          </div>
        </div>
      </section>

      {/* --- REVIEWS --- */}
      <section id="reviews" className="py-24 px-6" style={{ backgroundColor: `${brandColor}05` }}>
        <div className="max-w-4xl mx-auto">
           <h2 className="text-4xl font-extrabold text-center mb-16">What Our Customers Say</h2>
           <div className="bg-white p-10 rounded-[40px] shadow-2xl relative border-t-8" style={{ borderTopColor: brandColor }}>
              <div className="flex justify-center mb-6 text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={24} fill="currentColor" />)}
              </div>
              <p className="text-xl md:text-2xl text-center leading-relaxed text-slate-700 italic mb-8">
                "Excellent Painting Service. I'm very happy with the painting work. Professional, reliable, and great attention to detail. The finish looks fantastic and the job was completed on time and tidy throughout. Highly recommended."
              </p>
              <div className="text-center font-bold text-xl">— David R., London</div>
           </div>
        </div>
      </section>

      {/* --- CONTACT FORM --- */}
      <section id="contact" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-2xl mx-auto bg-white border border-slate-100 p-8 md:p-12 rounded-[2rem] shadow-2xl z-10 relative">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold mb-4">Contact Us</h2>
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-2xl">
              <img src="https://cdn-icons-png.flaticon.com/512/3062/3062130.png" className="w-12 h-12" alt="Paint Roller" />
            </div>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition" />
              <input type="text" placeholder="Last Name" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="email" placeholder="Email" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition" />
              <input type="tel" placeholder="Phone Number" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition" />
            </div>
            <input type="text" placeholder="Postcode" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition" />

            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold mb-4 text-slate-500 uppercase tracking-widest text-xs">Job Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full p-4 rounded-xl border-2 border-slate-100 bg-white outline-none">
                  <option>Type of work</option>
                  <option>Interior Painting</option>
                  <option>Exterior Painting</option>
                </select>
                <select className="w-full p-4 rounded-xl border-2 border-slate-100 bg-white outline-none">
                  <option>Property type</option>
                  <option>Residential</option>
                  <option>Commercial</option>
                </select>
              </div>
            </div>
            
            <textarea placeholder="Extra Details" rows="4" className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition"></textarea>
            
            <button 
              type="submit"
              style={{ backgroundColor: brandColor }}
              className="w-full py-5 rounded-2xl text-white font-bold text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition"
            >
              Request Quote
            </button>
          </form>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 border-b border-white/10 pb-12 mb-12">
          <div>
            <h4 className="text-xl font-bold mb-6">Get in Touch</h4>
            <div className="space-y-4">
              <a href="tel:07799348471" className="flex items-center gap-4 text-slate-300 hover:text-white transition">
                <Phone size={20} /> 07799 348471
              </a>
              <div className="flex items-center gap-4 text-slate-300">
                <Mail size={20} /> info@amazonclean.co.uk
              </div>
              <div className="flex gap-4 mt-6">
                <Instagram className="hover:text-pink-500 transition cursor-pointer" />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xl font-bold mb-6">Service Area</h4>
            <p className="text-slate-300 flex items-start gap-4">
              <MapPin size={20} className="mt-1" />
              London & surrounding areas. Home visits available for color consultations.
            </p>
          </div>
          <div>
            <h4 className="text-xl font-bold mb-6">Business Hours</h4>
            <p className="text-slate-300 flex items-center gap-4">
              <Clock size={20} /> Available every day for quotes and bookings.
            </p>
          </div>
        </div>
        <div className="text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} {businessName}. All rights reserved. | Privacy Policy | Terms
        </div>
      </footer>
      
      {/* --- STICKY CALL BUTTON (Mobile) --- */}
      <a 
        href="tel:07799348471"
        style={{ backgroundColor: brandColor }}
        className="md:hidden fixed bottom-6 right-6 p-4 rounded-full text-white shadow-2xl z-50 animate-bounce"
      >
        <Phone size={28} />
      </a>

    </div>
  );
};

export default DecoratorTemplate;