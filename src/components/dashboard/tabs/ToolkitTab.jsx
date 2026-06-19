import React from "react";
import { Box, Typography, Grid, Paper } from "@mui/material";

import PersonIcon              from "@mui/icons-material/Person";
import ChatIcon                from "@mui/icons-material/Chat";
import WhatsAppIcon            from "@mui/icons-material/WhatsApp";
import MicIcon                 from "@mui/icons-material/Mic";
import FitnessCenterIcon       from "@mui/icons-material/FitnessCenter";
import VideoLibraryIcon        from "@mui/icons-material/VideoLibrary";
import TrendingUpIcon          from "@mui/icons-material/TrendingUp";
import DirectionsRunIcon       from "@mui/icons-material/DirectionsRun";
import RestaurantMenuIcon      from "@mui/icons-material/RestaurantMenu";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AssignmentIcon          from "@mui/icons-material/Assignment";
import AutoAwesomeIcon         from "@mui/icons-material/AutoAwesome";
import WebIcon                 from "@mui/icons-material/Web";
import EventAvailableIcon      from "@mui/icons-material/EventAvailable";
import LanguageIcon            from "@mui/icons-material/Language";
import PaymentsIcon            from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalculateIcon           from "@mui/icons-material/Calculate";
import ReceiptLongIcon         from "@mui/icons-material/ReceiptLong";
import EventNoteIcon           from "@mui/icons-material/EventNote";
import PeopleIcon              from "@mui/icons-material/People";
import RestaurantIcon          from "@mui/icons-material/Restaurant";
import StorefrontIcon          from "@mui/icons-material/Storefront";
import ReceiptIcon             from "@mui/icons-material/Receipt";

// ── Toolkit feature groups (mirrors the public Features modal) ────────────────
const TOOLKIT = [
  {
    group: "Client Management",
    groupIcon: PeopleIcon,
    items: [
      { name: "Client profiles",       tip: "Complete client records in one place",     icon: PersonIcon },
      { name: "Real-time chat",         tip: "Message clients within the app",           icon: ChatIcon },
      { name: "WhatsApp integration",   tip: "Direct link to client WhatsApp",           icon: WhatsAppIcon },
      { name: "Voice consultations",    tip: "Record and transcribe session notes",      icon: MicIcon },
    ],
  },
  {
    group: "Training Programs",
    groupIcon: FitnessCenterIcon,
    items: [
      { name: "Workout plans",          tip: "Create custom workout routines",           icon: FitnessCenterIcon },
      { name: "Exercise library",       tip: "500+ exercises with demo videos",          icon: VideoLibraryIcon },
      { name: "Progress tracking",      tip: "Charts show client progress over time",    icon: TrendingUpIcon },
      { name: "Activity logging",       tip: "Clients log workouts and track activity",  icon: DirectionsRunIcon },
    ],
  },
  {
    group: "Nutrition & Coaching",
    groupIcon: RestaurantIcon,
    items: [
      { name: "Nutrition planning",     tip: "Build meal plans with 1000+ foods",        icon: RestaurantMenuIcon },
      { name: "Automated reminders",    tip: "Send monthly check-ins & reminders",       icon: NotificationsActiveIcon },
      { name: "Client forms",           tip: "PAR-Q forms, check-ins, assessments",      icon: AssignmentIcon },
      { name: "Food generator",         tip: "AI meal plan suggestions",                 icon: AutoAwesomeIcon },
    ],
  },
  {
    group: "Website & Business",
    groupIcon: StorefrontIcon,
    items: [
      { name: "Custom branded website", tip: "Your own PT coaching site",                icon: WebIcon },
      { name: "Online booking",         tip: "Clients book sessions directly",           icon: EventAvailableIcon },
      { name: "Custom domain",          tip: "Own domain (yourtraining.com)",            icon: LanguageIcon },
      { name: "Payments (Stripe)",      tip: "Accept online payments for sessions",      icon: PaymentsIcon },
    ],
  },
  {
    group: "Tax & Finance",
    groupIcon: ReceiptIcon,
    items: [
      { name: "Income & expense tracking", tip: "Log all business income and expenses",  icon: AccountBalanceWalletIcon },
      { name: "Auto-calculated taxes",     tip: "UK self-employment tax calculations",   icon: CalculateIcon },
      { name: "Invoice storage",           tip: "Upload and organize business invoices", icon: ReceiptLongIcon },
      { name: "Quarterly tax planning",    tip: "See Self-Assessment payment schedules", icon: EventNoteIcon },
    ],
  },
];

export default function ToolkitTab({ brandColor = "#C9A84C" }) {
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: "#1a1a1a", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.2 }}>
          Your PT Toolkit
        </Typography>
        <Typography sx={{ color: "rgba(0,0,0,0.5)", fontSize: "0.8rem", mt: 0.5 }}>
          Everything included in your coaching platform — all in one dashboard.
        </Typography>
      </Box>

      {TOOLKIT.map((section) => {
        const GroupIcon = section.groupIcon;
        return (
          <Box key={section.group} sx={{ mb: 4 }}>
            {/* Section heading */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 0, bgcolor: `${brandColor}1f` }}>
                <GroupIcon sx={{ fontSize: 18, color: brandColor }} />
              </Box>
              <Typography sx={{ color: "#1a1a1a", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {section.group}
              </Typography>
            </Box>

            {/* Feature cards */}
            <Grid container spacing={1.5}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={item.name}>
                    <Paper
                      sx={{
                        height: "100%",
                        p: 2,
                        bgcolor: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 0,
                        transition: "border-color .2s",
                        "&:hover": { borderColor: `${brandColor}55` },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Icon sx={{ fontSize: 18, color: brandColor }} />
                        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>
                          {item.name}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                        {item.tip}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}
