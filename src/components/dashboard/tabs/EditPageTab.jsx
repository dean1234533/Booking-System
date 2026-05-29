import React from "react";
import {
  Box, Avatar, Button, Grid, TextField, Typography, Divider,
  InputAdornment, Accordion, AccordionSummary, AccordionDetails, IconButton,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Delete as DeleteIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  ExpandMore as ExpandMoreIcon,
  AddCircle as AddCircleIcon,
  Image as ImageIcon,
} from "@mui/icons-material";

const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

function Section({ title, defaultExpanded = false, children }) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid #eee",
        borderRadius: "12px !important",
        mb: 2,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1.5 }}>
        <Typography fontWeight={700}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 3, pb: 3 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

function ImageField({ label, value, onChange, hint }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      <Box display="flex" alignItems="center" gap={1.5}>
        <Box sx={{
          width: 80, height: 56, borderRadius: 1, border: "1.5px dashed #ccc", flexShrink: 0,
          backgroundImage: value ? `url(${value})` : "none",
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb",
        }}>
          {!value && <ImageIcon fontSize="small" />}
        </Box>
        <Box flex={1}>
          <TextField size="small" fullWidth placeholder="https://… or paste a URL"
            value={value || ""} onChange={e => onChange(e.target.value)} />
          <Button size="small" component="label" sx={{ mt: 0.5, fontSize: 11 }}>
            Upload file
            <input type="file" accept="image/*" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) onChange(URL.createObjectURL(f)); }} />
          </Button>
          {hint && <Typography variant="caption" color="text.secondary" display="block">{hint}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}

const safeOpeningHours = (val) => {
  if (!val) return "";
  if (typeof val === "object") return "Schedule Set (Object)";
  return val;
};

