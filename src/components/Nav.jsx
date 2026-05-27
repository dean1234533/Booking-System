import React, { useState } from "react";
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, IconButton,
  useScrollTrigger, Slide, Stack, Drawer, List, ListItem, 
  ListItemButton, ListItemText, Divider, useTheme
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

function HideOnScroll(props) {
  const { children } = props;
  const trigger = useScrollTrigger();
  return <Slide appear={false} direction="down" in={!trigger}>{children}</Slide>;
}

export default function HomeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoPath = "/images/Logo.png";
  const platformName = "BOOK-EH-TRIM";
  const brandColor = "#C9A84C";

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const isAbsoluteHome = location.pathname === "/";

  const scrollToMarketplace = () => {
    const element = document.getElementById('browse-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate("/");
    }
    setMobileOpen(false);
  };

  return (
    <>
      <HideOnScroll>
        <AppBar 
          position="fixed" 
          elevation={0}
          sx={{ 
            bgcolor: "rgba(0, 0, 0, 0.8)", 
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            zIndex: 1200 
          }}
        >
          <Container maxWidth="lg">
            <Toolbar sx={{ justifyContent: "space-between", py: 1 }}>
              
              {/* LOGO AREA */}
              <Box 
                onClick={() => isAbsoluteHome ? window.scrollTo({ top: 0, behavior: 'smooth' }) : navigate("/")}
                sx={{ cursor: "pointer", display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Box component="img" src={logoPath} alt="Logo" sx={{ height: { xs: 40, md: 50 }, width: 'auto' }} />
                <Typography sx={{ 
                  fontWeight: 800, letterSpacing: 1.5, color: "#FFF", 
                  fontSize: { xs: '0.9rem', md: '1.2rem' }, textTransform: 'uppercase' 
                }}>
                  {platformName}
                </Typography>
              </Box>

              {/* DESKTOP NAV */}
              <Stack direction="row" spacing={3} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Button onClick={() => navigate("/login")} sx={{ color: "#FFF", fontWeight: 600, fontSize: '0.85rem', '&:hover': { color: brandColor } }}>
                  LOGIN
                </Button>
                <Button 
                  variant="outlined"
                  onClick={scrollToMarketplace}
                  sx={{ 
                    borderColor: brandColor, color: brandColor, fontWeight: 700, 
                    borderRadius: '50px', px: 3, py: 0.8, fontSize: '0.8rem',
                    '&:hover': { bgcolor: brandColor, color: '#000', borderColor: brandColor } 
                  }}
                >
                  BROWSE SERVICES
                </Button>
              </Stack>

              <IconButton onClick={handleDrawerToggle} sx={{ color: "#FFF", display: { md: 'none' } }}>
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>
      </HideOnScroll>

      {/* DRAWER */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        PaperProps={{ sx: { width: '100%', maxWidth: 300, bgcolor: "#050505" } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <IconButton onClick={handleDrawerToggle} sx={{ color: "#FFF", alignSelf: 'flex-end', mb: 2 }}>
            <CloseIcon />
          </IconButton>
          <List sx={{ mt: 2 }}>
            {['LOGIN', 'BROWSE SERVICES'].map((text) => (
              <ListItem key={text} disablePadding sx={{ mb: 2 }}>
                <ListItemButton 
                  onClick={() => text === 'LOGIN' ? navigate('/login') : scrollToMarketplace()}
                  sx={{ borderRadius: 2, border: text === 'BROWSE SERVICES' ? `1px solid ${brandColor}` : 'none' }}
                >
                  <ListItemText 
                    primary={text} 
                    primaryTypographyProps={{ 
                      textAlign: 'center', color: text === 'BROWSE SERVICES' ? brandColor : '#FFF', fontWeight: 800 
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}