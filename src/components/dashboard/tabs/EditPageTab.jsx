import React from "react";
import {
  Box,
  Avatar,
  Button,
  Grid,
  TextField,
  Typography,
  Divider,
  InputAdornment,
  IconButton,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Delete as DeleteIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  AddCircle as AddCircleIcon,
  WhatsApp as WhatsAppIcon,
} from "@mui/icons-material";
import {
  TikTokIcon,
  Section,
  ImageField,
  safeOpeningHours,
  PortfolioSection,
} from "./sharedFormComponents";
import { PLUMBER_SERVICE_CATEGORIES } from "../../../utils/tradeJobs";

/* ── Decorator page sections ─────────────────────────────────────────────── */
function DecoratorPageSections({ profile, set, brandColor, barberId }) {
  const portfolioItems =
    profile.portfolioItems?.length > 0
      ? profile.portfolioItems
      : [{ before: "", after: "", label: "" }];

  const updatePortfolio = (i, field, val) => {
    set(
      "portfolioItems",
      portfolioItems.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)),
    );
  };

  const services =
    profile.services?.length > 0 ? profile.services : [{ name: "" }];

  return (
    <>
      <Section title="Top of your page" defaultExpanded>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Business Name"
              placeholder="Reeves Plumbing & Heating"
              value={profile.businessName || ""}
              onChange={(e) => set("businessName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Small text above the heading"
              placeholder="London's Trusted Decorators"
              value={profile.heroTagline || ""}
              onChange={(e) => set("heroTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Button text"
              placeholder="Get Your Free Quote"
              value={profile.heroCtaText || ""}
              onChange={(e) => set("heroCtaText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Main heading"
              placeholder="Home Painting,"
              value={profile.heroHeadingLine1 || ""}
              onChange={(e) => set("heroHeadingLine1", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Highlighted heading"
              placeholder="Done Right."
              value={profile.heroHeadingLine2 || ""}
              onChange={(e) => set("heroHeadingLine2", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Short introduction"
              multiline
              rows={2}
              placeholder="Fully insured. Results guaranteed."
              value={profile.heroSubtext || ""}
              onChange={(e) => set("heroSubtext", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Trust message"
              placeholder="Rated by 30+ Homeowners"
              value={profile.heroReviewText || ""}
              onChange={(e) => set("heroReviewText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Main page image"
              hint="This photo appears behind the heading at the top of your page."
              value={profile.heroImage || ""}
              onChange={(v) => set("heroImage", v)}
              barberId={barberId}
              fieldKey="hero_bg"
              preview={{
                eyebrow: profile.heroTagline || "Your trusted local decorators",
                heading: profile.heroHeadingLine1 || "Beautiful spaces,",
                accent: profile.heroHeadingLine2 || "finished properly.",
                body: profile.heroSubtext || "Quality work, clear communication and a finish you can be proud of.",
                button: profile.heroCtaText || "Get a free quote",
                brandColor,
              }}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="About your business">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Small heading"
              placeholder="Who We Are"
              value={profile.aboutTagline || ""}
              onChange={(e) => set("aboutTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Main heading"
              placeholder="Craft, care &amp; a flawless finish"
              value={profile.aboutHeading || ""}
              onChange={(e) => set("aboutHeading", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="About your business"
              placeholder="With over 10 years of experience in high-end residential painting…"
              value={profile.aboutBody || profile.aboutUs || ""}
              onChange={(e) => set("aboutBody", e.target.value)}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Services on your page">
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Services heading"
              placeholder="Everything your home needs"
              value={profile.servicesHeading || ""}
              onChange={(e) => set("servicesHeading", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Photo beside your services"
              hint="Shown beside your services list, further down the page from the hero"
              value={profile.servicesImage || ""}
              onChange={(v) => set("servicesImage", v)}
              barberId={barberId}
              fieldKey="services_img"
            />
          </Grid>
        </Grid>
        {services.map((svc, i) => (
          <Box key={i} display="flex" gap={1} mb={1}>
            <TextField
              fullWidth
              size="small"
              label={`Service ${i + 1}`}
              value={svc.name || (typeof svc === "string" ? svc : "")}
              onChange={(e) => {
                const updated = services.map((s, idx) =>
                  idx === i ? { ...s, name: e.target.value } : s,
                );
                set("services", updated);
              }}
            />
            <IconButton
              size="small"
              color="error"
              onClick={() =>
                set(
                  "services",
                  services.filter((_, idx) => idx !== i),
                )
              }
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor, mt: 1 }}
          onClick={() => set("services", [...services, { name: "" }])}
        >
          Add Service
        </Button>
      </Section>

      <Section title="Before and after gallery">
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Gallery heading"
              placeholder="Recent transformations"
              value={profile.portfolioHeading || ""}
              onChange={(e) => set("portfolioHeading", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Gallery introduction"
              placeholder="Drag the slider to reveal the difference…"
              value={profile.portfolioSubtext || ""}
              onChange={(e) => set("portfolioSubtext", e.target.value)}
            />
          </Grid>
        </Grid>
        {portfolioItems.map((item, i) => (
          <Box
            key={i}
            sx={{ border: "1px solid #eee", borderRadius: 2, p: 2, mb: 2 }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1.5}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
              >
                Portfolio Item {i + 1}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  set(
                    "portfolioItems",
                    portfolioItems.filter((_, idx) => idx !== i),
                  )
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <ImageField
                  label="Before image"
                  value={item.before || ""}
                  onChange={(v) => updatePortfolio(i, "before", v)}
                  barberId={barberId}
                  fieldKey={`portfolio_${i}_before`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ImageField
                  label="After image"
                  value={item.after || ""}
                  onChange={(v) => updatePortfolio(i, "after", v)}
                  barberId={barberId}
                  fieldKey={`portfolio_${i}_after`}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Caption / Location"
                  placeholder="Living Room — SW London"
                  value={item.label || ""}
                  onChange={(e) => updatePortfolio(i, "label", e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor }}
          onClick={() =>
            set("portfolioItems", [
              ...portfolioItems,
              { before: "", after: "", label: "" },
            ])
          }
        >
          Add Portfolio Item
        </Button>
      </Section>

      <Section title="Business highlights">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Four stats shown in the about section.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(profile.emergencyCallouts)}
                  onChange={(event) =>
                    set("emergencyCallouts", event.target.checked)
                  }
                />
              }
              label="Show emergency call-outs available"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(profile.insured)}
                  onChange={(event) => set("insured", event.target.checked)}
                />
              }
              label="Show insured status"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Insurance or accreditation text"
              placeholder="Fully insured"
              value={profile.insuranceText || ""}
              onChange={(event) => set("insuranceText", event.target.value)}
            />
          </Grid>
          {[
            ["stat1Value", "stat1Label", "10+", "Years of experience"],
            ["stat2Value", "stat2Label", "200+", "Projects completed"],
            ["stat3Value", "stat3Label", "30+", "Five-star reviews"],
            ["stat4Value", "stat4Label", "100%", "Satisfaction guaranteed"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Number`}
                  placeholder={nDef}
                  value={profile[nKey] || ""}
                  onChange={(e) => set(nKey, e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Label`}
                  placeholder={lDef}
                  value={profile[lKey] || ""}
                  onChange={(e) => set(lKey, e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/* ── Hairdresser page sections ───────────────────────────────────────────── */
function HairdresserPageSections({ profile, set, brandColor, barberId }) {
  const services =
    profile.services?.length > 0
      ? profile.services
      : [
          { name: "Cut & Blow Dry", duration: "60 min", price: 65 },
          { name: "Full Colour", duration: "2 hrs", price: 110 },
        ];
  const updateService = (i, field, val) => {
    set(
      "services",
      services.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)),
    );
  };

  return (
    <>
      <Section title="Top of your page" defaultExpanded>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Small text above the heading"
              placeholder="London's Premier Hair Salon"
              value={profile.heroTagline || ""}
              onChange={(e) => set("heroTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Button text"
              placeholder="Book Your Appointment"
              value={profile.heroCtaText || ""}
              onChange={(e) => set("heroCtaText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Main heading"
              placeholder="Where Every"
              value={profile.heroHeadingLine1 || ""}
              onChange={(e) => set("heroHeadingLine1", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Highlighted heading"
              placeholder="Strand Shines"
              value={profile.heroHeadingLine2 || ""}
              onChange={(e) => set("heroHeadingLine2", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Short introduction"
              multiline
              rows={2}
              placeholder="Expert colour, precision cuts and transformative styling."
              value={profile.heroSubtext || ""}
              onChange={(e) => set("heroSubtext", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Main page image"
              hint="This photo appears beside the heading at the top of your page. A portrait photo works best."
              value={profile.heroImage || ""}
              onChange={(v) => set("heroImage", v)}
              barberId={barberId}
              fieldKey="hero_image"
              preview={{
                eyebrow: profile.heroTagline || "Your local hair salon",
                heading: profile.heroHeadingLine1 || "Hair that feels",
                accent: profile.heroHeadingLine2 || "like you.",
                body: profile.heroSubtext || "Expert colour, precision cuts and styling made personal.",
                button: profile.heroCtaText || "Book an appointment",
                brandColor,
                position: "center top",
              }}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="About your salon">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Section Heading"
              placeholder="Our story, your style"
              value={profile.aboutHeading || ""}
              onChange={(e) => set("aboutHeading", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Pull Quote"
              placeholder='"We believe great hair is the foundation of everyday confidence."'
              value={profile.aboutQuote || ""}
              onChange={(e) => set("aboutQuote", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="About Body Text"
              placeholder="Founded on the belief that every person deserves hair they love…"
              value={profile.aboutBody || profile.aboutUs || ""}
              onChange={(e) => set("aboutBody", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Photo beside your story"
              hint="Recommended: 3:4 portrait crop, min 800px wide"
              value={profile.heroImageMobile || ""}
              onChange={(v) => set("heroImageMobile", v)}
              barberId={barberId}
              fieldKey="about_image"
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Services on your page">
        <Box mb={2}>
          <ImageField
            label="Photo beside your services"
            hint="Appears beside your services list"
            value={profile.servicesImage || ""}
            onChange={(v) => set("servicesImage", v)}
            barberId={barberId}
            fieldKey="services_image"
          />
        </Box>
        {services.map((svc, i) => (
          <Box
            key={i}
            sx={{ border: "1px solid #eee", borderRadius: 2, p: 2, mb: 1.5 }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
              >
                Service {i + 1}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  set(
                    "services",
                    services.filter((_, idx) => idx !== i),
                  )
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Name"
                  value={svc.name || ""}
                  onChange={(e) => updateService(i, "name", e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Duration"
                  placeholder="60 min"
                  value={svc.duration || ""}
                  onChange={(e) => updateService(i, "duration", e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Price (£)"
                  placeholder="65"
                  value={svc.price || ""}
                  onChange={(e) => updateService(i, "price", e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor, mt: 0.5 }}
          onClick={() =>
            set("services", [
              ...services,
              { name: "", duration: "", price: "" },
            ])
          }
        >
          Add Service
        </Button>
      </Section>

      <PortfolioSection
        profile={profile}
        set={set}
        brandColor={brandColor}
        barberId={barberId}
        headingPlaceholder="Recent transformations"
        subtextPlaceholder="Drag the slider on each image to reveal the difference a fresh cut and colour makes."
      />

      <Section title="Business highlights">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Three stats shown in the brand-colour strip beneath the hero.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["stat1Value", "stat1Label", "12+", "Years of expertise"],
            ["stat2Value", "stat2Label", "5.0★", "Average rating"],
            ["stat3Value", "stat3Label", "400+", "Happy clients monthly"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Number`}
                  placeholder={nDef}
                  value={profile[nKey] || ""}
                  onChange={(e) => set(nKey, e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Label`}
                  placeholder={lDef}
                  value={profile[lKey] || ""}
                  onChange={(e) => set(lKey, e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/* ── Barber page sections ────────────────────────────────────────────────── */
function BarberPageSections({ profile, set, brandColor, barberId }) {
  const services =
    profile.services?.length > 0 ? profile.services : [{ name: "", price: "" }];
  const updateService = (i, field, val) => {
    set(
      "services",
      services.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)),
    );
  };

  return (
    <>
      <Section title="Top of your page" defaultExpanded>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Small text above the heading"
              placeholder="WELCOME TO"
              value={profile.heroTagline || ""}
              onChange={(e) => set("heroTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Booking button text"
              placeholder="BOOK APPOINTMENT"
              value={profile.heroCtaText || ""}
              onChange={(e) => set("heroCtaText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Main heading"
              placeholder={profile.businessName || "Your barber shop name"}
              helperText="Leave blank to use your business name"
              value={profile.heroHeadingLine1 || ""}
              onChange={(e) => set("heroHeadingLine1", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Short introduction"
              placeholder="Sharp cuts, clean lines and a proper welcome."
              value={profile.heroSubtext || ""}
              onChange={(e) => set("heroSubtext", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Rating line"
              placeholder="5.0/5.0 Top Rated Excellence"
              value={profile.heroReviewText || ""}
              onChange={(e) => set("heroReviewText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Live queue button text"
              placeholder="View Live Queue"
              value={profile.queueCtaText || ""}
              onChange={(e) => set("queueCtaText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Main hero image"
              hint="This is the large photo at the top of your barber page. Use a wide, high-quality shop or haircut photo."
              value={profile.heroImage || ""}
              onChange={(v) => set("heroImage", v)}
              barberId={barberId}
              fieldKey="barber_hero_desktop"
              preview={{
                eyebrow: profile.heroTagline || "WELCOME TO",
                heading: profile.heroHeadingLine1 || profile.businessName || "Your barber shop",
                body: profile.heroSubtext || "Sharp cuts, clean lines and a proper welcome.",
                button: profile.heroCtaText || "BOOK NOW",
                brandColor,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Mobile hero image (optional)"
              hint="A portrait crop shown on phones. If empty, the main hero image is used."
              value={profile.heroImageMobile || ""}
              onChange={(v) => set("heroImageMobile", v)}
              barberId={barberId}
              fieldKey="barber_hero_mobile"
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="About your barber shop">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Small heading"
              placeholder="OUR STORY"
              value={profile.aboutTagline || ""}
              onChange={(e) => set("aboutTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              size="small"
              label="Story heading"
              placeholder="East London craft, cut with intent."
              value={profile.aboutHeading || ""}
              onChange={(e) => set("aboutHeading", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Our Story"
              placeholder="Tell clients about the shop, your experience and what makes you different…"
              helperText="Shown in the Our Story section, like the Fade Factory demo"
              value={profile.aboutBody || profile.aboutUs || ""}
              onChange={(e) => { set("aboutBody", e.target.value); set("aboutUs", e.target.value); }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Story button text"
              placeholder="MEET THE TEAM"
              value={profile.aboutCtaText || ""}
              onChange={(e) => set("aboutCtaText", e.target.value)}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Business highlights">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Four stats shown in the dark trust strip below the hero.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["statBar1Num", "statBar1Label", "10+", "Years of craft"],
            ["statBar2Num", "statBar2Label", "5.0", "Client rating"],
            ["statBar3Num", "statBar3Label", "7", "Days a week"],
            ["statBar4Num", "statBar4Label", "LIVE", "Walk-in queue"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Number`}
                  placeholder={nDef}
                  value={profile[nKey] || ""}
                  onChange={(e) => set(nKey, e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Label`}
                  placeholder={lDef}
                  value={profile[lKey] || ""}
                  onChange={(e) => set(lKey, e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>

      <Section title="Services on your page">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Name and price for each service shown on your page.
        </Typography>
        {services.map((svc, i) => (
          <Box key={i} display="flex" gap={1} mb={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              label={`Service ${i + 1}`}
              value={svc.name || (typeof svc === "string" ? svc : "")}
              onChange={(e) => updateService(i, "name", e.target.value)}
            />
            <TextField
              size="small"
              label="Price (£)"
              sx={{ width: 120, flexShrink: 0 }}
              value={svc.price || ""}
              onChange={(e) => updateService(i, "price", e.target.value)}
            />
            <IconButton
              size="small"
              color="error"
              onClick={() =>
                set(
                  "services",
                  services.filter((_, idx) => idx !== i),
                )
              }
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor, mt: 1 }}
          onClick={() =>
            set("services", [...services, { name: "", price: "" }])
          }
        >
          Add Service
        </Button>
      </Section>

      <PortfolioSection
        profile={profile}
        set={set}
        brandColor={brandColor}
        barberId={barberId}
        headingPlaceholder="Recent work"
        subtextPlaceholder="Drag the slider on each image to reveal the difference a professional cut makes."
      />

      <Section title="Section headings and buttons">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Change the wording used throughout the barber home page.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["portfolioEyebrow", "Gallery small heading", "GALLERY"],
            ["servicesEyebrow", "Services small heading", "SERVICES"],
            ["servicesHeading", "Services heading", "What We Offer"],
            ["standardsHeading", "Standards panel heading", "The Fade Factory standard"],
            ["visitHeading", "Location heading", "Visit Us"],
            ["directionsCtaText", "Directions button text", "GET DIRECTIONS"],
            ["hoursHeading", "Opening hours heading", "Opening Hours"],
            ["closedLabel", "Closed-day label", "Closed"],
            ["hoursFallbackText", "Opening-hours fallback", "Contact us for opening times"],
            ["availabilityEyebrow", "Solo booking small heading", "AVAILABILITY"],
            ["availabilityHeading", "Solo booking heading", "Book Your Appointment"],
            ["teamEyebrow", "Team small heading", "EXPERTS"],
            ["teamHeading", "Team heading", "Our Master Barbers"],
            ["whatsappCtaText", "WhatsApp button text", "Or enquire via WhatsApp"],
            ["reviewsEyebrow", "Reviews small heading", "Testimonials"],
            ["reviewsHeading", "Reviews heading", "What Our Clients Say"],
            ["verifiedClientLabel", "Verified-review label", "Verified Client"],
            ["noReviewsHeading", "No-reviews heading", "No reviews yet"],
            ["noReviewsBody", "No-reviews message", "Be the first to share your experience."],
          ].map(([key, label, placeholder]) => (
            <Grid item xs={12} sm={6} key={key}>
              <TextField
                fullWidth
                size="small"
                label={label}
                placeholder={placeholder}
                value={profile[key] || ""}
                onChange={(e) => set(key, e.target.value)}
              />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section title="The barber shop standard">
        <Grid container spacing={2}>
          {[
            ["standard1Title", "standard1Body", "Detail first", "Clean lines, balanced shape and a finish built around you."],
            ["standard2Title", "standard2Body", "Premium finish", "Considered service from consultation through to the final detail."],
            ["standard3Title", "standard3Body", "Time respected", "Book ahead or check the live queue before you set off."],
          ].map(([titleKey, bodyKey, titlePlaceholder, bodyPlaceholder], index) => (
            <React.Fragment key={titleKey}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Standard ${index + 1} title`}
                  placeholder={titlePlaceholder}
                  value={profile[titleKey] || ""}
                  onChange={(e) => set(titleKey, e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Standard ${index + 1} description`}
                  placeholder={bodyPlaceholder}
                  value={profile[bodyKey] || ""}
                  onChange={(e) => set(bodyKey, e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>

      <Section title="Team cards">
        <Grid container spacing={2}>
          {[
            ["ownerRoleLabel", "Owner role label", "Owner & Barber"],
            ["staffRoleLabel", "Staff role label", "Professional Barber"],
            ["depositLabel", "Deposit label", "Deposit"],
            ["staffCardCtaText", "Card button text", "BOOK NOW →"],
          ].map(([key, label, placeholder]) => (
            <Grid item xs={12} sm={6} key={key}>
              <TextField fullWidth size="small" label={label} placeholder={placeholder} value={profile[key] || ""} onChange={(e) => set(key, e.target.value)} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section title="Navigation and footer">
        <Grid container spacing={2}>
          {[
            ["navTeamLabel", "Team navigation label", "Our Team"],
            ["navAboutLabel", "About navigation label", "About"],
            ["navFindUsLabel", "Location navigation label", "Find Us"],
            ["navReviewsLabel", "Reviews navigation label", "Reviews"],
            ["navBookLabel", "Navigation booking button", "BOOK NOW"],
            ["footerSocialHeading", "Footer social heading", "Stay Connected"],
            ["footerLoginLabel", "Footer login link", "BARBER LOGIN"],
            ["footerPrivacyLabel", "Privacy link label", "Privacy Policy"],
            ["footerTermsLabel", "Terms link label", "Terms of Service"],
            ["footerCloseLabel", "Legal window close button", "CLOSE"],
          ].map(([key, label, placeholder]) => (
            <Grid item xs={12} sm={6} key={key}>
              <TextField fullWidth size="small" label={label} placeholder={placeholder} value={profile[key] || ""} onChange={(e) => set(key, e.target.value)} />
            </Grid>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/* ── Trainer page sections ───────────────────────────────────────────────── */
function TrainerPageSections({ profile, set, brandColor, barberId }) {
  const specializations = (profile.specializations?.length > 0
    ? profile.specializations
    : null) || [
    {
      title: "Strength & Conditioning",
      description:
        "Build raw power and muscular endurance through proven compound lifting and progressive overload.",
    },
    {
      title: "Fat Loss & Transformation",
      description:
        "Science-backed nutrition guidance paired with high-intensity training protocols for real results.",
    },
    {
      title: "Functional Fitness",
      description:
        "Outdoor resistance training focused on real-world movement patterns that carry over to daily life.",
    },
    {
      title: "1-to-1 Coaching",
      description:
        "Fully personalised sessions tailored to your goals, schedule, and current level of fitness.",
    },
  ];
  const setSpec = (i, field, val) => {
    set(
      "specializations",
      specializations.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)),
    );
  };

  const pricingPlans = (profile.pricingPlans?.length > 0
    ? profile.pricingPlans
    : null) || [
    {
      name: "Taster",
      price: "£40",
      period: "one-off",
      features: ["60-min session", "Fitness assessment"],
      highlight: false,
    },
    {
      name: "Monthly",
      price: "£280",
      period: "per month",
      features: ["8 sessions/month", "Nutrition guidance", "Progress tracking"],
      highlight: true,
    },
    {
      name: "10-Block",
      price: "£350",
      period: "block",
      features: [
        "10 × 60-min sessions",
        "Flexible scheduling",
        "Priority booking",
      ],
      highlight: false,
    },
  ];
  const setPlan = (i, field, val) => {
    set(
      "pricingPlans",
      pricingPlans.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)),
    );
  };
  const setPlanFeature = (planIdx, featIdx, val) => {
    set(
      "pricingPlans",
      pricingPlans.map((p, i) => {
        if (i !== planIdx) return p;
        return {
          ...p,
          features: p.features.map((f, j) => (j === featIdx ? val : f)),
        };
      }),
    );
  };

  return (
    <>
      <Section title="Top of your page" defaultExpanded>
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Main heading"
              placeholder={"Stronger.\nLeaner.\nUnstoppable."}
              multiline
              rows={3}
              value={profile.heroTitle || ""}
              onChange={(e) => set("heroTitle", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Short introduction"
              placeholder="Tailored high-performance outdoor functional resistance training."
              value={profile.heroSubtitle || ""}
              onChange={(e) => set("heroSubtitle", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Main page image"
              hint="This photo appears behind the heading at the top of your page."
              value={profile.heroBgImage || ""}
              onChange={(v) => set("heroBgImage", v)}
              barberId={barberId}
              fieldKey="hero_bg"
              preview={{
                eyebrow: "Personal training",
                heading: profile.heroTitle || "Stronger. Leaner.",
                accent: "Unstoppable.",
                body: profile.heroSubtitle || "Training built around your goals, fitness and lifestyle.",
                button: "Start training",
                brandColor,
              }}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="About your coaching">
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Coach / Trainer Name"
              placeholder="Your Name"
              value={profile.coachName || ""}
              onChange={(e) => set("coachName", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="About Paragraph 1"
              value={profile.aboutText1 || ""}
              onChange={(e) => set("aboutText1", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="About Paragraph 2"
              value={profile.aboutText2 || ""}
              onChange={(e) => set("aboutText2", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Photo beside your introduction"
              hint="Portrait image shown beside your about text"
              value={profile.heroImage || ""}
              onChange={(v) => set("heroImage", v)}
              barberId={barberId}
              fieldKey="about_image"
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Coaching highlights">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Three stats shown in the brand-colour strip beneath the hero.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["statBar1Num", "statBar1Label", "100+", "Happy Clients"],
            ["statBar2Num", "statBar2Label", "5.0★", "Average Rating"],
            ["statBar3Num", "statBar3Label", "Pro", "Certified Trainer"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Number`}
                  placeholder={nDef}
                  value={profile[nKey] || ""}
                  onChange={(e) => set(nKey, e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Label`}
                  placeholder={lDef}
                  value={profile[lKey] || ""}
                  onChange={(e) => set(lKey, e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>

      <Section title="Video on your page">
        <TextField
          fullWidth
          label="YouTube video link"
          placeholder="https://youtube.com/watch?v=…"
          value={profile.youtubeUrl || ""}
          onChange={(e) => set("youtubeUrl", e.target.value)}
          helperText="A full-width video section appears on your page when this is set."
        />
      </Section>

      <PortfolioSection
        profile={profile}
        set={set}
        brandColor={brandColor}
        barberId={barberId}
        headingPlaceholder="Client transformations"
        subtextPlaceholder="Drag the slider on each image to reveal real client results."
      />

      <Section title="Areas of expertise">
        {specializations.map((spec, i) => (
          <Box
            key={i}
            sx={{ border: "1px solid #eee", borderRadius: 2, p: 2.5, mb: 2 }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1.5}
            >
              <Typography fontWeight={600} fontSize={14}>
                Service {i + 1}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  set(
                    "specializations",
                    specializations.filter((_, idx) => idx !== i),
                  )
                }
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Title"
                  value={spec.title || ""}
                  onChange={(e) => setSpec(i, "title", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  multiline
                  rows={2}
                  value={spec.description || ""}
                  onChange={(e) => setSpec(i, "description", e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor }}
          onClick={() =>
            set("specializations", [
              ...specializations,
              { title: "", description: "" },
            ])
          }
        >
          Add Service
        </Button>
      </Section>

      <Section title="Pricing plans">
        {pricingPlans.map((plan, i) => (
          <Box
            key={i}
            sx={{ border: "1px solid #eee", borderRadius: 2, p: 2.5, mb: 2 }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1.5}
            >
              <Typography fontWeight={600} fontSize={14}>
                Plan {i + 1}
                {plan.highlight ? " — Most Popular" : ""}
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  variant={plan.highlight ? "contained" : "outlined"}
                  sx={{
                    fontSize: 11,
                    ...(plan.highlight ? { bgcolor: brandColor } : {}),
                  }}
                  onClick={() => setPlan(i, "highlight", !plan.highlight)}
                >
                  {plan.highlight ? "★ Featured" : "Mark as Featured"}
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    set(
                      "pricingPlans",
                      pricingPlans.filter((_, idx) => idx !== i),
                    )
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Plan Name"
                  placeholder="Monthly"
                  value={plan.name || ""}
                  onChange={(e) => setPlan(i, "name", e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Price"
                  placeholder="£280"
                  value={plan.price || ""}
                  onChange={(e) => setPlan(i, "price", e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Period"
                  placeholder="per month"
                  value={plan.period || ""}
                  onChange={(e) => setPlan(i, "period", e.target.value)}
                />
              </Grid>
            </Grid>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mt={2}
              mb={1}
            >
              Features
            </Typography>
            {(plan.features || []).map((feat, j) => (
              <Box key={j} display="flex" gap={1} mb={1}>
                <TextField
                  fullWidth
                  size="small"
                  value={feat}
                  onChange={(e) => setPlanFeature(i, j, e.target.value)}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    setPlan(
                      i,
                      "features",
                      plan.features.filter((_, fi) => fi !== j),
                    )
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddCircleIcon />}
              sx={{ color: brandColor, mt: 0.5 }}
              onClick={() =>
                setPlan(i, "features", [...(plan.features || []), ""])
              }
            >
              Add feature
            </Button>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor }}
          onClick={() =>
            set("pricingPlans", [
              ...pricingPlans,
              {
                name: "",
                price: "",
                period: "",
                features: [],
                highlight: false,
              },
            ])
          }
        >
          Add Plan
        </Button>
      </Section>
    </>
  );
}

/* ── Plumber page sections ───────────────────────────────────────────────── */
function PlumberPageSections({ profile, set, brandColor, barberId }) {
  const categories =
    profile.serviceCategories?.length > 0
      ? profile.serviceCategories
      : PLUMBER_SERVICE_CATEGORIES;

  const setCategoryName = (ci, val) =>
    set(
      "serviceCategories",
      categories.map((c, i) => (i === ci ? { ...c, category: val } : c)),
    );
  const updateCategory = (ci, field, val) =>
    set(
      "serviceCategories",
      categories.map((category, index) =>
        index === ci ? { ...category, [field]: val } : category,
      ),
    );
  const removeCategory = (ci) =>
    set(
      "serviceCategories",
      categories.filter((_, i) => i !== ci),
    );
  const addCategory = () =>
    set("serviceCategories", [
      ...categories,
      {
        category: "New category",
        items: [
          {
            name: "",
            description: "",
            startingPrice: "",
            bookableOnline: false,
          },
        ],
      },
    ]);

  const updateItem = (ci, ii, field, val) =>
    set(
      "serviceCategories",
      categories.map((c, i) =>
        i !== ci
          ? c
          : {
              ...c,
              items: c.items.map((it, j) =>
                j === ii ? { ...it, [field]: val } : it,
              ),
            },
      ),
    );
  const removeItem = (ci, ii) =>
    set(
      "serviceCategories",
      categories.map((c, i) =>
        i !== ci
          ? c
          : {
              ...c,
              items: c.items.filter((_, j) => j !== ii),
            },
      ),
    );
  const addItem = (ci) =>
    set(
      "serviceCategories",
      categories.map((c, i) =>
        i !== ci
          ? c
          : {
              ...c,
              items: [
                ...c.items,
                {
                  name: "",
                  description: "",
                  startingPrice: "",
                  bookableOnline: false,
                },
              ],
            },
      ),
    );

  return (
    <>
      <Section title="Top of your page" defaultExpanded>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Small text above the heading"
              helperText='Small label with a pin icon, above the big heading — shows "Plumbing, heating & electrical" (or your town) until set'
              placeholder="Plumbing, heating & electrical"
              value={profile.heroTagline || ""}
              onChange={(e) => set("heroTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Main heading"
              helperText='The large dark line of your main headline — shows "Local work." until set'
              placeholder="Local work."
              value={profile.heroHeadingLine1 || ""}
              onChange={(e) => set("heroHeadingLine1", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Highlighted heading"
              helperText='The lighter-coloured line right under it — shows "Done properly." until set'
              placeholder="Done properly."
              value={profile.heroHeadingLine2 || ""}
              onChange={(e) => set("heroHeadingLine2", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Job request box heading"
              helperText='Heading on the dark request-a-job card — shows "What can we help with?" until set'
              placeholder="What can we help with?"
              value={profile.heroReviewText || ""}
              onChange={(e) => set("heroReviewText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Short introduction"
              helperText="Paragraph under the big heading, above the buttons"
              multiline
              rows={2}
              placeholder="Plumbing, heating and electrical work with a clear route from first request to finished job."
              value={profile.heroSubtext || ""}
              onChange={(e) => set("heroSubtext", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              size="small"
              label="Job request box description"
              helperText='Paragraph inside that same dark card, under "Request Card Heading" above'
              placeholder="Choose a service, describe the job and add photos. We’ll use those details to plan the next step."
              value={profile.heroCardBody || ""}
              onChange={(e) => set("heroCardBody", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Main button text"
              helperText='e.g. "Request a job" — the first, lighter button'
              placeholder="Request a job"
              value={profile.primaryCtaLabel || ""}
              onChange={(e) => set("primaryCtaLabel", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              The second button ("Call...") uses your phone number from the{" "}
              <strong>Your Profile</strong> section at the top of this page —
              scroll up to change it.
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Note below the buttons"
              helperText='e.g. "Request first—nothing booked automatically" — small line with a checkmark, under the buttons'
              placeholder="Request first—nothing booked automatically"
              value={profile.heroTrustText || ""}
              onChange={(e) => set("heroTrustText", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <ImageField
              label="Main page image"
              hint="Large photo behind your headline at the very top of your page"
              value={profile.heroImage || ""}
              onChange={(v) => set("heroImage", v)}
              barberId={barberId}
              fieldKey="hero_bg"
              preview={{
                eyebrow: profile.heroTagline || "Plumbing, heating and electrical",
                heading: profile.heroHeadingLine1 || "Local work.",
                accent: profile.heroHeadingLine2 || "Done properly.",
                body: profile.heroSubtext || "Clear quotes, reliable work and an easy way to request a job.",
                button: profile.primaryCtaLabel || "Request a job",
                brandColor,
              }}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Text used across your page">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Edit the labels, headings and supporting copy used throughout the
          public page.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["servicesTagline", "Services label", "Services"],
            [
              "servicesHeading",
              "Services heading",
              "The right help for the job.",
            ],
            [
              "servicesBody",
              "Services description",
              "Browse the work offered…",
            ],
            ["areasTagline", "Areas label", "Areas covered"],
            [
              "areasHeading",
              "Areas heading",
              "Working across your local area.",
            ],
            [
              "areasBody",
              "Areas description",
              "We provide plumbing, heating and electrical services across the areas below.",
            ],
            ["areasCtaLabel", "Areas button label", "Check your postcode"],
            ["chargesTagline", "Charges label", "Price guide"],
            [
              "chargesHeading",
              "Charges heading",
              "Standard charges, clearly shown.",
            ],
            ["chargesBody", "Charges description", "These are guide charges…"],
            ["teamTagline", "Team label", "The team"],
            ["teamHeading", "Team heading", "The people doing the work."],
            ["reviewsTagline", "Reviews label", "Customer feedback"],
            ["reviewsHeading", "Reviews heading", "What customers say."],
          ].map(([key, label, placeholder]) => (
            <Grid item xs={12} sm={key.endsWith("Body") ? 12 : 6} key={key}>
              <TextField
                fullWidth
                size="small"
                label={label}
                placeholder={placeholder}
                multiline={key.endsWith("Body")}
                rows={key.endsWith("Body") ? 2 : undefined}
                value={profile[key] || ""}
                onChange={(event) => set(key, event.target.value)}
              />
            </Grid>
          ))}
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              type="url"
              label="Google reviews link"
              placeholder="https://g.page/r/your-business/review"
              helperText="Used by the View on Google link in the customer reviews section."
              value={profile.googleBusinessUrl || ""}
              onChange={(event) =>
                set("googleBusinessUrl", event.target.value)
              }
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="About your business">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Section Label"
              placeholder="Who We Are"
              value={profile.aboutTagline || ""}
              onChange={(e) => set("aboutTagline", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Section Heading"
              placeholder="Straightforward work, done properly"
              value={profile.aboutHeading || ""}
              onChange={(e) => set("aboutHeading", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="About Body Text"
              value={profile.aboutBody || profile.aboutUs || ""}
              onChange={(e) => set("aboutBody", e.target.value)}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Services by category" defaultExpanded>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Group your services under categories like Plumbing, Gas &amp; Heating
          and Electrical. Each item can have a starting price and be marked
          bookable online or enquiry-only.
        </Typography>
        {categories.map((cat, ci) => (
          <Box
            key={ci}
            sx={{ border: "1px solid #eee", borderRadius: 2, p: 2, mb: 2 }}
          >
            <Box display="flex" gap={1} alignItems="center" mb={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Category name"
                value={cat.category}
                onChange={(e) => setCategoryName(ci, e.target.value)}
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => removeCategory(ci)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box mb={2}>
              <ImageField
                label={`${cat.category || "Category"} Card Image`}
                hint="Thumbnail on this service category's card"
                value={cat.image || ""}
                onChange={(value) => updateCategory(ci, "image", value)}
                barberId={barberId}
                fieldKey={`plumber_service_${ci}`}
              />
            </Box>
            {cat.items.map((item, ii) => (
              <Box
                key={ii}
                sx={{
                  border: "1px solid #f2f2f2",
                  borderRadius: 1.5,
                  p: 1.5,
                  mb: 1.5,
                }}
              >
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Service name"
                      value={item.name}
                      onChange={(e) =>
                        updateItem(ci, ii, "name", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid item xs={8} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Starting price (£, optional)"
                      value={item.startingPrice}
                      onChange={(e) =>
                        updateItem(ci, ii, "startingPrice", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid item xs={4} sm={2} display="flex" alignItems="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItem(ci, ii)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Short description"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(ci, ii, "description", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={Boolean(item.bookableOnline)}
                          onChange={(e) =>
                            updateItem(
                              ci,
                              ii,
                              "bookableOnline",
                              e.target.checked,
                            )
                          }
                        />
                      }
                      label={
                        <Typography variant="caption">
                          Bookable online (off = enquiry only)
                        </Typography>
                      }
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddCircleIcon />}
              sx={{ color: brandColor }}
              onClick={() => addItem(ci)}
            >
              Add service to {cat.category || "this category"}
            </Button>
          </Box>
        ))}
        <Button
          startIcon={<AddCircleIcon />}
          sx={{ color: brandColor }}
          onClick={addCategory}
        >
          Add category
        </Button>
      </Section>

      <Section title="Job request form">
        <Grid container spacing={2}>
          {[
            ["requestTagline", "Section label", "Request a job"],
            ["requestHeading", "Section heading", "Tell us what’s happening."],
            ["requestBody", "Section description", "Send the key details now…"],
            [
              "requestStep1",
              "Step 1",
              "Share your contact and property details.",
            ],
            [
              "requestStep2",
              "Step 2",
              "Describe the job and add useful photos.",
            ],
            [
              "requestStep3",
              "Step 3",
              "Wait for confirmation of availability and price.",
            ],
          ].map(([key, label, placeholder]) => (
            <Grid item xs={12} sm={key === "requestTagline" ? 6 : 12} key={key}>
              <TextField
                fullWidth
                size="small"
                label={label}
                placeholder={placeholder}
                multiline={key === "requestBody"}
                rows={key === "requestBody" ? 2 : undefined}
                value={profile[key] || ""}
                onChange={(event) => set(key, event.target.value)}
              />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section title="Business highlights">
        <Typography variant="body2" color="text.secondary" mb={2}>
          Up to four trust points shown in the dark strip beneath the hero.
          Leave all four blank to use automatic ratings, coverage and
          opening-hours details.
        </Typography>
        <Grid container spacing={2}>
          {[
            ["stat1Value", "stat1Label", "10+", "Years experience"],
            ["stat2Value", "stat2Label", "500+", "Jobs completed"],
            ["stat3Value", "stat3Label", "5.0★", "Average rating"],
            ["stat4Value", "stat4Label", "Fast", "Response times"],
          ].map(([nKey, lKey, nDef, lDef], i) => (
            <React.Fragment key={i}>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Number`}
                  placeholder={nDef}
                  value={profile[nKey] || ""}
                  onChange={(e) => set(nKey, e.target.value)}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Stat ${i + 1} — Label`}
                  placeholder={lDef}
                  value={profile[lKey] || ""}
                  onChange={(e) => set(lKey, e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>
    </>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function EditPageTab({
  profile,
  setProfile,
  brandColor,
  userRole,
  profilePreview,
  setProfileFile,
  setProfilePreview,
  handleDeleteProfile,
  handleImageChange,
  businessType,
}) {
  const set = (key, val) => setProfile((prev) => ({ ...prev, [key]: val }));
  const type = businessType || profile?.businessType || "barber";

  const typeLabel =
    {
      barber: "Barber",
      hairdresser: "Salon",
      decorator: "Decorator",
      trainer: "PT / Trainer",
      plumber: "Plumbing, Heating & Electrical",
    }[type] || "Page";

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={0.5}>
        Edit Your {typeLabel} Page
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Change what customers see on your public page, then press{" "}
        <strong>Save changes</strong> in the header to publish it.
      </Typography>

      {/* ── Your Profile ── */}
      <Section title="Your profile">
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar
            src={profilePreview || profile.profilePic}
            sx={{
              width: 90,
              height: 90,
              mb: 2,
              border: `3px solid ${brandColor}`,
            }}
          />
          <Button variant="outlined" component="label" size="small">
            Change Photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) =>
                handleImageChange(e, setProfileFile, setProfilePreview)
              }
            />
          </Button>
          <Typography variant="caption" color="text.secondary" mt={.75} textAlign="center">
            Your main photo — used on your public page and on your card in the marketplace
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {/* Business Type — owner only */}
          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Business Type"
                value={profile.businessType || "barber"}
                fullWidth
                size="small"
                onChange={(e) => set("businessType", e.target.value)}
              >
                <MenuItem value="barber">Barber</MenuItem>
                <MenuItem value="hairdresser">Hairdresser</MenuItem>
                <MenuItem value="decorator">Decorator</MenuItem>
                <MenuItem value="trainer">Personal Trainer</MenuItem>
                <MenuItem value="plumber">
                  Plumbing, Heating & Electrical
                </MenuItem>
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              label="Full Name"
              value={profile.name || ""}
              fullWidth
              size="small"
              onChange={(e) => set("name", e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Specialty"
              placeholder="e.g. Fades, colour, weight loss…"
              value={profile.specialty || ""}
              fullWidth
              size="small"
              onChange={(e) => set("specialty", e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              helperText="Also used for the Call button at the top of your public page"
              value={profile.phone || ""}
              fullWidth
              size="small"
              onChange={(e) => set("phone", e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Business Email"
              type="email"
              placeholder="hello@yourbusiness.com"
              value={profile.businessEmail || profile.contactEmail || ""}
              fullWidth
              size="small"
              onChange={(e) => set("businessEmail", e.target.value)}
            />
          </Grid>

          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Location / Address"
                value={profile.address || ""}
                fullWidth
                size="small"
                onChange={(e) => set("address", e.target.value)}
              />
            </Grid>
          )}

          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Area / Neighbourhood"
                placeholder="e.g. Stratford, Shoreditch, Brixton"
                helperText="Helps clients find you by location on the homepage"
                value={profile.area || ""}
                fullWidth
                size="small"
                onChange={(e) => set("area", e.target.value)}
              />
            </Grid>
          )}

          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Opening Times"
                value={safeOpeningHours(profile.openingHours)}
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder={"Mon–Fri: 9am–6pm\nSat: 10am–4pm\nSun: Closed"}
                onChange={(e) => set("openingHours", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment
                      position="start"
                      sx={{ alignSelf: "flex-start", mt: 1 }}
                    >
                      <AccessTimeIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              label="Personal Bio"
              placeholder="A short intro about you and your approach…"
              value={profile.bio || ""}
              fullWidth
              multiline
              rows={2}
              size="small"
              onChange={(e) => set("bio", e.target.value)}
            />
          </Grid>

          {userRole.isOwner && (
            <Grid item xs={12}>
              <TextField
                label="About Us"
                placeholder="Tell customers about your business, experience, and what makes you different…"
                value={profile.aboutUs || ""}
                fullWidth
                multiline
                rows={3}
                size="small"
                onChange={(e) => set("aboutUs", e.target.value)}
              />
            </Grid>
          )}
        </Grid>
      </Section>

      {/* ── Business-type specific public page content ── */}
      {type === "barber" && (
        <BarberPageSections profile={profile} set={set} brandColor={brandColor} barberId={profile?.uid} />
      )}
      {type === "decorator" && (
        <DecoratorPageSections profile={profile} set={set} brandColor={brandColor} barberId={profile?.uid} />
      )}
      {type === "hairdresser" && (
        <HairdresserPageSections profile={profile} set={set} brandColor={brandColor} barberId={profile?.uid} />
      )}
      {type === "trainer" && (
        <TrainerPageSections profile={profile} set={set} brandColor={brandColor} barberId={profile?.uid} />
      )}
      {type === "plumber" && (
        <PlumberPageSections profile={profile} set={set} brandColor={brandColor} barberId={profile?.uid} />
      )}

      {/* ── Social Media ── */}
      <Section title="Social media and contact details">
        <Typography variant="body2" color="text.secondary" mb={2}>
          These appear in the footer of your public page.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Instagram link"
              placeholder="https://instagram.com/yourhandle"
              fullWidth
              value={profile.instagramUrl || ""}
              onChange={(e) => set("instagramUrl", e.target.value)}
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
              label="TikTok link"
              placeholder="https://tiktok.com/@yourhandle"
              fullWidth
              value={profile.tiktokUrl || ""}
              onChange={(e) => set("tiktokUrl", e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "#000",
                      }}
                    >
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
                label="Facebook link"
                placeholder="https://facebook.com/yourpage"
                fullWidth
                value={profile.facebookUrl || ""}
                onChange={(e) => set("facebookUrl", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FacebookIcon
                        fontSize="small"
                        sx={{ color: "#1877F2" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}
          {userRole.isOwner && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="WhatsApp Number"
                placeholder="e.g. 07123 456789 or +447123456789"
                fullWidth
                value={profile.whatsappNumber || ""}
                onChange={(e) => set("whatsappNumber", e.target.value)}
                helperText="Shows a 'Book via WhatsApp' button on your page. Leave blank to hide it."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WhatsAppIcon
                        fontSize="small"
                        sx={{ color: "#25D366" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}
        </Grid>
      </Section>

      {/* ── Barber: Personal Staff Social Links ── */}
      {(!type || type === "barber") && (
        <Section title="Your personal social links">
          <Typography variant="body2" color="text.secondary" mb={2}>
            These appear on your individual barber profile — separate from the
            shop's links.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Personal Instagram"
                fullWidth
                size="small"
                placeholder="https://instagram.com/yourhandle"
                value={profile.staffInstagram || ""}
                onChange={(e) => set("staffInstagram", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <InstagramIcon
                        fontSize="small"
                        sx={{ color: "#E1306C" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Personal TikTok"
                fullWidth
                size="small"
                placeholder="https://tiktok.com/@yourhandle"
                value={profile.staffTiktok || ""}
                onChange={(e) => set("staffTiktok", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <TikTokIcon size={16} />
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Personal Facebook"
                fullWidth
                size="small"
                placeholder="https://facebook.com/yourprofile"
                value={profile.staffFacebook || ""}
                onChange={(e) => set("staffFacebook", e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FacebookIcon
                        fontSize="small"
                        sx={{ color: "#1877F2" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Section>
      )}

      {/* ── Danger Zone ── */}
      <Divider sx={{ my: 4 }} />
      <Typography
        variant="subtitle2"
        color="error"
        gutterBottom
        fontWeight={700}
      >
        Danger Zone
      </Typography>
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={handleDeleteProfile}
      >
        Delete My Profile
      </Button>
    </Box>
  );
}
