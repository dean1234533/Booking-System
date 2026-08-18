import React, { useState } from "react";
import {
  Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Typography,
} from "@mui/material";
import BookingLinkCard from "./BookingLinkCard";
import BookingLinkQrDialog from "./BookingLinkQrDialog";
import {
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarMonth as CalendarIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ColorLens as ColorLensIcon,
  ContentCut as ContentCutIcon,
  Language as LanguageIcon,
  People as PeopleIcon,
  ReceiptLong as ReceiptLongIcon,
  RequestQuote as RequestQuoteIcon,
  Storefront as StorefrontIcon,
  Today as TodayIcon,
} from "@mui/icons-material";

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long",
});

function QuickAction({ icon, title, detail, onClick, brandColor }) {
  return (
    <Button
      fullWidth
      onClick={onClick}
      sx={{
        justifyContent: "flex-start", alignItems: "flex-end", textAlign: "left", p: 2.25,
        border: 0, bgcolor: "#111116", color: "#fff",
        borderRadius: "6px 24px 24px 24px", minHeight: 142,
        position: "relative", overflow: "hidden",
        "&:hover": { bgcolor: brandColor, transform: "translateY(-3px)", "& .quick-detail": { color: "#ffffffb0" } },
      }}
    >
      <Box sx={{
        position: "absolute", top: 18, right: 18, width: 40, height: 40, borderRadius: "50%",
        bgcolor: `${brandColor}25`, color: brandColor, display: "grid", placeItems: "center",
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 20 } })}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 900, fontSize: ".95rem", lineHeight: 1.25 }}>{title}</Typography>
        <Typography className="quick-detail" sx={{ color: "#ffffff66", fontSize: ".7rem", mt: .5, pr: 2 }}>{detail}</Typography>
      </Box>
      <ArrowForwardIcon sx={{ fontSize: 18, color: "#fff", ml: 1 }} />
    </Button>
  );
}

