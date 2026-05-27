import React from "react";
import {
  Box, Grid, TextField, Typography, Divider, Button,
  IconButton, Accordion, AccordionSummary, AccordionDetails, Paper,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  AddCircle as AddCircleIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from "@mui/icons-material";

function ImageField({ label, value, onChange, hint }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      <Box display="flex" alignItems="center" gap={1.5}>
        <Box sx={{
          width: 80, height: 56, borderRadius: 1, border: "1.5px dashed #ccc",
          backgroundImage: value ? `url(${value})` : "none",
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#bbb", flexShrink: 0,
        }}>
          {!value && <ImageIcon fontSize="small" />}
        </Box>
        <Box flex={1}>
          <TextField size="small" fullWidth placeholder="https://... or upload below"
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

function Section({ title, defaultExpanded = false, children }) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters elevation={0}
      sx={{ border: "1px solid #eee", borderRadius: "12px !important", mb: 2, "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1.5 }}>
        <Typography fontWeight={700}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 3, pb: 3 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function WebsiteTab({ profile, setProfile, brandColor }) {
  const set = (key, val) => setProfile(prev => ({ ...prev, [key]: val }));

  // ── Specializations ──
  const specializations = profile.specializations || [
    { title: "Strength & Conditioning", description: "Build raw power and muscular endurance through proven compound lifting and progressive overload." },
    { title: "Fat Loss & Transformation", description: "Science-backed nutrition guidance paired with high-intensity training protocols for real results." },
    { title: "Functional Fitness", description: "Outdoor resistance training focused on real-world movement patterns that carry over to daily life." },
    { title: "1-to-1 Coaching", description: "Fully personalised sessions tailored to your goals, schedule, and current level of fitness." },
  ];
  const setSpec = (i, field, val) => {
    const updated = specializations.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    set("specializations", updated);
  };

  // ── Pricing plans ──
  const pricingPlans = profile.pricingPlans || [
    { name: "Taster",   price: "£40",  period: "one-off",   features: ["60-min session", "Fitness assessment"], highlight: false },
    { name: "Monthly",  price: "£280", period: "per month", features: ["8 sessions/month", "Nutrition guidance", "Progress tracking"], highlight: true },
    { name: "10-Block", price: "£350", period: "block",     features: ["10 × 60-min sessions", "Flexible scheduling", "Priority booking"], highlight: false },
  ];
  const setPlan = (i, field, val) => {
    const updated = pricingPlans.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    set("pricingPlans", updated);
  };
  const setPlanFeature = (planIdx, featIdx, val) => {
    const updated = pricingPlans.map((p, i) => {
      if (i !== planIdx) return p;
      const features = p.features.map((f, j) => j === featIdx ? val : f);
      return { ...p, features };
    });
    set("pricingPlans", updated);
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={1}>Website Content Editor</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Edit every piece of text and every image on your public page. Press <strong>Save Profile</strong> in the header to publish.
      </Typography>

      {/* ── Hero ── */}
      <Section title="🦸 Hero Section" defaultExpanded>
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <TextField fullWidth label="Main Heading (use \n for line breaks)"
              placeholder={"Stronger.\nLeaner.\nUnstoppable."}
              multiline rows={3}
              value={profile.heroTitle || ""}
              onChange={e => set("heroTitle", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Sub-text (below heading)"
              placeholder="Tailored high-performance outdoor functional resistance training."
              value={profile.heroSubtitle || ""}
              onChange={e => set("heroSubtitle", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" fontWeight={700} mt={1.5} mb={1.5}>Hero Background Image</Typography>
            <ImageField label="About / Hero Image (shown in the About section)"
              hint="Recommended: portrait crop, min 800px wide"
              value={profile.heroImage || ""}
              onChange={v => set("heroImage", v)} />
          </Grid>
        </Grid>
      </Section>

      {/* ── About ── */}
      <Section title="👤 About / Coach Section">
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Coach / Trainer Name"
              placeholder="Your Name"
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
        </Grid>
      </Section>

      {/* ── Stats Bar ── */}
      <Section title="📊 Stats Bar (coloured strip below hero)">
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
                <TextField fullWidth label={`Stat ${i + 1} — Number`} placeholder={nDef}
                  value={profile[nKey] || ""} onChange={e => set(nKey, e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth label={`Stat ${i + 1} — Label`} placeholder={lDef}
                  value={profile[lKey] || ""} onChange={e => set(lKey, e.target.value)} />
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Section>

      {/* ── YouTube ── */}
      <Section title="▶ YouTube Video">
        <TextField fullWidth label="YouTube Video URL"
          placeholder="https://youtube.com/watch?v=..."
          value={profile.youtubeUrl || ""}
          onChange={e => set("youtubeUrl", e.target.value)}
          helperText="A full-width video section appears on your page when this is set." />
      </Section>

      {/* ── Specializations / Services ── */}
      <Section title="💪 Services / Areas of Expertise">
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
                <TextField fullWidth size="small" label="Title"
                  value={spec.title || ""} onChange={e => setSpec(i, "title", e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth size="small" label="Description" multiline rows={2}
                  value={spec.description || ""} onChange={e => setSpec(i, "description", e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        ))}
        <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor }}
          onClick={() => set("specializations", [...specializations, { title: "", description: "" }])}>
          Add Service
        </Button>
      </Section>

      {/* ── Pricing ── */}
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
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Plan Name" placeholder="Monthly"
                  value={plan.name || ""} onChange={e => setPlan(i, "name", e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Price" placeholder="£280"
                  value={plan.price || ""} onChange={e => setPlan(i, "price", e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField fullWidth size="small" label="Period" placeholder="per month"
                  value={plan.period || ""} onChange={e => setPlan(i, "period", e.target.value)} />
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" display="block" mt={2} mb={1}>Features (bullet points)</Typography>
            {(plan.features || []).map((feat, j) => (
              <Box key={j} display="flex" gap={1} mb={1}>
                <TextField fullWidth size="small" value={feat}
                  onChange={e => setPlanFeature(i, j, e.target.value)} />
                <IconButton size="small" color="error"
                  onClick={() => {
                    const features = plan.features.filter((_, fi) => fi !== j);
                    setPlan(i, "features", features);
                  }}>
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

      {/* ── Legal ── */}
      <Section title="⚖️ Legal (Privacy Policy & Terms)">
        <Typography variant="body2" color="text.secondary" mb={2}>
          These appear in a popup when visitors click the links in your footer.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth multiline rows={5} label="Privacy Policy"
              value={profile.privacyPolicy || ""} onChange={e => set("privacyPolicy", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth multiline rows={5} label="Terms & Conditions"
              value={profile.termsConditions || ""} onChange={e => set("termsConditions", e.target.value)} />
          </Grid>
        </Grid>
      </Section>
    </Box>
  );
}