import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, Typography, Container, Stack, Link, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button 
} from "@mui/material";

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
  
  // Footer branding data
  const logo = barber?.logo || profile?.logo;
  const brandColor = "#ef4444"; // Matching your red theme
  
  const [modalContent, setModalContent] = useState(null);

  return (
    <div className="bg-white text-zinc-900 antialiased font-sans scroll-smooth min-h-screen overflow-x-hidden">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-6 py-4">
          <a href="#" className="font-bold text-lg md:text-xl tracking-tight uppercase truncate">{businessName}</a>
          <div className="flex items-center gap-4">
            <a href="#about" className="hidden md:block text-xs font-bold uppercase hover:text-red-600 transition-colors">About</a>
            <a href="#booking-section" className="rounded-full bg-zinc-900 px-5 py-2 text-[10px] md:text-xs font-bold uppercase text-white hover:bg-red-600 transition-all whitespace-nowrap">Book Now</a>
          </div>
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

      {/* SECTIONS (Trust, About, Video, Reviews, Booking) */}
      <FadeIn>
        <section className="py-12 bg-zinc-50 border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 grid grid-cols-3 gap-4 md:gap-8 text-center">
            <div><div className="text-2xl md:text-3xl font-black text-red-600">100+</div><div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Clients</div></div>
            <div><div className="text-2xl md:text-3xl font-black text-red-600">5.0</div><div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Rating</div></div>
            <div><div className="text-2xl md:text-3xl font-black text-red-600">Pro</div><div className="text-[9px] md:text-xs uppercase font-bold text-zinc-500">Certified</div></div>
          </div>
        </section>
      </FadeIn>

      <FadeIn>
        <section id="about" className="py-20 md:py-32 px-6 bg-white">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 w-full"><img src="https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=800" alt="Trainer" className="rounded-3xl shadow-2xl w-full" /></div>
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Meet Your Coach</h2>
              <p className="text-zinc-600 mb-6">With years of experience in high-performance athletics, I specialize in helping individuals push past their limits.</p>
            </div>
          </div>
        </section>
      </FadeIn>

      <section id="booking-section" className="py-16 md:py-24 px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-8">Claim Your Slot</h2>
          <div className="p-2 border border-zinc-200 rounded-3xl bg-zinc-50 shadow-inner">{bookingWidgetMount}</div>
        </div>
      </section>

      {/* FOOTER */}
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

        <Dialog open={Boolean(modalContent)} onClose={() => setModalContent(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#111', color: '#FFF' } }}>
          <DialogTitle>{modalContent === 'privacy' ? 'PRIVACY POLICY' : 'TERMS & CONDITIONS'}</DialogTitle>
          <DialogContent dividers sx={{ borderColor: '#333' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {modalContent === 'privacy' ? `At ${businessName}, we value your privacy and collect only necessary data.` : `By using ${businessName}, you agree to our standard terms of service.`}
            </Typography>
          </DialogContent>
          <DialogActions><Button onClick={() => setModalContent(null)} sx={{ color: brandColor }}>CLOSE</Button></DialogActions>
        </Dialog>
      </Box>
    </div>
  );
}