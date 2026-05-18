import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  Container, 
  Stack, 
  Link, 
  Divider, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button 
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  
  // State for Modals
  const [modalContent, setModalContent] = useState(null);

  // --- MARKETPLACE BRANDING ---
  const businessName = "BOOK-EH-TRIM";
  const brandColor = "#C9A84C"; 

  const handleOpenModal = (type) => {
    setModalContent(type);
  };

  const handleCloseModal = () => {
    setModalContent(null);
  };

  return (
    <Box 
      component="footer" 
      sx={{ 
        py: { xs: 8, md: 10 }, 
        bgcolor: "#000000", 
        borderTop: "1px solid #1A1A1A", 
        mt: 'auto',
        color: "#FFFFFF"
      }}
    >
      <Container maxWidth="lg">
        <Stack 
          direction={{ xs: "column", md: "row" }} 
          justifyContent="space-between" 
          alignItems={{ xs: "center", md: "flex-end" }} 
          spacing={4}
        >
          {/* LEFT: BRANDING */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            {/* LOGO ADDED HERE */}
            <Box 
              component="img"
              src="/images/Logo.png"
              alt={`${businessName} Logo`}
              sx={{ 
                height: 60, 
                mb: 2, 
                display: "block", 
                mx: { xs: "auto", md: "0" } 
              }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 1000, 
                letterSpacing: 4, 
                mb: 1,
                textTransform: "uppercase",
                background: `linear-gradient(45deg, #FFFFFF 30%, ${brandColor} 90%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {businessName}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: "rgba(255,255,255,0.4)", 
                fontWeight: 500,
                letterSpacing: 1,
                display: "block",
                maxWidth: { xs: "100%", md: "300px" }
              }}
            >
              The UK's premium grooming marketplace. Connecting master barbers with clients who value quality.
            </Typography>
          </Box>
          
          {/* RIGHT: NAVIGATION LINKS */}
          <Stack 
            direction="row" 
            spacing={{ xs: 3, sm: 6 }} 
            sx={{ 
              pt: { xs: 2, md: 0 },
              borderTop: { xs: "1px solid #1A1A1A", md: "none" },
              width: { xs: "100%", md: "auto" },
              justifyContent: "center"
            }}
          >
            <Link
              onClick={() => navigate("/login")}
              sx={{ 
                color: "rgba(255,255,255,0.6)", 
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: 1.5,
                textDecoration: "none",
                "&:hover": { color: brandColor } 
              }}
            >
              BARBER LOGIN
            </Link>
            
            <Link
              onClick={() => navigate("/signup")}
              sx={{ 
                color: "rgba(255,255,255,0.6)", 
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: 1.5,
                textDecoration: "none",
                "&:hover": { color: "#FFF" } 
              }}
            >
              JOIN THE NETWORK
            </Link>
          </Stack>
        </Stack>

        <Divider sx={{ my: 4, borderColor: "#1A1A1A" }} />

        <Box 
          sx={{ 
            display: "flex", 
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", letterSpacing: 1 }}
          >
            © 2026 BOOK-EH-TRIM MARKETPLACE.
          </Typography>
          
          <Stack direction="row" spacing={3}>
             <Typography 
               variant="caption" 
               onClick={() => handleOpenModal('privacy')}
               sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", cursor: "pointer", "&:hover": { color: "#FFF"} }}
             >
               PRIVACY
             </Typography>
             <Typography 
               variant="caption" 
               onClick={() => handleOpenModal('terms')}
               sx={{ color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", cursor: "pointer", "&:hover": { color: "#FFF"} }}
             >
               TERMS
             </Typography>
          </Stack>
        </Box>
      </Container>

      {/* LEGAL MODAL */}
      <Dialog 
        open={Boolean(modalContent)} 
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: '#111', color: '#FFF', border: '1px solid #333' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, letterSpacing: 1 }}>
          {modalContent === 'privacy' ? 'PRIVACY POLICY' : 'TERMS & CONDITIONS'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#333' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            {modalContent === 'privacy' ? (
              <>
                At {businessName}, we value your privacy. We collect minimal data required to facilitate 
                barber bookings, including your name and contact details. We do not sell your data 
                to third parties. Your payment information is handled securely by Stripe.
              </>
            ) : (
              <>
              
               By using {businessName}, you agree to our booking terms. Cancellations must be made within the barber's specified timeframe. 
               {businessName} is a marketplace and is not liable for the direct actions of independent barbers using the platform.
               Refunds: If you cancel with more than 24 hours notice, you will receive a full refund of your deposit to your original payment method — any service charges will be covered by the barber. 
               The booking fee is non-refundable. Cancellations made with less than 24 hours notice are non-refundable.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} sx={{ color: brandColor, fontWeight: 700 }}>
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}