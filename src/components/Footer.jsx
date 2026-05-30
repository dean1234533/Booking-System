import React, { useState } from "react";
import { 
  Box, Typography, Container, Stack, Link, Divider, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button 
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  const [modalContent, setModalContent] = useState(null);

  // Using the same branding tokens from your theme
  const businessName = "Bookrty";
  const G = { gold: "#C9A84C", dark: "#0d0d0d", dark2: "#1a1a1a" };

  const handleOpenModal = (type) => setModalContent(type);
  const handleCloseModal = () => setModalContent(null);

  return (
    <Box component="footer" sx={{ py: 8, bgcolor: G.dark, borderTop: "1px solid #1A1A1A", color: "#FFF" }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" spacing={4}>
          
          {/* BRANDING */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", color: "#FFF" }}>
              {businessName}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mt: 0.5 }}>
              The UK's premium service marketplace.
            </Typography>
          </Box>
          
          {/* NAVIGATION */}
          <Stack direction="row" spacing={4}>
            <Link onClick={() => navigate("/login")} sx={{ color: "#FFF", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", "&:hover": { color: G.gold } }}>
              LOGIN
            </Link>
            <Link onClick={() => navigate("/signup")} sx={{ color: "#FFF", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", "&:hover": { color: G.gold } }}>
              JOIN THE NETWORK
            </Link>
          </Stack>
        </Stack>

        <Divider sx={{ my: 4, borderColor: "#1A1A1A" }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
            © 2026 {businessName}.
          </Typography>
          <Stack direction="row" spacing={3}>
            {['Privacy', 'Terms'].map((item) => (
              <Typography 
                key={item} variant="caption" onClick={() => handleOpenModal(item.toLowerCase())}
                sx={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", "&:hover": { color: "#FFF" } }}
              >
                {item.toUpperCase()}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Container>

      {/* MODAL */}
      <Dialog open={Boolean(modalContent)} onClose={handleCloseModal} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: G.dark2, color: '#FFF' } }}>
        <DialogTitle sx={{ fontWeight: 900, color: G.gold }}>{modalContent?.toUpperCase()}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#333' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line' }}>
            {modalContent === 'privacy' 
              ? "At Bookrty, we prioritize your data security. We collect minimal information strictly for service matching and booking facilitation. We do not sell user data to third parties."
              : "1. Liability: Bookrty is a technology provider, not a party to service contracts.\n\n2. Refunds: Deposits are refundable per the individual professional's policy; booking fees are non-refundable.\n\n3. Domains: All custom domain purchases are final."
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} sx={{ color: G.gold }}>CLOSE</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}