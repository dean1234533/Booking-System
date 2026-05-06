import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";

import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

export default function Nav() {
  const { barber } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);

  async function handleSignOut() {
    try {
      await signOut(auth);
      setAnchor(null);
      navigate("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 4 } }}>
        
        {/* Logo */}
        <Box
          component={Link}
          to="/"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            textDecoration: "none",
            color: "text.primary",
          }}
        >
          <ContentCutIcon sx={{ color: "secondary.main", fontSize: 22 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.02em">
            The Cutting Edge
          </Typography>
        </Box>

        {/* User Section */}
        <Box display="flex" alignItems="center" gap={1}>
          {barber ? (
            <>
              <Button
                component={Link}
                to="/dashboard"
                variant="outlined"
                size="small"
                sx={{ borderColor: "divider", color: "text.primary", mr: 1 }}
              >
                Dashboard
              </Button>

              <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: "primary.main",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {barber.displayName?.[0]?.toUpperCase() ?? barber.email?.[0]?.toUpperCase() ?? "B"}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                PaperProps={{ sx: { mt: 1, minWidth: 180, borderRadius: 2 } }}
              >
                <Box px={2} py={1}>
                  <Typography variant="body2" fontWeight={600}>
                    {barber.displayName || "Barber"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {barber.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem component={Link} to="/dashboard" onClick={() => setAnchor(null)}>
                  My Dashboard
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSignOut} sx={{ color: "error.main" }}>
                  Sign Out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              size="small"
              sx={{ borderColor: "divider", color: "text.secondary" }}
            >
              Barber Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}