/* ── Decorator page sections ─────────────────────────────────────────────── */
function DecoratorPageSections({ profile, set, brandColor }) {
  const portfolioItems = profile.portfolioItems?.length > 0
    ? profile.portfolioItems
    : [{ before: "", after: "", label: "" }];

  const updatePortfolio = (i, field, val) => {
    set("portfolioItems", portfolioItems.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const services = profile.services?.length > 0 ? profile.services : [{ name: "" }];

  return (
    <>
      <Section title="🦸 Hero Section" defaultExpanded>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Eyebrow / Tagline"
              placeholder="London's Trusted Decorators"
              value={profile.heroTagline || ""}
              onChange={e => set("heroTagline", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="CTA Button Text"
              placeholder="Get Your Free Quote"
              value={profile.heroCtaText || ""}
              onChange={e => set("heroCtaText", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Heading Line 1"
              placeholder="Home Painting,"
              value={profile.heroHeadingLine1 || ""}
              onChange={e => set("heroHeadingLine1", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Heading Line 2 (italic accent)"
              placeholder="Done Right."
              value={profile.heroHeadingLine2 || ""}
              onChange={e => set("heroHeadingLine2", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Sub-text" multiline rows={2}
              placeholder="Fully insured. Results guaranteed."
              value={profile.heroSubtext || ""}
              onChange={e => set("heroSubtext", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Hero Badge Text"
              placeholder="Rated by 30+ Homeowners"
              value={profile.heroReviewText || ""}
              onChange={e => set("heroReviewText", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <ImageField label="Hero Background Image"
              hint="Full-width background image for the hero section"
              value={profile.heroImage || ""}
              onChange={v => set("heroImage", v)} />
          </Grid>
        </Grid>
      </Section>

      <Section title="📖 About Section">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Section Label"
              placeholder="Who We Are"
              value={profile.aboutTagline || ""}
              onChange={e => set("aboutTagline", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Section Heading"
              placeholder="Craft, care &amp; a flawless finish"
              value={profile.aboutHeading || ""}
              onChange={e => set("aboutHeading", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={4} label="About Body Text"
              placeholder="With over 10 years of experience in high-end residential painting…"
              value={profile.aboutBody || profile.aboutUs || ""}
              onChange={e => set("aboutBody", e.target.value)} />
          </Grid>
        </Grid>
      </Section>

      <Section title="🛠️ Services Section">
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Services Heading"
              placeholder="Everything your home needs"
              value={profile.servicesHeading || ""}
              onChange={e => set("servicesHeading", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <ImageField label="Services section side image"
              value={profile.servicesImage || ""}
              onChange={v => set("servicesImage", v)} />
          </Grid>
        </Grid>
        {services.map((svc, i) => (
          <Box key={i} display="flex" gap={1} mb={1}>
            <TextField fullWidth size="small" label={`Service ${i + 1}`}
              value={svc.name || (typeof svc === "string" ? svc : "")}
              onChange={e => {
                const updated = services.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s);
                set("services", updated);
              }} />
            <IconButton size="small" color="error"
              onClick={() => set("services", services.filter((_, idx) => idx !== i))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor, mt: 1 }}
          onClick={() => set("services", [...services, { name: "" }])}>
          Add Service
        </Button>
      </Section>

      <Section title="🖼️ Before &amp; After Portfolio">
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Portfolio Heading"
              placeholder="Recent transformations"
              value={profile.portfolioHeading || ""}
              onChange={e => set("portfolioHeading", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Portfolio Sub-text"
              placeholder="Drag the slider to reveal the difference…"
              value={profile.portfolioSubtext || ""}
              onChange={e => set("portfolioSubtext", e.target.value)} />
          </Grid>
        </Grid>
        {portfolioItems.map((item, i) => (
          <Box key={i} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Portfolio Item {i + 1}</Typography>
              <IconButton size="small" color="error"
                onClick={() => set("portfolioItems", portfolioItems.filter((_, idx) => idx !== i))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <ImageField label="Before image" value={item.before || ""} onChange={v => updatePortfolio(i, "before", v)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ImageField label="After image" value={item.after || ""} onChange={v => updatePortfolio(i, "after", v)} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Caption / Location"
                  placeholder="Living Room — SW London"
                  value={item.label || ""}
                  onChange={e => updatePortfolio(i, "label", e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor }}
          onClick={() => set("portfolioItems", [...portfolioItems, { before: "", after: "", label: "" }])}>
          Add Portfolio Item
        </Button>
      </Section>

      <Section title="📊 Stats Bar">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Four stats shown in the about section.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["stat1Value", "stat1Label", "10+",  "Years of experience"],
            ["stat2Value", "stat2Label", "200+", "Projects completed"],
            ["stat3Value", "stat3Label", "30+",  "Five-star reviews"],
            ["stat4Value", "stat4Label", "100%", "Satisfaction guaranteed"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label={`Stat ${i + 1} — Number`} placeholder={nDef}
                  value={profile[nKey] || ""} onChange={e => set(nKey, e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label={`Stat ${i + 1} — Label`} placeholder={lDef}
                  value={profile[lKey] || ""} onChange={e => set(lKey, e.target.value)} />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/* ── Hairdresser page sections ───────────────────────────────────────────── */
function HairdresserPageSections({ profile, set, brandColor }) {
  const services = profile.services?.length > 0 ? profile.services : [
    { name: "Cut & Blow Dry", duration: "60 min", price: 65 },
    { name: "Full Colour",    duration: "2 hrs",  price: 110 },
  ];
  const updateService = (i, field, val) => {
    set("services", services.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  return (
    <>
      <Section title="🦸 Hero Section" defaultExpanded>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Eyebrow / Tagline"
              placeholder="London's Premier Hair Salon"
              value={profile.heroTagline || ""}
              onChange={e => set("heroTagline", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="CTA Button Text"
              placeholder="Book Your Appointment"
              value={profile.heroCtaText || ""}
              onChange={e => set("heroCtaText", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Heading Line 1"
              placeholder="Where Every"
              value={profile.heroHeadingLine1 || ""}
              onChange={e => set("heroHeadingLine1", e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Heading Line 2 (italic accent)"
              placeholder="Strand Shines"
              value={profile.heroHeadingLine2 || ""}
              onChange={e => set("heroHeadingLine2", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Sub-text" multiline rows={2}
              placeholder="Expert colour, precision cuts and transformative styling."
              value={profile.heroSubtext || ""}
              onChange={e => set("heroSubtext", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <ImageField label="Hero Image (split-screen)"
              hint="Left-side image in the hero section. Recommended: portrait crop."
              value={profile.heroImage || ""}
              onChange={v => set("heroImage", v)} />
          </Grid>
        </Grid>
      </Section>

      <Section title="📖 About / Our Story">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Section Heading"
              placeholder="Our story, your style"
              value={profile.aboutHeading || ""}
              onChange={e => set("aboutHeading", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Pull Quote"
              placeholder='"We believe great hair is the foundation of everyday confidence."'
              value={profile.aboutQuote || ""}
              onChange={e => set("aboutQuote", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={4} label="About Body Text"
              placeholder="Founded on the belief that every person deserves hair they love…"
              value={profile.aboutBody || profile.aboutUs || ""}
              onChange={e => set("aboutBody", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <ImageField label="About Section Image (portrait)"
              hint="Recommended: 3:4 portrait crop, min 800px wide"
              value={profile.heroImageMobile || ""}
              onChange={v => set("heroImageMobile", v)} />
          </Grid>
        </Grid>
      </Section>

      <Section title="✂️ Services List">
        <Box mb={2}>
          <ImageField label="Services section side image"
            hint="Appears beside your services list"
            value={profile.servicesImage || ""}
            onChange={v => set("servicesImage", v)} />
        </Box>
        {services.map((svc, i) => (
          <Box key={i} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2, mb: 1.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Service {i + 1}</Typography>
              <IconButton size="small" color="error"
                onClick={() => set("services", services.filter((_, idx) => idx !== i))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Name" value={svc.name || ""} onChange={e => updateService(i, "name", e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Duration" placeholder="60 min" value={svc.duration || ""} onChange={e => updateService(i, "duration", e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Price (£)" placeholder="65" value={svc.price || ""} onChange={e => updateService(i, "price", e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor, mt: 0.5 }}
          onClick={() => set("services", [...services, { name: "", duration: "", price: "" }])}>
          Add Service
        </Button>
      </Section>

      <Section title="📊 Stats Bar">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Three stats shown in the brand-colour strip beneath the hero.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["stat1Value", "stat1Label", "12+",   "Years of expertise"],
            ["stat2Value", "stat2Label", "5.0★",  "Average rating"],
            ["stat3Value", "stat3Label", "400+",  "Happy clients monthly"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label={`Stat ${i + 1} — Number`} placeholder={nDef}
                  value={profile[nKey] || ""} onChange={e => set(nKey, e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label={`Stat ${i + 1} — Label`} placeholder={lDef}
                  value={profile[lKey] || ""} onChange={e => set(lKey, e.target.value)} />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/* ── Trainer page sections ───────────────────────────────────────────────── */
function TrainerPageSections({ profile, set, brandColor }) {
  const specializations = (profile.specializations?.length > 0 ? profile.specializations : null) || [
    { title: "Strength & Conditioning",    description: "Build raw power and muscular endurance through proven compound lifting and progressive overload." },
    { title: "Fat Loss & Transformation",  description: "Science-backed nutrition guidance paired with high-intensity training protocols for real results." },
    { title: "Functional Fitness",          description: "Outdoor resistance training focused on real-world movement patterns that carry over to daily life." },
    { title: "1-to-1 Coaching",             description: "Fully personalised sessions tailored to your goals, schedule, and current level of fitness." },
  ];
  const setSpec = (i, field, val) => {
    set("specializations", specializations.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const pricingPlans = (profile.pricingPlans?.length > 0 ? profile.pricingPlans : null) || [
    { name: "Taster",   price: "£40",  period: "one-off",   features: ["60-min session", "Fitness assessment"], highlight: false },
    { name: "Monthly",  price: "£280", period: "per month", features: ["8 sessions/month", "Nutrition guidance", "Progress tracking"], highlight: true },
    { name: "10-Block", price: "£350", period: "block",     features: ["10 × 60-min sessions", "Flexible scheduling", "Priority booking"], highlight: false },
  ];
  const setPlan = (i, field, val) => {
    set("pricingPlans", pricingPlans.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };
  const setPlanFeature = (planIdx, featIdx, val) => {
    set("pricingPlans", pricingPlans.map((p, i) => {
      if (i !== planIdx) return p;
      return { ...p, features: p.features.map((f, j) => j === featIdx ? val : f) };
    }));
  };

  return (
    <>
      <Section title="🦸 Hero Section" defaultExpanded>
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <TextField fullWidth label="Main Heading"
              placeholder={"Stronger.\nLeaner.\nUnstoppable."}
              multiline rows={3}
              value={profile.heroTitle || ""}
              onChange={e => set("heroTitle", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Sub-text"
              placeholder="Tailored high-performance outdoor functional resistance training."
              value={profile.heroSubtitle || ""}
              onChange={e => set("heroSubtitle", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <ImageField label="Hero Background Image"
              hint="Dark overlay applied automatically"
              value={profile.heroBgImage || ""}
              onChange={v => set("heroBgImage", v)} />
          </Grid>
        </Grid>
      </Section>

      <Section title="👤 About / Coach Section">
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Coach / Trainer Name" placeholder="Your Name"
              value={profile.coachName || ""}
              onChange={e => set("coachName", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="About Paragraph 1"
              value={profile.aboutText1 || ""}
              onChange={e => set("aboutText1", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="About Paragraph 2"
              value={profile.aboutText2 || ""}
              onChange={e => set("aboutText2", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <ImageField label="Coach / About Section Image"
              hint="Portrait image shown beside your about text"
              value={profile.heroImage || ""}
              onChange={v => set("heroImage", v)} />
          </Grid>
        </Grid>
      </Section>

      <Section title="📊 Stats Bar">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Three stats shown in the brand-colour strip beneath the hero.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["statBar1Num", "statBar1Label", "100+", "Happy Clients"],
            ["statBar2Num", "statBar2Label", "5.0★", "Average Rating"],
            ["statBar3Num", "statBar3Label", "Pro",  "Certified Trainer"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label={`Stat ${i + 1} — Number`} placeholder={nDef}
                  value={profile[nKey] || ""} onChange={e => set(nKey, e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label={`Stat ${i + 1} — Label`} placeholder={lDef}
                  value={profile[lKey] || ""} onChange={e => set(lKey, e.target.value)} />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>

      <Section title="▶ YouTube Video">
        <TextField fullWidth label="YouTube Video URL"
          placeholder="https://youtube.com/watch?v=…"
          value={profile.youtubeUrl || ""}
          onChange={e => set("youtubeUrl", e.target.value)}
          helperText="A full-width video section appears on your page when this is set." />
      </Section>

      <Section title="💪 Areas of Expertise">
        {specializations.map((spec, i) => (
          <Box key={i} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2.5, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography fontWeight={600} fontSize={14}>Service {i + 1}</Typography>
              <IconButton size="small" color="error"
                onClick={() => set("specializations", specializations.filter((_, idx) => idx !== i))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="Title" value={spec.title || ""} onChange={e => setSpec(i, "title", e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth size="small" label="Description" multiline rows={2} value={spec.description || ""} onChange={e => setSpec(i, "description", e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor }}
          onClick={() => set("specializations", [...specializations, { title: "", description: "" }])}>
          Add Service
        </Button>
      </Section>

      <Section title="💰 Pricing Plans">
        {pricingPlans.map((plan, i) => (
          <Box key={i} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2.5, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography fontWeight={600} fontSize={14}>Plan {i + 1}{plan.highlight ? " ⭐ Most Popular" : ""}</Typography>
              <Box display="flex" gap={1}>
                <Button size="small" variant={plan.highlight ? "contained" : "outlined"}
                  sx={{ fontSize: 11, ...(plan.highlight ? { bgcolor: brandColor } : {}) }}
                  onClick={() => setPlan(i, "highlight", !plan.highlight)}>
                  {plan.highlight ? "★ Featured" : "Mark as Featured"}
                </Button>
                <IconButton size="small" color="error"
                  onClick={() => set("pricingPlans", pricingPlans.filter((_, idx) => idx !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Plan Name" placeholder="Monthly" value={plan.name || ""} onChange={e => setPlan(i, "name", e.target.value)} /></Grid>
              <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Price" placeholder="£280" value={plan.price || ""} onChange={e => setPlan(i, "price", e.target.value)} /></Grid>
              <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Period" placeholder="per month" value={plan.period || ""} onChange={e => setPlan(i, "period", e.target.value)} /></Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" display="block" mt={2} mb={1}>Features</Typography>
            {(plan.features || []).map((feat, j) => (
              <Box key={j} display="flex" gap={1} mb={1}>
                <TextField fullWidth size="small" value={feat} onChange={e => setPlanFeature(i, j, e.target.value)} />
                <IconButton size="small" color="error"
                  onClick={() => setPlan(i, "features", plan.features.filter((_, fi) => fi !== j))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddCircleIcon />} sx={{ color: brandColor, mt: 0.5 }}
              onClick={() => setPlan(i, "features", [...(plan.features || []), ""])}>
              Add feature
            </Button>
          </Box>
        ))}
        <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor }}
          onClick={() => set("pricingPlans", [...pricingPlans, { name: "", price: "", period: "", features: [], highlight: false }])}>
          Add Plan
        </Button>
      </Section>
    </>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function EditPageTab({
  profile, setProfile, brandColor, userRole,
  profilePreview, setProfileFile, setProfilePreview,
  handleDeleteProfile, handleImageChange,
  businessType,
}) {
  const set = (key, val) => setProfile(prev => ({ ...prev, [key]: val }));
  const type = businessType || profile?.businessType;

  const typeLabel = {
    hairdresser: "Salon",
    decorator:   "Decorator",
    trainer:     "PT / Trainer",
  }[type] || "Page";

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={0.5}>
        Edit Your {typeLabel} Page
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Edit your profile details and every section of your public page. Press <strong>Save Profile</strong> in the header to publish changes.
      </Typography>

      {/* ── Your Profile ── */}
      <Section title="👤 Your Profile" defaultExpanded>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar
            src={profilePreview || profile.profilePic}
            sx={{ width: 90, height: 90, mb: 2, border: `3px solid ${brandColor}` }}
          />
          <Button variant="outlined" component="label" size="small">
            Change Photo
            <input
              type="file" hidden accept="image/*"
              onChange={e => handleImageChange(e, setProfileFile, setProfilePreview)}
            />
          </Button>
        </Box>

        <Grid container spacing={2.5}>
          {/* Full Name — hairdresser only */}
          {type === "hairdresser" && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full Name"
                value={profile.name || ""}
                fullWidth
                onChange={e => set("name", e.target.value)}
              />
            </Grid>
          )}

          {/* Opening Times — hairdresser only */}
          {type === "hairdresser" && userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Opening Times"
                value={safeOpeningHours(profile.openingHours)}
                fullWidth multiline rows={3}
                placeholder={"e.g. Mon-Fri 9am-6pm\nSat: 10am-4pm\nSun: Closed"}
                onChange={e => set("openingHours", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                      <AccessTimeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              value={profile.phone || ""}
              fullWidth
              onChange={e => set("phone", e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Business Email"
              type="email"
              placeholder="hello@yourbusiness.com"
              value={profile.businessEmail || profile.contactEmail || ""}
              fullWidth
              onChange={e => set("businessEmail", e.target.value)}
            />
          </Grid>

          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Location / Address"
                value={profile.address || ""}
                fullWidth
                onChange={e => set("address", e.target.value)}
              />
            </Grid>
          )}

          {/* Specialty — hairdresser only */}
          {type === "hairdresser" && (
            <Grid item xs={12}>
              <TextField
                label="Specialty"
                value={profile.specialty || ""}
                fullWidth
                onChange={e => set("specialty", e.target.value)}
              />
            </Grid>
          )}

          {/* Personal Bio — hairdresser only */}
          {type === "hairdresser" && (
            <Grid item xs={12}>
              <TextField
                label="Personal Bio"
                value={profile.bio || ""}
                fullWidth multiline rows={2}
                onChange={e => set("bio", e.target.value)}
              />
            </Grid>
          )}
        </Grid>
      </Section>

      {/* ── Social Media ── */}
      <Section title="🔗 Social Media & Contact">
        <Typography variant="body2" color="text.secondary" mb={2}>
          These appear in the footer of your public page.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Instagram URL"
              placeholder="https://instagram.com/yourhandle"
              fullWidth
              value={profile.instagramUrl || ""}
              onChange={e => set("instagramUrl", e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <InstagramIcon fontSize="small" sx={{ color: "#E1306C" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="TikTok URL"
              placeholder="https://tiktok.com/@yourhandle"
              fullWidth
              value={profile.tiktokUrl || ""}
              onChange={e => set("tiktokUrl", e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ display: "flex", alignItems: "center", color: "#000" }}>
                      <TikTokIcon size={18} />
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Facebook URL"
                placeholder="https://facebook.com/yourpage"
                fullWidth
                value={profile.facebookUrl || ""}
                onChange={e => set("facebookUrl", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FacebookIcon fontSize="small" sx={{ color: "#1877F2" }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}
        </Grid>
      </Section>

      {/* ── Business-type specific page content ── */}
      {type === "decorator"   && <DecoratorPageSections  profile={profile} set={set} brandColor={brandColor} />}
      {type === "hairdresser" && <HairdresserPageSections profile={profile} set={set} brandColor={brandColor} />}
      {type === "trainer"     && <TrainerPageSections     profile={profile} set={set} brandColor={brandColor} />}

      {/* ── Danger Zone ── */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="subtitle2" color="error" gutterBottom fontWeight={700}>
        Danger Zone
      </Typography>
      <Button
        variant="outlined" color="error"
        startIcon={<DeleteIcon />}
        onClick={handleDeleteProfile}
      >
        Delete My Profile
      </Button>
    </Box>
  );
}
