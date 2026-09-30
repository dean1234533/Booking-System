import React, { useState, useEffect } from "react";
import {
  Alert, Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Typography,
} from "@mui/material";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import BookingLinkCard from "./BookingLinkCard";
import ReminderUsageBanner from "./ReminderUsageBanner";
import BookingLinkQrDialog from "./BookingLinkQrDialog";
import {
  ArrowRight as ArrowForwardIcon,
  CalendarDays as CalendarIcon,
  CalendarClock as TodayIcon,
  CheckCircle2 as CheckCircleOutlineIcon,
  Clock3 as AccessTimeIcon,
  FileText as ReceiptLongIcon,
  Globe2 as LanguageIcon,
  Paintbrush as ColorLensIcon,
  ReceiptText as RequestQuoteIcon,
  Scissors as ContentCutIcon,
  Store as StorefrontIcon,
  TrendingUp as TrafficIcon,
  UsersRound as PeopleIcon,
} from "lucide-react";

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long",
});

function QuickAction({ icon, title, detail, onClick, brandColor }) {
  return (
    <Button
      fullWidth
      onClick={onClick}
      sx={{
        justifyContent: "flex-start", alignItems: "center", textAlign: "left", p: 1.6,
        border: "1px solid #E4E7EC", bgcolor: "#fff", color: "#101828",
        borderRadius: 2.5, minHeight: 76,
        "&:hover": { bgcolor: "#F9FAFB", borderColor: "#D0D5DD" },
      }}
    >
      <Box sx={{
        width: 36, height: 36, borderRadius: 2, flexShrink: 0, mr: 1.5,
        bgcolor: `${brandColor}10`, color: brandColor, display: "grid", placeItems: "center",
      }}>
        {React.cloneElement(icon, { size: 18, strokeWidth: 1.8 })}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 750, fontSize: ".86rem", lineHeight: 1.25 }}>{title}</Typography>
        <Typography className="quick-detail" sx={{ color: "text.secondary", fontSize: ".71rem", mt: .35 }}>{detail}</Typography>
      </Box>
      <ArrowForwardIcon size={16} strokeWidth={1.8} color="#98A2B3" />
    </Button>
  );
}

function Metric({ label, value, detail, accent }) {
  return (
    <Box sx={{ p: { xs: 1.6, md: 2.1 }, height: "100%", borderRight: "1px solid #E4E7EC", "&:last-of-type": { borderRight: 0 } }}>
      <Typography sx={{ color: "text.secondary", fontSize: ".7rem", fontWeight: 650 }}>
        {label}
      </Typography>
      <Typography sx={{ mt: .65, fontSize: { xs: "1.65rem", md: "2rem" }, lineHeight: 1, fontWeight: 750, letterSpacing: "-.04em", color: accent || "text.primary" }}>
        {value}
      </Typography>
      <Typography sx={{ color: "text.secondary", fontSize: ".72rem", mt: .75 }}>{detail}</Typography>
    </Box>
  );
}

