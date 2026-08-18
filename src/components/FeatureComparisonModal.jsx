import React from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowForward, Check, Close } from "@mui/icons-material";

const BUSINESS_FEATURES = {
  barber: {
    name: "Barbers",
    icon: "✂️",
    color: "#2563EB",
    bgColor: "#EAF2FF",
    features: [
      {
        category: "Booking & Calendar",
        items: [
          { name: "Online booking system", included: true, benefit: "Clients book 24/7 without calling" },
          { name: "Availability management", included: true, benefit: "Set your working hours once, block off time" },
          { name: "Automated email reminders", included: true, benefit: "Reduce no-shows with automatic booking reminders" },
          { name: "Live queue management", included: true, benefit: "Shareable queue link — clients join and wait in real time" },
        ],
      },
      {
        category: "Payments & Money",
        items: [
          { name: "Online payments (Stripe)", included: true, benefit: "Accept card payments instantly at checkout" },
          { name: "Deposits & partial payments", included: true, benefit: "Collect upfront deposits to secure bookings" },
          { name: "Financial dashboard", included: true, benefit: "Overview of all income and recent transactions" },
          { name: "Invoice generation", included: true, benefit: "Professional PDF invoices sent to clients" },
        ],
      },
      {
        category: "Website & Branding",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own booking site with logo and brand colours" },
          { name: "Staff profile pages", included: true, benefit: "Individual pages per barber with personal social links" },
          { name: "Service & price showcase", included: true, benefit: "Display all services with descriptions and prices" },
          { name: "Reviews page", included: true, benefit: "Collect and display client reviews publicly" },
        ],
      },
      {
        category: "Business Tools",
        items: [
          { name: "Client database", included: true, benefit: "Full history of every client's bookings" },
          { name: "Staff accounts & management", included: true, benefit: "Add team members with their own logins" },
          { name: "WhatsApp support button", included: true, benefit: "One-tap WhatsApp contact from your dashboard" },
          { name: "Business & staff social links", included: true, benefit: "Link Instagram, TikTok, Facebook per staff member" },
        ],
      },
    ],
  },
  hairdresser: {
    name: "Hairdressers",
    icon: "💇",
    color: "#7c4e8a",
    bgColor: "#f5e8f5",
    features: [
      {
        category: "Booking & Calendar",
        items: [
          { name: "Online booking system", included: true, benefit: "Clients book 24/7 without calling" },
          { name: "Availability management", included: true, benefit: "Set working hours and block off time easily" },
          { name: "Automated email reminders", included: true, benefit: "Reduce no-shows with automatic booking reminders" },
          { name: "Cancellation handling", included: true, benefit: "Clients cancel online and you're notified instantly" },
        ],
      },
      {
        category: "Payments & Money",
        items: [
          { name: "Online payments (Stripe)", included: true, benefit: "Accept card payments at the point of booking" },
          { name: "Deposits & partial payments", included: true, benefit: "Protect your time by collecting upfront deposits" },
          { name: "Financial dashboard", included: true, benefit: "All income tracked in one place" },
          { name: "Invoice generation", included: true, benefit: "Professional PDF invoices for clients" },
        ],
      },
      {
        category: "Website & Branding",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own salon site with logo and brand colours" },
          { name: "Service & price showcase", included: true, benefit: "List all services with descriptions and prices" },
          { name: "Portfolio & gallery", included: true, benefit: "Show your best work and transformations" },
          { name: "Reviews page", included: true, benefit: "Collect and display verified client reviews" },
        ],
      },
      {
        category: "Business Tools",
        items: [
          { name: "Client database", included: true, benefit: "Complete record of every client and their visits" },
          { name: "Staff accounts & management", included: true, benefit: "Add stylists with their own dashboard logins" },
          { name: "WhatsApp support button", included: true, benefit: "One-tap WhatsApp contact from your dashboard" },
          { name: "Social media links", included: true, benefit: "Link Instagram, TikTok, Facebook on your site" },
        ],
      },
    ],
  },
  decorator: {
    name: "Decorators",
    icon: "🎨",
    color: "#7a3520",
    bgColor: "#f5e8e3",
    features: [
      {
        category: "Booking & Projects",
        items: [
          { name: "Online booking", included: true, benefit: "Clients book consultations and site visits 24/7" },
          { name: "Quote generator with shareable link", included: true, benefit: "Build and send professional quotes — clients view online" },
          { name: "Colour approval tool", included: true, benefit: "Send colour palettes for client sign-off via link" },
          { name: "Day planner", included: true, benefit: "Schedule site visits and jobs with a daily timeline" },
        ],
      },
      {
        category: "Payments & Money",
        items: [
          { name: "Online payments (Stripe)", included: true, benefit: "Accept deposits and milestone payments online" },
          { name: "Deposits & staged payments", included: true, benefit: "Collect upfront and phase payments per project" },
          { name: "Financial dashboard", included: true, benefit: "All project income tracked in one place" },
          { name: "Invoice generation", included: true, benefit: "Professional PDF invoices for every project" },
        ],
      },
      {
        category: "Website & Portfolio",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own decorator site with logo and brand colours" },
          { name: "Portfolio gallery", included: true, benefit: "Showcase completed rooms and projects" },
          { name: "Reviews page", included: true, benefit: "Collect and display verified client reviews" },
          { name: "Social media links", included: true, benefit: "Link Instagram, Pinterest, Facebook on your site" },
        ],
      },
      {
        category: "Business Tools",
        items: [
          { name: "Client database", included: true, benefit: "Full project history per client" },
          { name: "Multiple project management", included: true, benefit: "Manage quotes and jobs for multiple clients at once" },
          { name: "WhatsApp support button", included: true, benefit: "One-tap WhatsApp contact from your dashboard" },
          { name: "Automated email notifications", included: true, benefit: "Booking and cancellation emails sent automatically" },
        ],
      },
    ],
  },
  trainer: {
    name: "Personal Trainers",
    icon: "💪",
    color: "#3d2c0e",
    bgColor: "#EAF2FF",
    features: [
      {
        category: "Client Management",
        items: [
          { name: "Client profiles & portal", included: true, benefit: "Each client has their own private portal with forms and plans" },
          { name: "PAR-Q & check-in forms", included: true, benefit: "Digital health screening and check-in forms per client" },
          { name: "Food diary tracking", included: true, benefit: "Clients log daily food intake, you review it in the dashboard" },
          { name: "Voice consultation notes", included: true, benefit: "Record voice notes from sessions, auto-transcribed" },
        ],
      },
      {
        category: "Training Programs",
        items: [
          { name: "Workout plan builder", included: true, benefit: "Create fully custom workout plans per client" },
          { name: "Shareable workout links", included: true, benefit: "Clients view their plans on any device without an app" },
          { name: "Progress & activity tracking", included: true, benefit: "Log and chart client progress over time" },
          { name: "Schedule management", included: true, benefit: "Manage session schedules per client from the dashboard" },
        ],
      },
      {
        category: "Nutrition & Coaching",
        items: [
          { name: "Food generator", included: true, benefit: "Generate personalised meal plans from a curated food database" },
          { name: "Nutrition planning", included: true, benefit: "Build macro-tracked meal plans for clients" },
          { name: "Automated email reminders", included: true, benefit: "Send check-in reminders and session confirmations" },
          { name: "Consultation notes", included: true, benefit: "Store and review consultation history per client" },
        ],
      },
      {
        category: "Website & Business",
        items: [
          { name: "Custom PT booking site", included: true, benefit: "Your own site where clients book sessions directly" },
          { name: "Online payments (Stripe)", included: true, benefit: "Accept session payments online at point of booking" },
          { name: "Reviews page", included: true, benefit: "Collect and display verified client testimonials" },
          { name: "WhatsApp support button", included: true, benefit: "One-tap WhatsApp contact from your dashboard" },
        ],
      },
    ],
  },
};

