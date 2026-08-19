import React, { useState } from "react";
import {
  Box, Button, Grid, TextField, Typography,
  Accordion, AccordionSummary, AccordionDetails, IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  AddCircle as AddCircleIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import { uploadBarberImage } from "../../../firebase/firestore";

export const TikTokIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5
      2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27
      0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0
      6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" />
  </svg>
);

export function Section({ title, defaultExpanded = false, children }) {
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

export function ImageField({ label, value, onChange, hint, barberId, fieldKey = "image", isStaff = false, shopId = null }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    if (!barberId) {
      setError("Can't upload yet — save your profile once first, then try again.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const name = `${fieldKey}_${Date.now()}`;
      const url = await uploadBarberImage(file, name, barberId, isStaff, shopId);
      onChange(url);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError("Upload failed — try again or paste an image URL instead.");
    } finally {
      setUploading(false);
    }
  };

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
          {uploading ? <CircularProgress size={18} /> : !value && <ImageIcon fontSize="small" />}
        </Box>
        <Box flex={1}>
          <TextField size="small" fullWidth placeholder="https://… or paste a URL"
            value={value || ""} onChange={e => onChange(e.target.value)} />
          <Button size="small" component="label" disabled={uploading} sx={{ mt: 0.5, fontSize: 11 }}>
            {uploading ? "Uploading…" : "Upload file"}
            <input type="file" accept="image/*" hidden disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </Button>
          {error && <Typography variant="caption" color="error" display="block">{error}</Typography>}
          {hint && !error && <Typography variant="caption" color="text.secondary" display="block">{hint}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}

export const safeOpeningHours = (val) => {
  if (!val) return "";
  if (typeof val === "object") return "Schedule Set (Object)";
  return val;
};

/* ── Before & After Portfolio (shared by barber / hairdresser / decorator / trainer, owner and staff) ── */
export function PortfolioSection({ profile, set, brandColor, barberId, isStaff = false, shopId = null, headingPlaceholder, subtextPlaceholder }) {
  const portfolioItems = profile.portfolioItems?.length > 0
    ? profile.portfolioItems
    : [{ before: "", after: "", label: "" }];

  const updatePortfolio = (i, field, val) => {
    set("portfolioItems", portfolioItems.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  return (
    <Section title="🖼️ Before &amp; After Gallery">
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Gallery Heading"
            placeholder={headingPlaceholder}
            value={profile.portfolioHeading || ""}
            onChange={e => set("portfolioHeading", e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth size="small" label="Gallery Sub-text"
            placeholder={subtextPlaceholder}
            value={profile.portfolioSubtext || ""}
            onChange={e => set("portfolioSubtext", e.target.value)} />
        </Grid>
      </Grid>
      {portfolioItems.map((item, i) => (
        <Box key={i} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">Gallery Item {i + 1}</Typography>
            <IconButton size="small" color="error"
              onClick={() => set("portfolioItems", portfolioItems.filter((_, idx) => idx !== i))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <ImageField label="Before image" value={item.before || ""} onChange={v => updatePortfolio(i, "before", v)}
                barberId={barberId} fieldKey={`portfolio_${i}_before`} isStaff={isStaff} shopId={shopId} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ImageField label="After image" value={item.after || ""} onChange={v => updatePortfolio(i, "after", v)}
                barberId={barberId} fieldKey={`portfolio_${i}_after`} isStaff={isStaff} shopId={shopId} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Caption"
                placeholder="Balayage transformation"
                value={item.label || ""}
                onChange={e => updatePortfolio(i, "label", e.target.value)} />
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<AddCircleIcon />} sx={{ color: brandColor }}
        onClick={() => set("portfolioItems", [...portfolioItems, { before: "", after: "", label: "" }])}>
        Add Gallery Item
      </Button>
    </Section>
  );
}