function Metric({ label, value, detail, accent }) {
  return (
    <Box sx={{ p: { xs: 1.7, md: 2.5 }, height: "100%", borderRight: "1px solid #d9dbe1", "&:last-of-type": { borderRight: 0 } }}>
      <Typography sx={{ color: "text.secondary", fontSize: ".69rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography sx={{ mt: .75, fontSize: { xs: "1.8rem", md: "2.4rem" }, lineHeight: 1, fontWeight: 950, letterSpacing: "-.06em", color: accent || "text.primary" }}>
        {value}
      </Typography>
      <Typography sx={{ color: "text.secondary", fontSize: ".72rem", mt: .75 }}>{detail}</Typography>
    </Box>
  );
}

export default function DashboardOverview({
  profile = {}, bookings = [], slots = [], businessType = "barber",
  brandColor = "#2563EB", onNavigate,
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayBookings = bookings
    .filter(b => b.date === todayStr && b.status !== "cancelled")
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const openSlots = slots.filter(s => s.date === todayStr && !s.isBooked && s.status === "open");
  const pendingBookings = bookings.filter(b => !["completed", "cancelled"].includes(b.status)).length;

  const checklist = [
    { done: Boolean(profile.name || profile.businessName), label: "Business profile" },
    { done: Boolean(profile.bookingSlug), label: "Booking link" },
    { done: Boolean(profile.bio || profile.aboutUs), label: "About section" },
    { done: businessType === "trainer" ? Boolean(profile.pricingPlans?.length) : Boolean(profile.services?.length), label: businessType === "trainer" ? "Pricing plans" : "Services & pricing" },
    { done: Boolean(profile.stripeConnected || profile.stripeAccountId), label: "Online payments" },
    { done: Boolean(profile.customDomain || profile.vercelUrl), label: "Custom domain (optional)" },
  ];
  const completed = checklist.filter(item => item.done).length;
  const completion = Math.round((completed / checklist.length) * 100);

  const actions = {
    barber: [
      [<PeopleIcon />, "Open live queue", "Manage walk-ins and waiting times", "queue"],
      [<ContentCutIcon />, "Find haircut history", "Pull up a returning client’s cut", "haircut"],
      [<CalendarIcon />, "Manage availability", "Add or block appointment slots", "schedule"],
    ],
    hairdresser: [
      [<CalendarIcon />, "Manage availability", "Open and organise appointment slots", "schedule"],
      [<ContentCutIcon />, "Update services", "Edit treatments, timings and prices", "services"],
      [<ReceiptLongIcon />, "Create an invoice", "Send a professional client invoice", "hd-invoices"],
    ],
    decorator: [
      [<RequestQuoteIcon />, "Create a quote", "Price and share a new project", "quote"],
      [<TodayIcon />, "Open day plan", "Organise today’s jobs and tasks", "dayplanner"],
      [<ColorLensIcon />, "Colour approval", "Send choices for client sign-off", "colourapproval"],
    ],
    trainer: [
      [<PeopleIcon />, "Open client hub", "Plans, check-ins and client records", "clients"],
      [<CalendarIcon />, "Set availability", "Plan upcoming training sessions", "schedule"],
      [<ReceiptLongIcon />, "Manage invoices", "Track and send client invoices", "pt-invoices"],
    ],
  }[businessType] || [];

  const firstName = (profile.name || profile.businessName || "there").split(" ")[0];

  return (
    <Box>
      <Paper sx={{
        position: "relative", overflow: "hidden", borderRadius: 4, p: { xs: 2.5, md: 3.5 },
        mb: 2.5, color: "#fff", border: 0,
        background: "linear-gradient(120deg, #17191f 0%, #242730 100%)",
      }}>
        <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", bgcolor: `${brandColor}22`, filter: "blur(2px)", right: -100, top: -130 }} />
        <Typography sx={{ color: `${brandColor}`, fontWeight: 800, fontSize: ".72rem", letterSpacing: ".1em", textTransform: "uppercase" }}>
          {DAY_FORMAT.format(today)}
        </Typography>
        <Typography sx={{ fontSize: { xs: "1.55rem", md: "2rem" }, fontWeight: 850, mt: .75, letterSpacing: "-.03em" }}>
          Good {today.getHours() < 12 ? "morning" : today.getHours() < 18 ? "afternoon" : "evening"}, {firstName}
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,.62)", mt: .75, maxWidth: 560, fontSize: ".88rem" }}>
          {todayBookings.length
            ? `You have ${todayBookings.length} booking${todayBookings.length === 1 ? "" : "s"} today. Your next appointment is at ${todayBookings[0].time || "a time to be confirmed"}.`
            : "Your diary is clear today. Use the time to open availability or finish setting up your business page."}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2.5 }}>
          <Button variant="contained" onClick={() => onNavigate("bookings")} sx={{ bgcolor: brandColor, color: "#111", "&:hover": { bgcolor: brandColor, filter: "brightness(.92)" } }}>
            View bookings
          </Button>
          <Button variant="outlined" onClick={() => onNavigate("schedule")} sx={{ borderColor: "rgba(255,255,255,.25)", color: "#fff", "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,.05)" } }}>
            Manage schedule
          </Button>
        </Stack>
      </Paper>

      {profile.bookingSlug && (
        <BookingLinkCard bookingSlug={profile.bookingSlug} brandColor={brandColor} onShowQr={() => setQrOpen(true)} sx={{ mb: 2.5 }} />
      )}
      <BookingLinkQrDialog open={qrOpen} onClose={() => setQrOpen(false)} bookingSlug={profile.bookingSlug} brandColor={brandColor} />

      <Paper sx={{ mb: 2.5, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderRadius: "24px 7px 24px 24px", overflow: "hidden", boxShadow: "none", border: "1px solid #d9dbe1" }}>
        <Metric label="Today" value={todayBookings.length} detail="Bookings" accent={brandColor} />
        <Metric label="Open" value={openSlots.length} detail="Slots today" />
        <Metric label="Ahead" value={pendingBookings} detail="Active bookings" />
      </Paper>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Typography sx={{ fontWeight: 850, mb: 1.25 }}>Today’s diary</Typography>
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            {todayBookings.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AccessTimeIcon sx={{ color: "#c3c7cf", fontSize: 34 }} />
                <Typography sx={{ fontWeight: 800, mt: 1 }}>No bookings today</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: ".78rem", mt: .5 }}>New bookings will appear here in time order.</Typography>
              </Box>
            ) : todayBookings.slice(0, 5).map((booking, index) => (
              <Box key={booking.id || `${booking.time}-${index}`} sx={{ display: "flex", alignItems: "center", gap: 1.75, px: 2.25, py: 1.6, borderBottom: index < Math.min(todayBookings.length, 5) - 1 ? "1px solid #eceef2" : 0 }}>
                <Typography sx={{ width: 48, fontWeight: 850, color: brandColor }}>{booking.time || "—"}</Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>{booking.customerName || booking.name || "Client"}</Typography>
                  <Typography noWrap sx={{ color: "text.secondary", fontSize: ".72rem" }}>{booking.serviceName || booking.haircutStyle || "Appointment"}</Typography>
                </Box>
                <Chip size="small" label={booking.status || "booked"} sx={{ textTransform: "capitalize", fontSize: ".65rem" }} />
              </Box>
            ))}
          </Paper>

          <Typography sx={{ fontWeight: 850, mt: 2.5, mb: 1.25 }}>Quick actions</Typography>
          <Grid container spacing={1.25}>
            {actions.map(([icon, title, detail, key]) => (
              <Grid item xs={12} sm={6} key={key}>
                <QuickAction icon={icon} title={title} detail={detail} brandColor={brandColor} onClick={() => onNavigate(key)} />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography sx={{ fontWeight: 850, mb: 1.25 }}>Business setup</Typography>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>Profile strength</Typography>
              <Typography sx={{ fontWeight: 850, color: brandColor }}>{completion}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={completion} sx={{ height: 7, borderRadius: 99, bgcolor: "#eceef2", "& .MuiLinearProgress-bar": { bgcolor: brandColor, borderRadius: 99 } }} />
            <Stack spacing={1.15} sx={{ mt: 2.25 }}>
              {checklist.map(item => (
                <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: item.done ? "#16a36a" : "#c3c7cf" }} />
                  <Typography sx={{ fontSize: ".78rem", color: item.done ? "text.primary" : "text.secondary" }}>{item.label}</Typography>
                </Box>
              ))}
            </Stack>
            <Button fullWidth variant="outlined" startIcon={<StorefrontIcon />} onClick={() => onNavigate("edit-page")} sx={{ mt: 2.25, borderColor: `${brandColor}88`, color: brandColor }}>
              Complete business page
            </Button>
          </Paper>

          <Paper sx={{ mt: 2, p: 2.5, borderRadius: 3, bgcolor: `${brandColor}0b`, borderColor: `${brandColor}44` }}>
            <LanguageIcon sx={{ color: brandColor }} />
            <Typography sx={{ fontWeight: 850, mt: .75 }}>Your public website</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".76rem", mt: .5 }}>Keep your page current so clients can book with confidence.</Typography>
            <Button size="small" onClick={() => onNavigate("edit-page")} sx={{ mt: 1, px: 0, color: brandColor }}>Manage website <ArrowForwardIcon sx={{ ml: .5, fontSize: 15 }} /></Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
