import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Check, Close } from "@mui/icons-material";

const BUSINESS_FEATURES = {
  barber: {
    name: "Barbers",
    icon: "✂️",
    color: "#C9A84C",
    bgColor: "#f5e9c8",
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
    bgColor: "#f0e4cc",
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

  const handleTabChange = (event, newValue) => {
    setSelectedType(businessTypes[newValue]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: "#f8f9fa",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "'Playfair Display', serif",
          fontSize: { xs: "1.15rem", sm: "1.75rem" },
          fontWeight: 800,
          bgcolor: currentBusiness.bgColor,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        {currentBusiness.icon} {currentBusiness.name} — Full Feature Breakdown
      </DialogTitle>

      <DialogContent sx={{ py: 4 }}>
        {/* Tab Selection */}
        <Box sx={{ mb: 4 }}>
          <Tabs
            value={businessTypes.indexOf(selectedType)}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: "2px solid #e0e0e0",
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: { xs: "0.8rem", sm: "0.95rem" },
                minWidth: { xs: "auto", sm: 90 },
                px: { xs: 1.5, sm: 2 },
                "&.Mui-selected": {
                  color: currentBusiness.color,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: currentBusiness.color,
              },
            }}
          >
            {Object.values(BUSINESS_FEATURES).map((b) => (
              <Tab key={b.name} label={b.name} />
            ))}
          </Tabs>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={3}>
          {currentBusiness.features.map((section, idx) => (
            <Grid item xs={12} sm={6} key={idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: "#ffffff",
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ mb: 2, color: currentBusiness.color }}
                >
                  {section.category}
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {section.items.map((item, itemIdx) => (
                    <Box
                      key={itemIdx}
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        alignItems: "flex-start",
                        pb: 1.5,
                        borderBottom:
                          itemIdx < section.items.length - 1
                            ? "1px solid #f0f0f0"
                            : "none",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          bgcolor: item.included ? "#4CAF50" : "#e0e0e0",
                          color: "#ffffff",
                          flexShrink: 0,
                          mt: 0.2,
                        }}
                      >
                        {item.included ? (
                          <Check sx={{ fontSize: 16 }} />
                        ) : (
                          <Close sx={{ fontSize: 16, color: "#999" }} />
                        )}
                      </Box>

                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: "#1a1a1a" }}
                        >
                          {item.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#666",
                            display: "block",
                            mt: 0.25,
                            lineHeight: 1.4,
                          }}
                        >
                          💡 {item.benefit}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Benefits Summary */}
        <Box sx={{ mt: 4, p: 3, bgcolor: currentBusiness.bgColor, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            ✨ All {currentBusiness.name} Get:
          </Typography>
          <Grid container spacing={2}>
            {[
              "📱 Custom branded website with your own domain",
              "💳 Online payments via Stripe — no extra setup",
              "📅 Professional booking system & calendar",
              "📊 Business dashboard with income tracking",
              "👥 Full client management & history",
              "✉️ Automated email reminders & notifications",
              "💬 WhatsApp support button in your dashboard",
            ].map((benefit, idx) => (
              <Grid item xs={12} sm={6} key={idx}>
                <Typography variant="body2" sx={{ color: "#1a1a1a" }}>
                  {benefit}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: currentBusiness.color,
            color: "#fff",
            "&:hover": { opacity: 0.9 },
          }}
        >
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
}
