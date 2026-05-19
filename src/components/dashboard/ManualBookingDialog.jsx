import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Grid, TextField, Button, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Alert, Stepper, Step, StepLabel
} from "@mui/material";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import { PhoneInTalk as PhoneIcon } from "@mui/icons-material";
import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function ManualBookingDialog({ open, onClose, slot, barber, profile, onBooked }) {
  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState({
    name: "", phone: "", email: "", service: "", notes: "", gender: ""
  });

  const services = profile?.services || [];
  const steps    = ["Choose Slot", "Client Details", "Confirm"];

  const handleBook = async () => {
    if (!client.name || !slot) return;
    setSaving(true);
    try {
      const bookingsRef   = collection(db, "bookings");
      const newBookingRef = doc(bookingsRef);
      await setDoc(newBookingRef, {
        barberId:      barber.uid,
        slotId:        slot.id,
        date:          slot.date,
        time:          slot.time,
        customerName:  client.name,
        customerPhone: client.phone,
        customerEmail: client.email,
        serviceName:   client.service,
        gender:        client.gender,
        notes:         client.notes,
        depositAmount: 0,
        status:        "confirmed",
        source:        "manual",
        createdAt:     new Date().toISOString(),
      });
      await updateDoc(doc(db, "slots", slot.id), {
        isBooked: true, status: "booked", manualBookingId: newBookingRef.id,
      });
      onBooked();
      onClose();
      setClient({ name: "", phone: "", email: "", service: "", notes: "", gender: "" });
      setStep(0);
    } catch (err) {
      console.error("Manual booking failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const brandColor = profile?.brandColor || "#C9A84C";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #eee", pb: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PhoneIcon sx={{ color: brandColor }} />
          Manual Booking {slot ? `— ${slot.date} @ ${slot.time}` : ""}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            You've selected <strong>{slot?.time}</strong> on <strong>{slot?.date}</strong>.
            <br />Click "Next" to add client details.
          </Alert>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required label="Client Name" fullWidth value={client.name}
                onChange={e => setClient(p => ({ ...p, name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" fullWidth value={client.phone}
                onChange={e => setClient(p => ({ ...p, phone: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email (optional)" fullWidth value={client.email}
                onChange={e => setClient(p => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Service</InputLabel>
                <Select value={client.service} label="Service"
                  onChange={e => setClient(p => ({ ...p, service: e.target.value }))}>
                  <MenuItem value="">— None Selected —</MenuItem>
                  {services.map((s, i) => (
                    <MenuItem key={i} value={s.name}>{s.name} — £{s.price}</MenuItem>
                  ))}
                  <MenuItem value="Other">Other / Walk-in</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select value={client.gender} label="Gender"
                  onChange={e => setClient(p => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="">— Not specified —</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes / Special requests" fullWidth multiline rows={2}
                value={client.notes}
                onChange={e => setClient(p => ({ ...p, notes: e.target.value }))} />
            </Grid>
          </Grid>
        )}

        {step === 2 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Ready to confirm this manual booking!
            </Alert>
            {[
              ["🗓 Date",    slot?.date],
              ["⏰ Time",    slot?.time],
              ["👤 Client",  client.name    || "—"],
              ["📱 Phone",   client.phone   || "—"],
              ["📧 Email",   client.email   || "—"],
              ["✂️ Service", client.service || "—"],
              ["📝 Notes",   client.notes   || "—"],
            ].map(([label, value]) => (
              <Box key={label} display="flex" gap={2} mb={1}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>{label}</Typography>
                <Typography variant="body2" fontWeight={700}>{value}</Typography>
              </Box>
            ))}
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2, fontSize: 12 }}>
              This slot will be <strong>removed from online availability</strong> immediately.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
        <Box flex={1} />
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        {step < 2 ? (
          <Button variant="contained" onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !client.name} sx={{ bgcolor: "#1A1A1A" }}>
            Next
          </Button>
        ) : (
          <Button variant="contained" color="success"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            onClick={handleBook} disabled={saving}>
            {saving ? "Booking…" : "Confirm Booking"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}