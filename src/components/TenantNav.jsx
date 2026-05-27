import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  AppBar, Toolbar, Typography, Box, IconButton, 
  Menu, MenuItem, Avatar, Button, Container, Divider 
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

function contrastColor(hex) {
  if (!hex || !hex.startsWith("#")) return "#111111";
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111111" : "#ffffff";
}

export default function TenantNav({ tenant }) {
  const { barber } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  const brandColor  = tenant?.brandColor  || "#C9A84C";
  const navBg       = tenant?.navBgColor  || "#ffffff";
  const navText     = contrastColor(navBg);
  const businessName = (tenant?.businessName || "PREMIUM BARBER SHOP").toUpperCase();
  const logo = tenant?.businessLogo || tenant?.logoUrl;

  const getShopRedirectId = () => {
    return tenant?.shopId || tenant?.id || tenant?.uid;
  };

  const shopRouteId = getShopRedirectId();

  async function handleSignOut() {
    try {
      await signOut(auth);
      setAnchor(null);
      navigate("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  const scrollToBarbers = () => {
    const section = document.getElementById("barber-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(`/shop/${shopRouteId}`);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: navBg,
        backdropFilter: "blur(15px) saturate(160%)",
        borderBottom: `1px solid ${navText === "#111111" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
        color: navText,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: "all 0.3s ease"
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: "space-between", height: { xs: 80, sm: 100 } }}>
          
          <Box 
            component={Link} 
            to={`/shop/${shopRouteId}`} 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 2, 
              textDecoration: "none", 
              color: "inherit",
              "&:hover": { opacity: 0.8 }
            }}
          >
            {logo ? (
              <Avatar 
                src={logo} 
                variant="square"
                // imgProps ensures the underlying <img> tag scales correctly
                imgProps={{
                  style: { 
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%'
                  }
                }}
                sx={{ 
                  width: { xs: 50, sm: 65 }, // Increased size significantly
                  height: { xs: 50, sm: 65 }, 
                  borderRadius: '4px',
                  border: `1px solid ${brandColor}33`, // Subtle border
                  bgcolor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} 
              />
            ) : (
              <Box 
                sx={{ 
                  width: { xs: 50, sm: 60 }, 
                  height: { xs: 50, sm: 60 }, 
                  borderRadius: '4px', 
                  bgcolor: "#111", 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: brandColor
                }}
              >
                <ContentCutIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
              </Box>
            )}
            
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 1000,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                  fontSize: { xs: '1rem', sm: '1.4rem' },
                  fontFamily: "'Playfair Display', serif",
                  color: navText,
                }}
              >
                {businessName}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            {barber ? (
              <>
                <Button
                  component={Link}
                  to="/dashboard"
                  variant="text"
                  sx={{
                    color: navText,
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    letterSpacing: '1px',
                    display: { xs: 'none', md: 'inline-flex' },
                    "&:hover": { bgcolor: "transparent", color: brandColor }
                  }}
                >
                  DASHBOARD
                </Button>

                <IconButton 
                  onClick={(e) => setAnchor(e.currentTarget)}
                  sx={{ p: 0.5, border: `1px solid rgba(0,0,0,0.1)` }}
                >
                  <Avatar 
                    src={barber.profilePic} 
                    sx={{ width: 42, height: 42, bgcolor: brandColor, fontSize: '0.9rem', fontWeight: 900 }}
                  >
                    {barber.name?.[0] || barber.displayName?.[0]}
                  </Avatar>
                </IconButton>

                <Menu 
                  anchorEl={anchor} 
                  open={Boolean(anchor)} 
                  onClose={() => setAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    sx: { 
                      mt: 1.5, 
                      borderRadius: '4px', 
                      minWidth: 220, 
                      border: '1px solid #eee',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={900} sx={{ color: navText }}>
                      {barber.name || barber.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {barber.role === 'admin' ? 'Shop Owner' : 'Staff Member'}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem component={Link} to="/dashboard" sx={{ fontSize: '0.85rem', fontWeight: 700, py: 1.5 }}>
                    <DashboardIcon sx={{ mr: 1.5, fontSize: 18 }} /> Dashboard
                  </MenuItem>
                  <MenuItem onClick={handleSignOut} sx={{ fontSize: '0.85rem', fontWeight: 700, py: 1.5, color: 'error.main' }}>
                    <LogoutIcon sx={{ mr: 1.5, fontSize: 18 }} /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={scrollToBarbers}
                startIcon={<CalendarMonthIcon sx={{ fontSize: 18 }} />}
                sx={{
                  bgcolor: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  borderRadius: "2px",
                  px: { xs: 2, sm: 4 },
                  py: 1.2,
                  fontSize: '0.75rem',
                  letterSpacing: '1px',
                  boxShadow: 'none',
                  "&:hover": { bgcolor: brandColor, boxShadow: 'none' }
                }}
              >
                BOOK NOW
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}