export default function DashboardOverview({
  profile = {}, bookings = [], slots = [], businessType = "barber",
  brandColor = "#2563EB", onNavigate, barberId,
}) {
  // Basic/Mini accounts don't have every tab this component assumes by
  // default (queue, haircut history, invoices, domain, and — for Mini
  // only — services and the "edit-page" Profile tab it's replaced by
  // "free-page"). Every quick-action, checklist item and shortcut card
  // below needs to route around whichever of these don't actually exist,
  // rather than link to a tab that silently does nothing when tapped.
  const isBasicPlan = profile.plan === "basic";
  const isFreePlan  = profile.plan === "free";
  const [qrOpen, setQrOpen] = useState(false);
  const [plumberCounts, setPlumberCounts] = useState({ newEnquiries: 0, jobsToday: 0, openQuotes: 0, unpaidInvoices: 0 });
  const [plumberJobs, setPlumberJobs] = useState([]);
  // PT sessions live in barbers/{id}/ptSlots (status: "available" | "booked"),
  // never in the generic top-level `slots`/`bookings` collections — those are
  // always empty for a trainer account, which made every metric here read
  // wrong (0 sessions, a stale/unrelated slot count) regardless of what was
  // actually booked.
  const [ptCounts, setPtCounts] = useState({ bookedToday: [], availableToday: 0, activeBooked: 0 });
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayBookings = bookings
    .filter(b => b.date === todayStr && b.status !== "cancelled")
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const openSlots = slots.filter(s => s.date === todayStr && !s.isBooked && s.status === "open");
  const pendingBookings = bookings.filter(b => !["completed", "cancelled"].includes(b.status)).length;

  useEffect(() => {
    if (businessType !== "trainer" || !barberId) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "barbers", barberId, "ptSlots"));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const bookedToday = all
          .filter(s => s.date === todayStr && s.status === "booked")
          .map(s => ({ ...s, customerName: s.clientName, serviceName: s.purpose }))
          .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        setPtCounts({
          bookedToday,
          availableToday: all.filter(s => s.date === todayStr && s.status === "available").length,
          activeBooked: all.filter(s => s.status === "booked").length,
        });
      } catch { /* best-effort — overview stays usable without these counts */ }
    })();
  }, [businessType, barberId, todayStr]);

  const effectiveTodayBookings = businessType === "trainer" ? ptCounts.bookedToday : todayBookings;
  const effectiveOpenSlotsCount = businessType === "trainer" ? ptCounts.availableToday : openSlots.length;
  const effectivePendingBookings = businessType === "trainer" ? ptCounts.activeBooked : pendingBookings;

  useEffect(() => {
    if (businessType !== "plumber" || !barberId) return;
    (async () => {
      try {
        const [enquirySnap, jobsSnap, quoteSnap, invoiceSnap] = await Promise.all([
          getDocs(query(collection(db, "barbers", barberId, "enquiries"), where("status", "==", "new"))),
          getDocs(collection(db, "barbers", barberId, "dayPlan", todayStr, "jobs")),
          getDocs(collection(db, "barbers", barberId, "quotes")),
          getDocs(collection(db, "barbers", barberId, "invoices")),
        ]);
        const todayJobs = jobsSnap.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (a.startTime || a.time || "").localeCompare(b.startTime || b.time || ""));
        setPlumberJobs(todayJobs);
        setPlumberCounts({
          newEnquiries: enquirySnap.size,
          jobsToday: jobsSnap.size,
          openQuotes: quoteSnap.docs.filter(item => !["accepted", "declined", "expired"].includes(item.data().status)).length,
          unpaidInvoices: invoiceSnap.docs.filter(item => (item.data().paymentStatus || "unpaid") !== "paid").length,
        });
      } catch { /* best-effort — overview stays usable without these counts */ }
    })();
  }, [businessType, barberId, todayStr]);

  const checklist = [
    { done: Boolean(profile.name || profile.businessName), label: "Business profile" },
    { done: Boolean(profile.bookingSlug), label: "Booking link" },
    // aboutBody is what most page templates (hairdresser, decorator, PT)
    // actually read and save from their own "About" editor — aboutUs is only
    // ever written alongside it on the barber template. Checking aboutUs
    // alone left this stuck "not complete" for any account whose About text
    // only ever landed in aboutBody.
    { done: Boolean(profile.bio || profile.aboutBody || profile.aboutUs), label: "About section" },
    // Mini has no Services tab at all — nothing to ever mark this done with.
    ...(!isFreePlan ? [{ done: businessType === "trainer" ? Boolean(profile.pricingPlans?.length) : Boolean(profile.services?.length), label: businessType === "trainer" ? "Pricing plans" : "Services & pricing" }] : []),
    // Mini's Finance tab hides payment collection entirely — never achievable.
    // stripeAccountId alone doesn't mean payments work (see BookingForm.jsx) —
    // only stripeConnected is re-verified against Stripe's own API, or an
    // external payment link is a valid alternative way to actually take payment.
    ...(!isFreePlan ? [{ done: Boolean(profile.stripeConnected || profile.externalPaymentLink), label: "Online payments" }] : []),
    // Domain tab is hidden for both Basic and Mini.
    ...(!isBasicPlan && !isFreePlan ? [{ done: Boolean(profile.customDomain || profile.vercelUrl), label: "Custom domain (optional)" }] : []),
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
    plumber: [
      [<PeopleIcon />, "View new enquiries", "See job requests submitted from your page", "enquiries"],
      [<RequestQuoteIcon />, "Create a quote", "Price and share a new job", "quote"],
      [<TodayIcon />, "Open job planner", "Organise today's scheduled jobs", "dayplanner"],
    ],
  }[businessType] || [];

  // Basic/Mini only ever apply to barber/hairdresser, and hide every
  // businessType-specific tool tab (queue, haircut history, invoices) for
  // both — plus Services entirely for Mini — so any shortcut pointing at
  // one of those keys would silently do nothing when tapped.
  const unavailableActionKeys = new Set([
    ...(isBasicPlan || isFreePlan ? ["queue", "haircut", "bar-invoices", "client-history", "hd-invoices"] : []),
    ...(isFreePlan ? ["services"] : []),
  ]);
  const availableActions = actions.filter(([, , , key]) => !unavailableActionKeys.has(key));

  const workspace = {
    barber: {
      eyebrow: "Barber workday",
      bookingNoun: "cut",
      clearDay: "No cuts are booked yet. Open your queue for walk-ins or add appointment availability.",
      diaryTitle: "Today’s chair",
      emptyTitle: "No cuts booked today",
      emptyDetail: "Walk-ins from your live queue and new bookings will appear here.",
      primary: ["Open live queue", "queue"],
      secondary: ["View appointments", "bookings"],
      metrics: [["Today", "Cuts booked"], ["Open", "Slots today"], ["Ahead", "Active appointments"]],
      toolsTitle: "Run your workday",
    },
    hairdresser: {
      eyebrow: "Salon diary",
      bookingNoun: "appointment",
      clearDay: "Your salon diary is clear today. Open availability or update your treatment menu.",
      diaryTitle: "Today’s appointments",
      emptyTitle: "Your salon diary is clear",
      emptyDetail: "Open availability or use the time to update your treatments.",
      primary: ["Open salon diary", "schedule"],
      secondary: ["View appointments", "bookings"],
      metrics: [["Today", "Appointments"], ["Available", "Slots today"], ["Ahead", "Upcoming clients"]],
      toolsTitle: "Manage your salon",
    },
    trainer: {
      eyebrow: "Coaching workspace",
      bookingNoun: "session",
      clearDay: "You have no sessions today. Review a client plan or open more coaching availability.",
      diaryTitle: "Today’s sessions",
      emptyTitle: "No sessions booked today",
      emptyDetail: "Review a client plan or open more coaching availability.",
      primary: ["Open client coaching", "clients"],
      secondary: ["Manage availability", "schedule"],
      metrics: [["Today", "Sessions"], ["Available", "Slots today"], ["Ahead", "Active sessions"]],
      toolsTitle: "Coach your clients",
    },
    decorator: {
      eyebrow: "Project workspace",
      bookingNoun: "site visit",
      clearDay: "No site visits are booked today. Use the time to progress a quote or plan upcoming work.",
      diaryTitle: "Today’s site visits",
      emptyTitle: "No visits booked today",
      emptyDetail: "Open your project plan or prepare a customer quote.",
      primary: ["Open day plan", "dayplanner"],
      secondary: ["Create a quote", "quote"],
      metrics: [["Today", "Visits"], ["Available", "Booking slots"], ["Ahead", "Active appointments"]],
      toolsTitle: "Move projects forward",
    },
    plumber: {
      eyebrow: "Trade job desk",
      bookingNoun: "job",
      diaryTitle: "Today’s jobs",
      emptyTitle: "No jobs scheduled today",
      emptyDetail: "Add work from the job planner or convert a customer enquiry.",
      primary: ["View new enquiries", "enquiries"],
      secondary: ["Open job planner", "dayplanner"],
      toolsTitle: "Move jobs forward",
    },
  }[businessType] || {
    eyebrow: "Business workspace",
    bookingNoun: "booking",
    clearDay: "Your diary is clear today. Open availability or finish setting up your business page.",
    diaryTitle: "Today’s diary",
    emptyTitle: "No bookings today",
    emptyDetail: "New bookings will appear here in time order.",
    primary: ["View bookings", "bookings"],
    secondary: ["Manage schedule", "schedule"],
    metrics: [["Today", "Bookings"], ["Open", "Slots today"], ["Ahead", "Active bookings"]],
    toolsTitle: "Quick actions",
  };

  // Barber's default workspace leads with the live walk-in Queue, which is
  // hidden for Basic/Mini — the "Open live queue" primary action would
  // otherwise silently do nothing when tapped.
  if (businessType === "barber" && (isBasicPlan || isFreePlan)) {
    Object.assign(workspace, {
      clearDay: "No cuts are booked yet. Add appointment availability to get started.",
      emptyDetail: "New bookings will appear here.",
      primary: ["Add availability", "schedule"],
    });
  }

  const firstName = (profile.name || profile.businessName || "there").split(" ")[0];

  return (
    <Box>
      <Paper sx={{
        borderRadius: 3, p: { xs: 2.25, md: 3 }, mb: 2,
        background: "#fff",
      }}>
        <Typography sx={{ color: brandColor, fontWeight: 850, fontSize: ".7rem", letterSpacing: ".08em", textTransform: "uppercase" }}>
          {workspace.eyebrow}
        </Typography>
        <Typography sx={{ color: "text.secondary", fontWeight: 650, fontSize: ".74rem", mt: .7 }}>{DAY_FORMAT.format(today)}</Typography>
        <Typography sx={{ fontSize: { xs: "1.5rem", md: "1.85rem" }, fontWeight: 750, mt: .55, letterSpacing: "-.03em", color: "#101828" }}>
          Good {today.getHours() < 12 ? "morning" : today.getHours() < 18 ? "afternoon" : "evening"}, {firstName}
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: .65, maxWidth: 660, fontSize: ".84rem", lineHeight: 1.55 }}>
          {businessType === "plumber"
            ? (plumberCounts.newEnquiries
                ? `You have ${plumberCounts.newEnquiries} new enquir${plumberCounts.newEnquiries === 1 ? "y" : "ies"} to review${plumberCounts.jobsToday ? `, and ${plumberCounts.jobsToday} job${plumberCounts.jobsToday === 1 ? "" : "s"} on today's plan.` : "."}`
                : "No new enquiries right now. Use the time to open your job planner or finish setting up your business page.")
            : effectiveTodayBookings.length
              ? `You have ${effectiveTodayBookings.length} ${workspace.bookingNoun}${effectiveTodayBookings.length === 1 ? "" : "s"} today. The next starts at ${effectiveTodayBookings[0].time || "a time to be confirmed"}.`
              : workspace.clearDay}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2.5 }}>
          <Button variant="contained" onClick={() => onNavigate(workspace.primary[1])} sx={{ bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(.92)" } }}>
            {workspace.primary[0]}
          </Button>
          <Button variant="outlined" onClick={() => onNavigate(workspace.secondary[1])} sx={{ borderColor: "#D0D5DD", color: "#344054" }}>
            {workspace.secondary[0]}
          </Button>
        </Stack>
      </Paper>

      {profile.bookingSlug && (
        <BookingLinkCard bookingSlug={profile.bookingSlug} brandColor={brandColor} onShowQr={() => setQrOpen(true)} sx={{ mb: 2.5 }} />
      )}
      <BookingLinkQrDialog open={qrOpen} onClose={() => setQrOpen(false)} bookingSlug={profile.bookingSlug} brandColor={brandColor} />

      <ReminderUsageBanner barberId={barberId} profile={profile} onNavigate={onNavigate} />

      {/* Decorator/plumber are enquiry-based (no online payment step at all),
          so this doesn't apply to them — only businessTypes whose public
          page takes real bookings. Without Stripe, bookings still go
          through directly (via an external payment link if they've set
          one in Finance, or with no deposit at all) — this is just a
          nudge toward Stripe for automatic deposit collection, so an
          external link (a valid alternative way to actually take payment)
          also satisfies it. Mini-plan accounts never take a deposit at all
          by design (Finance hides the payment section entirely for them),
          so the nudge doesn't apply. stripeAccountId alone is deliberately
          not checked here — see BookingForm.jsx. */}
      {!Boolean(profile.stripeConnected || profile.externalPaymentLink) && !["decorator", "plumber"].includes(businessType) && profile.plan !== "free" && (
        <Alert
          severity="info"
          sx={{ mb: 2.5 }}
          action={
            <Button color="inherit" size="small" onClick={() => onNavigate("finance")} sx={{ fontWeight: 750, whiteSpace: "nowrap" }}>
              Connect Stripe
            </Button>
          }
        >
Bookings are confirming without an automatic deposit — connect Stripe to collect deposits online.
        </Alert>
      )}

      {businessType === "plumber" ? (
        <Paper sx={{ mb: 2.5, display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, borderRadius: 3, overflow: "hidden", boxShadow: "none", "& > div:nth-of-type(2)": { borderRight: { xs: 0, md: "1px solid #E4E7EC" } } }}>
          <Metric label="New" value={plumberCounts.newEnquiries} detail="Enquiries" accent={brandColor} />
          <Metric label="Today" value={plumberCounts.jobsToday} detail="Jobs scheduled" />
          <Metric label="Open" value={plumberCounts.openQuotes} detail="Quotes" />
          <Metric label="Due" value={plumberCounts.unpaidInvoices} detail="Invoices" />
        </Paper>
      ) : (
        <Paper sx={{ mb: 2.5, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderRadius: 3, overflow: "hidden", boxShadow: "none" }}>
          <Metric label={workspace.metrics[0][0]} value={effectiveTodayBookings.length} detail={workspace.metrics[0][1]} accent={brandColor} />
          <Metric label={workspace.metrics[1][0]} value={effectiveOpenSlotsCount} detail={workspace.metrics[1][1]} />
          <Metric label={workspace.metrics[2][0]} value={effectivePendingBookings} detail={workspace.metrics[2][1]} />
        </Paper>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Typography sx={{ fontWeight: 850, mb: 1.25 }}>{workspace.diaryTitle}</Typography>
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            {businessType === "plumber" ? (
              plumberJobs.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <TodayIcon size={32} strokeWidth={1.5} color="#98A2B3" />
                  <Typography sx={{ fontWeight: 800, mt: 1 }}>{workspace.emptyTitle}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: ".78rem", mt: .5 }}>{workspace.emptyDetail}</Typography>
                  <Button size="small" onClick={() => onNavigate("dayplanner")} sx={{ mt: 1.5, color: brandColor, fontWeight: 850 }}>Open job planner</Button>
                </Box>
              ) : plumberJobs.slice(0, 5).map((job, index) => (
                <Box key={job.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.25, py: 1.6, borderBottom: index < Math.min(plumberJobs.length, 5) - 1 ? "1px solid #eceef2" : 0 }}>
                  <Typography sx={{ width: 50, fontWeight: 900, color: brandColor }}>{job.startTime || job.time || "—"}</Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 850, fontSize: ".86rem" }}>{job.client || job.clientName || "Client"}</Typography>
                    <Typography noWrap sx={{ color: "text.secondary", fontSize: ".72rem" }}>{[job.jobType || job.title, job.postcode || job.address].filter(Boolean).join(" · ") || "Scheduled job"}</Typography>
                  </Box>
                  <Chip size="small" label={job.status || "pending"} sx={{ textTransform: "capitalize", fontSize: ".65rem", fontWeight: 750 }} />
                </Box>
              ))
            ) : effectiveTodayBookings.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AccessTimeIcon size={32} strokeWidth={1.5} color="#98A2B3" />
                <Typography sx={{ fontWeight: 800, mt: 1 }}>{workspace.emptyTitle}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: ".78rem", mt: .5 }}>{workspace.emptyDetail}</Typography>
              </Box>
            ) : effectiveTodayBookings.slice(0, 5).map((booking, index) => (
              <Box key={booking.id || `${booking.time}-${index}`} sx={{ display: "flex", alignItems: "center", gap: 1.75, px: 2.25, py: 1.6, borderBottom: index < Math.min(effectiveTodayBookings.length, 5) - 1 ? "1px solid #eceef2" : 0 }}>
                <Typography sx={{ width: 48, fontWeight: 850, color: brandColor }}>{booking.time || "—"}</Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: ".86rem" }}>{booking.customerName || booking.name || "Client"}</Typography>
                  <Typography noWrap sx={{ color: "text.secondary", fontSize: ".72rem" }}>{booking.serviceName || booking.haircutStyle || "Appointment"}</Typography>
                </Box>
                <Chip size="small" label={booking.status || "booked"} sx={{ textTransform: "capitalize", fontSize: ".65rem" }} />
              </Box>
            ))}
          </Paper>

          <Typography sx={{ fontWeight: 850, mt: 2.5, mb: 1.25 }}>{workspace.toolsTitle}</Typography>
          <Grid container spacing={1.25}>
            {availableActions.map(([icon, title, detail, key]) => (
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
                  <CheckCircleOutlineIcon size={18} strokeWidth={1.8} color={item.done ? "#16A36A" : "#C3C7CF"} />
                  <Typography sx={{ fontSize: ".78rem", color: item.done ? "text.primary" : "text.secondary" }}>{item.label}</Typography>
                </Box>
              ))}
            </Stack>
            <Button fullWidth variant="outlined" startIcon={<StorefrontIcon />} onClick={() => onNavigate(isFreePlan ? "free-page" : "edit-page")} sx={{ mt: 2.25, borderColor: `${brandColor}88`, color: brandColor }}>
              Complete business page
            </Button>
          </Paper>

          <Paper sx={{ mt: 2, p: 2.5, borderRadius: 3, bgcolor: `${brandColor}0b`, borderColor: `${brandColor}44` }}>
            <LanguageIcon size={20} strokeWidth={1.8} color={brandColor} />
            <Typography sx={{ fontWeight: 850, mt: .75 }}>Your public website</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: ".76rem", mt: .5 }}>Keep your page current so clients can book with confidence.</Typography>
            <Button size="small" endIcon={<ArrowForwardIcon size={15} strokeWidth={1.8} />} onClick={() => onNavigate(isFreePlan ? "free-page" : "edit-page")} sx={{ mt: 1, px: 0, color: brandColor }}>Manage website</Button>
          </Paper>

          {/* Search traffic lives on the Domain tab, which is hidden for
              both Basic and Mini — this card would otherwise link nowhere. */}
          {!isBasicPlan && !isFreePlan && (profile.customDomain && profile.domainStatus === "active" ? profile.customDomain : profile.bookingSlug ? `bookrightly.co.uk/${profile.bookingSlug}` : null) && (
            <Paper sx={{ mt: 2, p: 2.5, borderRadius: 3 }}>
              <TrafficIcon size={20} strokeWidth={1.8} color={brandColor} />
              <Typography sx={{ fontWeight: 850, mt: .75 }}>Search traffic</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: ".76rem", mt: .5 }}>
                See how many people are finding {profile.customDomain && profile.domainStatus === "active" ? profile.customDomain : `bookrightly.co.uk/${profile.bookingSlug}`} on Google.
              </Typography>
              <Button
                size="small" endIcon={<ArrowForwardIcon size={15} strokeWidth={1.8} />}
                onClick={() => { sessionStorage.setItem("br_scrollTo", "search-traffic"); onNavigate("domain"); }}
                sx={{ mt: 1, px: 0, color: brandColor }}
              >
                View search traffic
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
