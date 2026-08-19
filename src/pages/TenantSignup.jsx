import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Alert, Avatar, Box, Container, Paper, Typography } from "@mui/material";

/**
 * Reached at /signup on a branded tenant domain (App.jsx only renders this
 * when tenantBarber is set — the plain main-site /signup renders Signup.jsx
 * instead). This used to be an open "join this shop as staff" self-registration
 * form; that's retired in favour of owner-issued invite links (Team tab →
 * "Copy invite link"), so this is now just a pointer to the right place.
 */
export default function TenantSignup({ tenant }) {
  const location = useLocation();
  const savedTenant = JSON.parse(localStorage.getItem("active_tenant_branding") || "null");
  const activeTenant = tenant || location.state?.tenant || savedTenant;

  const brandColor = activeTenant?.brandColor || "#2563EB";
  const logo = activeTenant?.businessLogo || activeTenant?.logoUrl || null;
  const businessName = activeTenant?.businessName || "This business";

  return (
    <Box sx={{ bgcolor: "#F8F9FA", minHeight: "100vh", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="sm">
        <Box textAlign="center" mb={4}>
          <Avatar src={logo} sx={{ width: 56, height: 56, mx: "auto", mb: 2, bgcolor: brandColor }}>{businessName[0]}</Avatar>
          <Typography variant="h4" fontWeight={900}>Joining {businessName}?</Typography>
        </Box>

        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 6, borderTop: `6px solid ${brandColor}`, boxShadow: "0 20px 60px rgba(0,0,0,0.05)" }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Team accounts are set up by the business owner, not by signing up here. Ask them to send you an invite link from their dashboard's Team tab.
          </Alert>
          <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>
            Already have an account? <Link to="/login" state={{ tenant: activeTenant }} style={{ color: brandColor, fontWeight: 700, textDecoration: "none" }}>Login here</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
