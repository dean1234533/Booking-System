import React, { useState } from "react";
import {
  Box, Button, Grid, TextField, Typography,
  Accordion, AccordionSummary, AccordionDetails, IconButton,
  CircularProgress,
} from "@mui/material";
import { ChevronDown, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
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
        border: "1px solid #E4E7EC",
        borderRadius: "12px !important",
        mb: 2,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ChevronDown size={18} strokeWidth={1.8} />} sx={{ px: { xs: 2, sm: 2.5 }, py: 1 }}>
        <Typography fontWeight={750} fontSize=".92rem">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export function ImageField({ label, value, onChange, hint, barberId, fieldKey = "image", isStaff = false, shopId = null, preview = null }) {
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
      <Typography sx={{ fontSize: ".8rem", fontWeight: 700, color: "#344054", mb: 1 }}>{label}</Typography>

      {preview && (
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: ".7rem", color: "#667085", mb: .75 }}>Preview on your public page</Typography>
          <Box sx={{
            minHeight: { xs: 180, sm: 220 }, borderRadius: 2.5, overflow: "hidden", position: "relative",
            border: "1px solid #D0D5DD", bgcolor: "#1D2939",
            backgroundImage: value ? `linear-gradient(90deg, rgba(16,24,40,.82), rgba(16,24,40,.25)), url(${value})` : "linear-gradient(135deg, #344054, #101828)",
            backgroundSize: "cover", backgroundPosition: preview.position || "center",
          }}>
            {!value && (
              <Box sx={{
                position: "absolute", top: 10, right: 12, zIndex: 2,
                display: "flex", alignItems: "center", gap: .6,
                px: 1, py: .5, borderRadius: 999,
                bgcolor: "rgba(16,24,40,.55)", color: "rgba(255,255,255,.7)",
              }}>
                <ImageIcon size={13} strokeWidth={1.8} />
                <Typography sx={{ fontSize: ".62rem", whiteSpace: "nowrap" }}>No image yet</Typography>
              </Box>
            )}
            <Box sx={{ position: "relative", zIndex: 1, p: { xs: 2.25, sm: 3 }, width: { xs: "88%", sm: "68%" }, color: "#fff" }}>
              {preview.eyebrow && <Typography sx={{ fontSize: ".63rem", fontWeight: 700, opacity: .75, mb: .75 }}>{preview.eyebrow}</Typography>}
              <Typography sx={{ fontSize: { xs: "1.25rem", sm: "1.7rem" }, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.035em" }}>
                {preview.heading || "Your main heading"}
                {preview.accent && <Box component="span" sx={{ display: "block", color: preview.brandColor || "#93C5FD" }}>{preview.accent}</Box>}
              </Typography>
              {preview.body && <Typography sx={{ fontSize: ".68rem", lineHeight: 1.45, opacity: .78, mt: 1, maxWidth: 360 }}>{preview.body}</Typography>}
              {preview.button && <Box sx={{ display: "inline-flex", mt: 1.4, px: 1.4, py: .7, borderRadius: 1.5, bgcolor: preview.brandColor || "#2563EB", fontSize: ".65rem", fontWeight: 750 }}>{preview.button}</Box>}
            </Box>
          </Box>
        </Box>
      )}

      <Box display="flex" alignItems="center" gap={1.5}>
        <Box sx={{
          width: 80, height: 56, borderRadius: 1.5, border: "1px solid #D0D5DD", flexShrink: 0,
          backgroundImage: value ? `url(${value})` : "none",
          backgroundSize: "cover", backgroundPosition: "center",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#98A2B3", bgcolor: "#F9FAFB",
        }}>
          {uploading ? <CircularProgress size={18} /> : !value && <ImageIcon size={19} strokeWidth={1.6} />}
        </Box>
        <Box flex={1}>
          <TextField size="small" fullWidth placeholder="Paste an image link"
            value={value || ""} onChange={e => onChange(e.target.value)} />
          <Button size="small" component="label" disabled={uploading} startIcon={<Upload size={15} strokeWidth={1.8} />} sx={{ mt: 0.5, px: 1, fontSize: ".72rem" }}>
            {uploading ? "Uploading…" : value ? "Replace image" : "Choose image"}
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
    <Section title="Before and after gallery">
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Gallery Heading"
            placeholder={headingPlaceholder}
            value={profile.portfolioHeading || ""}
            onChange={e => set("portfolioHeading", e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth size="small" label="Gallery introduction"
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
              <Trash2 size={17} strokeWidth={1.8} />
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
      <Button startIcon={<Plus size={17} strokeWidth={1.8} />} sx={{ color: brandColor }}
        onClick={() => set("portfolioItems", [...portfolioItems, { before: "", after: "", label: "" }])}>
        Add Gallery Item
      </Button>
    </Section>
  );
}
