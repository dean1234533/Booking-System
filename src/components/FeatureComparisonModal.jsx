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
          { name: "Availability management", included: true, benefit: "Set your working hours once" },
          { name: "Automated reminders", included: true, benefit: "Reduce no-shows with SMS/email reminders" },
          { name: "Queue management", included: true, benefit: "Track waiting clients in real-time" },
        ],
      },
      {
        category: "Payments & Money",
        items: [
          { name: "Online payments (Stripe)", included: true, benefit: "Accept card payments instantly" },
          { name: "Deposits & partial payments", included: true, benefit: "Collect upfront deposits" },
          { name: "Financial dashboard", included: true, benefit: "Track income and earnings" },
          { name: "Invoice generation", included: true, benefit: "Professional invoices for clients" },
        ],
      },
      {
        category: "Website & Branding",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own business site with logo & colors" },
          { name: "Custom domain", included: true, benefit: "Own domain (barber.com) or use yours" },
          { name: "Service showcase", included: true, benefit: "Display services, prices, and portfolio" },
          { name: "Portfolio photos", included: true, benefit: "Show your best work" },
        ],
      },
      {
        category: "Business Tools",
        items: [
          { name: "Client database", included: true, benefit: "Store client info and history" },
          { name: "Team management", included: true, benefit: "Add staff members to dashboard" },
          { name: "Review management", included: true, benefit: "Display and manage client reviews" },
          { name: "Social media links", included: true, benefit: "Link Instagram, TikTok, Facebook" },
        ],
      },
      {
        category: "Tax & Finance",
        items: [
          { name: "Income & expense tracking", included: true, benefit: "Log all business income and expenses" },
          { name: "Auto-calculated taxes", included: true, benefit: "UK self-employment tax calculations" },
          { name: "Invoice storage", included: true, benefit: "Upload and organize business invoices" },
          { name: "Quarterly tax planning", included: true, benefit: "See Self-Assessment payment schedules" },
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
          { name: "Availability management", included: true, benefit: "Set your working hours once" },
          { name: "Automated reminders", included: true, benefit: "Reduce no-shows with SMS/email reminders" },
          { name: "Google Calendar sync", included: true, benefit: "Sync with your personal calendar" },
        ],
      },
      {
        category: "Payments & Money",
        items: [
          { name: "Online payments (Stripe)", included: true, benefit: "Accept card payments instantly" },
          { name: "Deposits & partial payments", included: true, benefit: "Collect upfront deposits" },
          { name: "Financial dashboard", included: true, benefit: "Track income and earnings" },
          { name: "Invoice generation", included: true, benefit: "Professional invoices for clients" },
        ],
      },
      {
        category: "Website & Branding",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own business site with logo & colors" },
          { name: "Custom domain", included: true, benefit: "Own domain (salon.com) or use yours" },
          { name: "Service showcase", included: true, benefit: "Display services, prices, and styles" },
          { name: "Portfolio photos", included: true, benefit: "Show before/after transformations" },
        ],
      },
      {
        category: "Business Tools",
        items: [
          { name: "Client database", included: true, benefit: "Store client info and preferences" },
          { name: "Team management", included: true, benefit: "Add stylists to dashboard" },
          { name: "Review management", included: true, benefit: "Display and manage client reviews" },
          { name: "Social media links", included: true, benefit: "Link Instagram, TikTok, Pinterest" },
        ],
      },
      {
        category: "Tax & Finance",
        items: [
          { name: "Income & expense tracking", included: true, benefit: "Log all business income and expenses" },
          { name: "Auto-calculated taxes", included: true, benefit: "UK self-employment tax calculations" },
          { name: "Invoice storage", included: true, benefit: "Upload and organize business invoices" },
          { name: "Quarterly tax planning", included: true, benefit: "See Self-Assessment payment schedules" },
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
        category: "Booking & Quotes",
        items: [
          { name: "Online booking", included: true, benefit: "Clients book consultations 24/7" },
          { name: "Quote management", included: true, benefit: "Create and manage project quotes" },
          { name: "Project tracking", included: true, benefit: "Track projects from quote to completion" },
          { name: "Day planner", included: true, benefit: "Plan your site visits and projects" },
        ],
      },
      {
        category: "Payments & Money",
        items: [
          { name: "Online payments (Stripe)", included: true, benefit: "Accept deposits online" },
          { name: "Deposits & staged payments", included: true, benefit: "Collect upfront and milestone payments" },
          { name: "Financial dashboard", included: true, benefit: "Track income and project costs" },
          { name: "Invoice generation", included: true, benefit: "Professional invoices for clients" },
        ],
      },
      {
        category: "Website & Portfolio",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own business site with branding" },
          { name: "Custom domain", included: true, benefit: "Own domain (decorator.com) or use yours" },
          { name: "Portfolio gallery", included: true, benefit: "Showcase completed projects" },
          { name: "Colour customisation", included: true, benefit: "Full control over site colours" },
        ],
      },
      {
        category: "Business Tools",
        items: [
          { name: "Client database", included: true, benefit: "Store client details and preferences" },
          { name: "Project management", included: true, benefit: "Manage multiple projects simultaneously" },
          { name: "Review management", included: true, benefit: "Display client testimonials" },
          { name: "Social media links", included: true, benefit: "Link Instagram, Pinterest, Facebook" },
        ],
      },
      {
        category: "Tax & Finance",
        items: [
          { name: "Income & expense tracking", included: true, benefit: "Log all business income and expenses" },
          { name: "Auto-calculated taxes", included: true, benefit: "UK self-employment tax calculations" },
          { name: "Invoice storage", included: true, benefit: "Upload and organize business invoices" },
          { name: "Quarterly tax planning", included: true, benefit: "See Self-Assessment payment schedules" },
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
          { name: "Client profiles", included: true, benefit: "Complete client records in one place" },
          { name: "Real-time chat", included: true, benefit: "Message clients within the app" },
          { name: "WhatsApp integration", included: true, benefit: "Direct link to client WhatsApp" },
          { name: "Voice consultations", included: true, benefit: "Record and transcribe session notes" },
        ],
      },
      {
        category: "Training Programs",
        items: [
          { name: "Workout plans", included: true, benefit: "Create custom workout routines" },
          { name: "Exercise library", included: true, benefit: "500+ exercises with demo videos" },
          { name: "Progress tracking", included: true, benefit: "Charts show client progress over time" },
          { name: "Activity logging", included: true, benefit: "Clients log workouts and track activity" },
        ],
      },
      {
        category: "Nutrition & Coaching",
        items: [
          { name: "Nutrition planning", included: true, benefit: "Build meal plans with 1000+ foods" },
          { name: "Automated reminders", included: true, benefit: "Send monthly check-ins & reminders" },
          { name: "Client forms", included: true, benefit: "PAR-Q forms, check-ins, assessments" },
          { name: "Food generator", included: true, benefit: "AI meal plan suggestions" },
        ],
      },
      {
        category: "Website & Business",
        items: [
          { name: "Custom branded website", included: true, benefit: "Your own PT coaching site" },
          { name: "Online booking", included: true, benefit: "Clients book sessions directly" },
          { name: "Custom domain", included: true, benefit: "Own domain (yourtraining.com)" },
          { name: "Payments (Stripe)", included: true, benefit: "Accept online payments for sessions" },
        ],
      },
      {
        category: "Tax & Finance",
        items: [
          { name: "Income & expense tracking", included: true, benefit: "Log all business income and expenses" },
          { name: "Auto-calculated taxes", included: true, benefit: "UK self-employment tax calculations" },
          { name: "Invoice storage", included: true, benefit: "Upload and organize business invoices" },
          { name: "Quarterly tax planning", included: true, benefit: "See Self-Assessment payment schedules" },
        ],
      },
    ],
  },
};

export default function FeatureComparisonModal({ open, onClose }) {
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
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: "#f8f9fa",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.75rem",
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
            sx={{
              borderBottom: "2px solid #e0e0e0",
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "0.95rem",
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
              "📱 Custom branded website with your domain",
              "💳 Online payments with Stripe integration",
              "📅 Professional booking calendar",
              "📊 Business dashboard & analytics",
              "👥 Client management system",
              "✉️ Automated email reminders",
              "📈 Mobile-friendly for your clients",
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
