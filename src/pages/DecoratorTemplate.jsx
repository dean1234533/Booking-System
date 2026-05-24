import React, { useState } from 'react';
import { 
  Phone, Mail, MapPin, Clock, Star, ChevronLeft, ChevronRight, 
  CheckCircle2, Menu, X 
} from 'lucide-react';
// Required imports for the Footer and Dialog components
import { 
  Box, Typography, Container, Stack, Link, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button 
} from "@mui/material";

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

const InstagramIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const DecoratorTemplate = ({ tenantData }) => {
  const brandColor = tenantData?.brandColor || "#6366f1";
  const businessName = tenantData?.businessName || "Amazon Clean";
  const logo = tenantData?.logo; // Fixed: Defined logo

  const reviews = [
    { name: "David R.", text: "Excellent Painting Service. Professional, reliable, and great attention to detail." },
    { name: "Sarah M.", text: "Transformed our living room. Clean, tidy, and finished exactly on time!" },
    { name: "James L.", text: "The color consultation was a game changer. Very happy with the results." },
    { name: "Emma T.", text: "High quality finish and very respectful of my property. Would hire again." },
    { name: "Robert W.", text: "Fair pricing and top-tier workmanship. Highly recommended for any home." }
  ];

  const [currentReview, setCurrentReview] = useState(0);
  const [modalContent, setModalContent] = useState(null); // Fixed: Initialized state

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
             {logo && <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />}
          </div>
          <span className="font-bold text-xl tracking-tight">{businessName}</span>
        </div>
        
        <div className="hidden md:flex gap-8 font-medium text-slate-600">
          <a href="#home" className="hover:text-slate-900 transition">Home</a>
          <a href="#about" className="hover:text-slate-900 transition">About</a>
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

      {/* --- SECTIONS (About, Services, Portfolio, Reviews, Contact) --- */}
      <section id="about" className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-8">About My Work</h2>
          <p className="text-xl text-slate-600 leading-relaxed">
            With over 10 years of experience in high-end residential painting and decorating, I pride myself on meticulous prep work and a flawless finish. Whether it's a single feature wall or a complete property refresh, I treat every home as if it were my own.
          </p>
        </div>
      </section>

       {/* --- SERVICES SECTION --- */}



      <section id="services" className="py-24 px-6" style={{ backgroundColor: `${brandColor}10` }}>



        <div className="max-w-6xl mx-auto">



          <div className="text-center mb-16">



            <h2 className="text-4xl font-extrabold mb-4">What I Offer</h2>



            <div className="w-24 h-1.5 mx-auto rounded-full" style={{ backgroundColor: brandColor }}></div>



          </div>







          <div className="grid md:grid-cols-2 gap-12 items-center">



            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">



              <ul className="space-y-4">



                {["Room repaints", "Kitchen cabinet refreshes", "Stairs (including repairs)", "Ceilings only", "Feature walls", "Woodwork & trim", "Color consultation included"].map((item, i) => (



                  <li key={i} className="flex items-center gap-4 text-lg font-medium text-slate-700">



                    <CheckCircle2 style={{ color: brandColor }} />



                    {item}



                  </li>



                ))}



              </ul>



              <button style={{ backgroundColor: brandColor }} className="w-full mt-10 text-white py-4 rounded-2xl font-bold shadow-lg hover:brightness-110 transition">



                Get Your Free Quote



              </button>



            </div>



            <div className="rounded-3xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">



              <img src="https://images.unsplash.com/photo-1562619425-c307bb83bc42?q=80&w=1935&auto=format&fit=crop" alt="Painting" />



            </div>



          </div>



        </div>



      </section>







      {/* --- PORTFOLIO --- */}



      <section id="portfolio" className="py-24 px-6 bg-white">



        <div className="max-w-7xl mx-auto text-center">



          <h2 className="text-4xl font-extrabold mb-16">Recent Work</h2>



          <div className="grid md:grid-cols-3 gap-8">



            <BeforeAfterSlider before="https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop" after="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2070&auto=format&fit=crop" />



            <BeforeAfterSlider before="https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?q=80&w=2076&auto=format&fit=crop" after="https://images.unsplash.com/photo-1556912177-f547c184827a?q=80&w=2070&auto=format&fit=crop" />



            <BeforeAfterSlider before="https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop" after="https://images.unsplash.com/photo-1527359353448-615621ad9d20?q=80&w=2069&auto=format&fit=crop" />



          </div>



        </div>



      </section>







      {/* --- SLIDING REVIEWS --- */}



      <section id="reviews" className="py-24 px-6" style={{ backgroundColor: `${brandColor}05` }}>



        <div className="max-w-4xl mx-auto">



           <h2 className="text-4xl font-extrabold text-center mb-16">What Our Customers Say</h2>



           <div className="bg-white p-10 rounded-[40px] shadow-2xl relative border-t-8 transition-all duration-500" style={{ borderTopColor: brandColor }}>



              <div className="flex justify-center mb-6 text-yellow-400">



                {[...Array(5)].map((_, i) => <Star key={i} size={24} fill="currentColor" />)}



              </div>



              <p className="text-xl md:text-2xl text-center leading-relaxed text-slate-700 italic mb-8">



                "{reviews[currentReview].text}"



              </p>



              <div className="text-center font-bold text-xl">— {reviews[currentReview].name}</div>



              



              <button onClick={() => setCurrentReview(prev => (prev === 0 ? reviews.length - 1 : prev - 1))} className="absolute left-4 top-1/2 p-2 rounded-full bg-slate-100 hover:bg-slate-200"><ChevronLeft /></button>



              <button onClick={() => setCurrentReview(prev => (prev === reviews.length - 1 ? 0 : prev + 1))} className="absolute right-4 top-1/2 p-2 rounded-full bg-slate-100 hover:bg-slate-200"><ChevronRight /></button>



           </div>



        </div>



      </section>







      {/* --- CONTACT FORM --- */}



      <section id="contact" className="py-24 px-6 relative">



        <div className="max-w-2xl mx-auto bg-white border border-slate-100 p-8 md:p-12 rounded-[2rem] shadow-2xl">



          <div className="text-center mb-10">



            <h2 className="text-4xl font-extrabold mb-4">Contact Us</h2>



          </div>



          <form className="space-y-6">



            <div className="grid grid-cols-2 gap-4">



              <input type="text" placeholder="First Name" className="w-full p-4 rounded-xl border-2 border-slate-100 outline-none" />



              <input type="text" placeholder="Last Name" className="w-full p-4 rounded-xl border-2 border-slate-100 outline-none" />



            </div>



            <input type="tel" placeholder="Phone Number" className="w-full p-4 rounded-xl border-2 border-slate-100 outline-none" />



            <textarea placeholder="Tell us about your project" rows="4" className="w-full p-4 rounded-xl border-2 border-slate-100 outline-none"></textarea>



            <button type="submit" style={{ backgroundColor: brandColor }} className="w-full py-5 rounded-2xl text-white font-bold text-xl hover:brightness-110 transition">Request Quote</button>



          </form>



        </div>



      </section>


      {/* --- FOOTER --- */}
      <Box component="footer" sx={{ py: 8, bgcolor: "#000000", color: "#FFFFFF", mt: 10 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" spacing={4}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              {logo && <Box component="img" src={logo} alt="Logo" sx={{ height: 60, mb: 2, mx: { xs: "auto", md: "0" } }} />}
              <Typography variant="h6" sx={{ fontWeight: 1000, letterSpacing: 2, textTransform: "uppercase", color: brandColor }}>
                {businessName}
              </Typography>
            </Box>
            <Stack direction="row" spacing={4}>
              <Link onClick={() => setModalContent('privacy')} sx={{ color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, "&:hover": { color: brandColor } }}>PRIVACY</Link>
              <Link onClick={() => setModalContent('terms')} sx={{ color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, "&:hover": { color: brandColor } }}>TERMS</Link>
            </Stack>
          </Stack>
          <Divider sx={{ my: 4, borderColor: "#1A1A1A" }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.2)", display: "block", textAlign: "center" }}>
            © {new Date().getFullYear()} {businessName}. ALL RIGHTS RESERVED.
          </Typography>
        </Container>

        {/* LEGAL MODAL */}
        <Dialog open={Boolean(modalContent)} onClose={() => setModalContent(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#111', color: '#FFF' } }}>
          <DialogTitle>{modalContent === 'privacy' ? 'PRIVACY POLICY' : 'TERMS & CONDITIONS'}</DialogTitle>
          <DialogContent dividers sx={{ borderColor: '#333' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {modalContent === 'privacy' ? `At ${businessName}, we value your privacy and data security.` : `By using ${businessName}, you agree to our standard terms and conditions.`}
            </Typography>
          </DialogContent>
          <DialogActions><Button onClick={() => setModalContent(null)} sx={{ color: brandColor }}>CLOSE</Button></DialogActions>
        </Dialog>
      </Box>
    </div>
  );
};

export default DecoratorTemplate;