import React from "react";
import { Box, Typography, Grid, Paper } from "@mui/material";

import EventAvailableIcon        from "@mui/icons-material/EventAvailable";
import AccessTimeIcon             from "@mui/icons-material/AccessTime";
import NotificationsActiveIcon    from "@mui/icons-material/NotificationsActive";
import CalendarMonthIcon          from "@mui/icons-material/CalendarMonth";
import PaymentsIcon               from "@mui/icons-material/Payments";
import SavingsIcon                from "@mui/icons-material/Savings";
import AccountBalanceWalletIcon   from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon            from "@mui/icons-material/ReceiptLong";
import WebIcon                    from "@mui/icons-material/Web";
import LanguageIcon               from "@mui/icons-material/Language";
import ListAltIcon                from "@mui/icons-material/ListAlt";
import PhotoLibraryIcon           from "@mui/icons-material/PhotoLibrary";
import PeopleIcon                 from "@mui/icons-material/People";
import GroupAddIcon               from "@mui/icons-material/GroupAdd";
import StarIcon                   from "@mui/icons-material/Star";
import InstagramIcon              from "@mui/icons-material/Instagram";
import CalculateIcon              from "@mui/icons-material/Calculate";
import UploadFileIcon             from "@mui/icons-material/UploadFile";
import EventNoteIcon              from "@mui/icons-material/EventNote";
import TrendingUpIcon             from "@mui/icons-material/TrendingUp";
import ContentCutIcon             from "@mui/icons-material/ContentCut";
import StorefrontIcon             from "@mui/icons-material/Storefront";
import ReceiptIcon                from "@mui/icons-material/Receipt";

const TOOLKIT = [
  {
    group: "Booking & Calendar",
    groupIcon: ContentCutIcon,
    items: [
      { name: "Online booking system",   tip: "Clients book 24/7 without calling",              icon: EventAvailableIcon },
      { name: "Availability management", tip: "Set your working hours once",                    icon: AccessTimeIcon },
      { name: "Automated reminders",     tip: "Reduce no-shows with SMS/email reminders",       icon: NotificationsActiveIcon },
      { name: "Google Calendar sync",    tip: "Sync with your personal calendar",               icon: CalendarMonthIcon },
    ],
  },
  {
    group: "Payments & Money",
    groupIcon: PaymentsIcon,
    items: [
      { name: "Online payments (Stripe)",      tip: "Accept card payments instantly",           icon: PaymentsIcon },
      { name: "Deposits & partial payments",   tip: "Collect upfront deposits",                 icon: SavingsIcon },
      { name: "Financial dashboard",           tip: "Track income and earnings",                icon: AccountBalanceWalletIcon },
      { name: "Invoice generation",            tip: "Professional invoices for clients",        icon: ReceiptLongIcon },
    ],
  },
  {
    group: "Website & Branding",
    groupIcon: StorefrontIcon,
    items: [
      { name: "Custom branded website", tip: "Your own business site with logo & colors",      icon: WebIcon },
      { name: "Custom domain",          tip: "Own domain (salon.com) or use yours",            icon: LanguageIcon },
      { name: "Service showcase",       tip: "Display services, prices, and styles",           icon: ListAltIcon },
      { name: "Portfolio photos",       tip: "Show before/after transformations",              icon: PhotoLibraryIcon },
    ],
  },
  {
    group: "Business Tools",
    groupIcon: PeopleIcon,
    items: [
      { name: "Client database",    tip: "Store client info and preferences",                  icon: PeopleIcon },
      { name: "Team management",    tip: "Add stylists to dashboard",                          icon: GroupAddIcon },
      { name: "Review management",  tip: "Display and manage client reviews",                  icon: StarIcon },
      { name: "Social media links", tip: "Link Instagram, TikTok, Pinterest",                 icon: InstagramIcon },
    ],
  },
  {
    group: "Tax & Finance",
    groupIcon: ReceiptIcon,
    items: [
      { name: "Income & expense tracking", tip: "Log all business income and expenses",        icon: TrendingUpIcon },
      { name: "Auto-calculated taxes",     tip: "UK self-employment tax calculations",         icon: CalculateIcon },
      { name: "Invoice storage",           tip: "Upload and organize business invoices",       icon: UploadFileIcon },
      { name: "Quarterly tax planning",    tip: "See Self-Assessment payment schedules",       icon: EventNoteIcon },
    ],
  },
];

export default function HairdresserToolkitTab({ brandColor = "#C9A84C" }) {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ color: "#1a1a1a", fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.2 }}>
          Your Salon Toolkit
        </Typography>
        <Typography sx={{ color: "rgba(0,0,0,0.5)", fontSize: "0.8rem", mt: 0.5 }}>
          Everything included in your salon platform — all in one dashboard.
        </Typography>
      </Box>

      {TOOLKIT.map((section) => {
        const GroupIcon = section.groupIcon;
        return (
          <Box key={section.group} sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 0, bgcolor: `${brandColor}1f` }}>
                <GroupIcon sx={{ fontSize: 18, color: brandColor }} />
              </Box>
              <Typography sx={{ color: "#1a1a1a", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {section.group}
              </Typography>
            </Box>

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
