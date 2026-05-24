import React, { useState } from "react";
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Box, 
  IconButton,
  useScrollTrigger,
  Slide,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

function HideOnScroll(props) {
  const { children } = props;
  const trigger = useScrollTrigger();

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

export default function HomeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoPath = "/images/Logo.png";
  const platformName = "BOOK-EH-TRIM";
  const brandColor = "#C9A84C";

  // Dynamic label helper to keep the Nav sync'd with marketplace context
  const getActionLabel = () => {
    return "BROWSE SERVICES"; // Generic enough for Barbers, Decorators, and Trainers
  };

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const isAbsoluteHome = location.pathname === "/";

  const scrollToMarketplace = () => {
    const element = document.getElementById('barber-selection'); // Keep ID for backward compatibility
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    } else {
      navigate("/");
    }
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ textAlign: 'center', p: 2, bgcolor: "#000", height: "100%", color: "#FFF" }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={handleDrawerToggle} sx={{ color: "#FFF" }}>
             <CloseIcon />
          </IconButton>
      </Box>
      
      <Box 
        component="img"
        src={logoPath}
        alt="Logo"
        sx={{ height: 60, width: 'auto', mb: 1, mx: 'auto', display: 'block', filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.5))' }}
      />
      
      <Typography variant="h6" sx={{ my: 2, fontWeight: 1000, letterSpacing: 2 }}>
        {platformName}
      </Typography>
      <Divider sx={{ borderColor: "#2D2D2D" }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => { navigate("/login"); setMobileOpen(false); }} sx={{ textAlign: 'center' }}>
            <ListItemText primary="LOGIN" primaryTypographyProps={{ fontWeight: 700 }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={scrollToMarketplace}
            sx={{ 
              textAlign: 'center', bgcolor: brandColor, color: "#000", mx: 2, borderRadius: 1, mt: 2,
              '&:hover': { bgcolor: "#FFF" }
            }}
          >
            <ListItemText primary={getActionLabel()} primaryTypographyProps={{ fontWeight: 900 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <HideOnScroll>
        <AppBar 
          position="fixed" 
          sx={{ bgcolor: "rgba(0, 0, 0, 0.95)", backdropFilter: "blur(10px)", borderBottom: "none", boxShadow: "none", zIndex: 1200 }}
        >
          <Container maxWidth="lg">
            <Toolbar sx={{ justifyContent: "space-between", py: { xs: 1, md: 2 } }}>
              
              <Box 
                onClick={() => isAbsoluteHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate("/")}
                sx={{ cursor: "pointer", display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}
              >
                <Box 
                  component="img"
                  src={logoPath}
                  alt="Logo"
                  sx={{ 
                    height: { xs: 45, sm: 60, md: 75 }, width: 'auto', objectFit: 'contain',
                    transition: 'transform 0.3s ease', '&:hover': { transform: 'scale(1.05)' }
                  }}
                />
                <Typography 
                  variant="h6" 
                  sx={{ fontWeight: 1000, letterSpacing: { xs: 1, sm: 2 }, color: "#FFF", fontSize: { xs: '0.75rem', sm: '1.1rem', md: '1.4rem' }, textTransform: 'uppercase' }}
                >
                  {platformName}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button onClick={() => navigate("/login")} sx={{ color: "#FFF", fontWeight: 700 }}>
                  LOGIN
                </Button>
                <Button 
                  variant="contained"
                  onClick={scrollToMarketplace}
                  sx={{ bgcolor: brandColor, color: "#000", fontWeight: 900, px: 3, '&:hover': { bgcolor: "#FFF" } }}
                >
                  {getActionLabel()}
                </Button>
              </Stack>

              <IconButton onClick={handleDrawerToggle} sx={{ color: "#FFF", display: { md: 'none' } }}>
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>
      </HideOnScroll>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: '80%', maxWidth: 300, bgcolor: "#000" } }}
      >
        {drawer}
      </Drawer>
    </>
  );
}