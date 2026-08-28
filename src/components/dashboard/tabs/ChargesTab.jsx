import React, { useState } from "react";
import {
  Box, Typography, TextField, Button, Grid, Stack, IconButton, CircularProgress, Alert,
} from "@mui/material";
import { Delete as DeleteIcon, AddCircle as AddCircleIcon } from "@mui/icons-material";
import { updateBarber } from "../../../firebase/firestore";

// Owner-editable "Standard charges" + "Areas covered" — both stored directly
// on the barbers/{uid} profile doc (already public-read, no rules changes
// needed) and read straight from there by PlumberTemplate's public page and
// by QuoteTab when a job is priced up.
export default function ChargesTab({ barber, profile, brandColor }) {
  const [charges, setCharges] = useState({
    calloutFee: "", hourlyRate: "", minimumCharge: "",
    diagnosticFee: "", emergencyRate: "", extraNote: "",
    ...(profile?.standardCharges || {}),
  });
  const [areas, setAreas] = useState(
    profile?.serviceAreas?.length > 0 ? profile.serviceAreas : [""]
  );
  const [serviceRadius, setServiceRadius] = useState(profile?.serviceRadius || "");
  const [travelChargeNote, setTravelChargeNote] = useState(profile?.travelChargeNote || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setCharge = (key, val) => { setCharges(prev => ({ ...prev, [key]: val })); setSaved(false); };
  const setArea = (i, val) => { setAreas(prev => prev.map((a, idx) => idx === i ? val : a)); setSaved(false); };

  async function handleSave() {
    setSaving(true);
    try {
      await updateBarber(barber.uid, {
        standardCharges: charges,
        serviceAreas: areas.map(a => a.trim()).filter(Boolean),
        serviceRadius,
        travelChargeNote,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const chargeFields = [
    ["calloutFee",    "Call-out fee (£)"],
    ["hourlyRate",    "Hourly rate (£)"],
    ["minimumCharge", "Minimum charge (£)"],
    ["diagnosticFee", "Diagnostic fee (£)"],
    ["emergencyRate", "Emergency / out-of-hours rate (£)"],
  ];

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={0.5}>Standard Charges & Areas Covered</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Shown on your public page's "Standard charges" section and used as defaults when you build a quote. Leave a field blank to hide it — nothing is ever invented on your behalf.
      </Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Saved</Alert>}

      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Standard charges</Typography>
      <Grid container spacing={2} mb={3}>
        {chargeFields.map(([key, label]) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField fullWidth size="small" label={label} value={charges[key] || ""} onChange={e => setCharge(key, e.target.value)} />
          </Grid>
        ))}
        <Grid item xs={12}>
          <TextField
            fullWidth size="small" multiline rows={2} label="Extra note"
            placeholder="e.g. Parts and VAT may be extra."
            value={charges.extraNote || ""} onChange={e => setCharge("extraNote", e.target.value)}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Areas covered</Typography>
      <Stack spacing={1} mb={1.5}>
        {areas.map((area, i) => (
          <Box key={i} display="flex" gap={1}>
            <TextField fullWidth size="small" placeholder="Town or postcode area, e.g. Croydon, CR0" value={area} onChange={e => setArea(i, e.target.value)} />
            <IconButton size="small" color="error" onClick={() => { setAreas(prev => prev.filter((_, idx) => idx !== i)); setSaved(false); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Stack>
      <Button size="small" startIcon={<AddCircleIcon />} sx={{ color: brandColor, mb: 3 }}
        onClick={() => setAreas(prev => [...prev, ""])}>
        Add area
      </Button>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Service radius (optional)" placeholder="e.g. 10 miles" value={serviceRadius} onChange={e => { setServiceRadius(e.target.value); setSaved(false); }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Travel charge note (optional)" placeholder="e.g. Small travel charge outside 10 miles" value={travelChargeNote} onChange={e => { setTravelChargeNote(e.target.value); setSaved(false); }} />
        </Grid>
      </Grid>

      <Button variant="contained" disabled={saving} onClick={handleSave} sx={{ bgcolor: brandColor }}>
        {saving ? <CircularProgress size={18} color="inherit" /> : "Save"}
      </Button>
    </Box>
  );
}