export default function FeatureComparisonModal({ open, onClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedType, setSelectedType] = React.useState("barber");
  const businessTypes = ["barber", "hairdresser", "decorator", "trainer"];
  const currentBusiness = BUSINESS_FEATURES[selectedType];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 6,
          bgcolor: "#f4f1e9",
          overflow: "hidden",
          minHeight: isMobile ? "100%" : "min(820px, 90vh)",
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "300px 1fr" } }}>
        <Box sx={{ bgcolor: "#101116", color: "#fff", p: { xs: 2.5, md: 4 }, position: "relative" }}>
          <IconButton onClick={onClose} sx={{ position: "absolute", right: 18, top: 18, color: "#fff", border: "1px solid #ffffff33" }}><Close /></IconButton>
          <Typography sx={{ color: "#9da6ff", fontSize: ".68rem", fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase" }}>Compare by trade</Typography>
          <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: { xs: "2rem", md: "2.8rem" }, lineHeight: 1.02, mt: 2, maxWidth: 230 }}>Built around how you work.</Typography>
          <Typography sx={{ color: "#ffffff99", fontSize: ".8rem", lineHeight: 1.7, mt: 2, mb: 4 }}>Choose your business to see the tools shaped for your day—not a generic software checklist.</Typography>
          <Stack spacing={1} direction={{ xs: "row", md: "column" }} sx={{ overflowX: "auto", pb: 1 }}>
            {businessTypes.map((type, index) => {
              const item = BUSINESS_FEATURES[type];
              const active = selectedType === type;
              return <Button key={type} onClick={() => setSelectedType(type)} sx={{ minWidth: { xs: 170, md: 0 }, justifyContent: "space-between", px: 2, py: 1.5, borderRadius: 3, color: active ? "#101116" : "#fff", bgcolor: active ? "#93C5FD" : "#ffffff0b", border: "1px solid", borderColor: active ? "#93C5FD" : "#ffffff18", "&:hover": { bgcolor: active ? "#93C5FD" : "#ffffff16" } }}>
                <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1.25 }}><Box component="span" sx={{ fontSize: 20 }}>{item.icon}</Box><Box component="span" sx={{ fontWeight: 850, textTransform: "none" }}>{item.name}</Box></Box>
                <Typography component="span" sx={{ fontSize: ".65rem", opacity: .6 }}>0{index + 1}</Typography>
              </Button>;
            })}
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2.5, sm: 4, md: 5 }, overflowY: "auto" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start", mb: 4 }}>
            <Box>
              <Typography sx={{ color: currentBusiness.color, fontWeight: 900, fontSize: ".7rem", letterSpacing: ".13em", textTransform: "uppercase" }}>16 purpose-built tools</Typography>
              <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: { xs: "2rem", md: "3.1rem" }, lineHeight: 1.05, mt: 1 }}>{currentBusiness.name}, covered.</Typography>
            </Box>
            <Box sx={{ width: 64, height: 64, borderRadius: "20px 20px 20px 4px", bgcolor: currentBusiness.bgColor, display: { xs: "none", sm: "grid" }, placeItems: "center", fontSize: 30 }}>{currentBusiness.icon}</Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
            {currentBusiness.features.map((section, idx) => (
              <Box key={section.category} sx={{ bgcolor: idx === 0 ? "#2563EB" : idx === 3 ? "#101116" : "#fff", color: idx === 0 || idx === 3 ? "#fff" : "#15161b", borderRadius: idx % 2 ? "28px 8px 28px 28px" : "8px 28px 28px 28px", p: 2.5, border: "1px solid #dad7ce", minHeight: 260 }}>
                <Typography sx={{ opacity: .55, fontSize: ".65rem", fontWeight: 900, letterSpacing: ".12em" }}>0{idx + 1}</Typography>
                <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", mt: .75, mb: 2 }}>{section.category}</Typography>
                <Stack spacing={1.45}>
                  {section.items.map(item => <Box key={item.name} sx={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 1.1 }}>
                    <Box sx={{ width: 21, height: 21, borderRadius: 1.5, bgcolor: idx === 0 ? "#93C5FD" : idx === 3 ? "#ff765c" : currentBusiness.bgColor, color: "#101116", display: "grid", placeItems: "center" }}><Check sx={{ fontSize: 14 }} /></Box>
                    <Box><Typography sx={{ fontWeight: 850, fontSize: ".8rem", lineHeight: 1.25 }}>{item.name}</Typography><Typography sx={{ opacity: .58, fontSize: ".68rem", lineHeight: 1.45, mt: .25 }}>{item.benefit}</Typography></Box>
                  </Box>)}
                </Stack>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 3, px: 3, py: 2.25, borderRadius: 99, bgcolor: "#93C5FD", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: ".82rem", sm: "1rem" } }}>Every plan includes your branded site, payments and client history.</Typography>
            <Button onClick={onClose} endIcon={<ArrowForward />} sx={{ flexShrink: 0, color: "#101116", fontWeight: 900 }}>Done</Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
