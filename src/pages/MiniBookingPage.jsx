import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Box, Container, Typography, TextField, Button, Avatar, CircularProgress, Alert } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InstagramIcon from "@mui/icons-material/Instagram";

import SlotPicker from "../components/SlotPicker";
import { useSlots } from "../hooks/useSlots";
import { formatDate, formatTime } from "../stripe/formatters";

// The public page for "Free" plan accounts (£0) — no nav, no footer
// (App.jsx's isAlternativeBookingLayout suppresses the global shell for
// this plan the same way it already does for non-barber templates that
// render their own), just a logo, real indexable text, and a slot picker.
// Booking confirms inline on this same page — no navigation to
// BookingForm.jsx/Confirmation.jsx, no deposit, no email, no push to the
// customer, matching this tier's "on-screen confirmation only" design.
export default function MiniBookingPage({ tenant }) {
  const id = tenant?.id || tenant?.uid;
  const brandColor = tenant?.brandColor || "#2563EB";
  const businessName = tenant?.businessName || tenant?.name || "Book an appointment";
  const tagline = tenant?.heroTagline || "";
  const city = tenant?.city || tenant?.location || "";
  const instagramUrl = tenant?.instagramUrl || "";

  const { slots, loading: slotsLoading, error: slotsError } = useSlots(id);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", haircutStyle: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitError("Please enter your name and phone number.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/finalize-booking-no-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: id, slotId: selectedSlot.id, formData,
          date: selectedSlot.date, time: selectedSlot.time,
          paymentMethod: "none",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setConfirmed(true);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
      <Box sx={{ height: 4, bgcolor: brandColor }} />

      <Container maxWidth="xs" sx={{ py: { xs: 5, md: 8 }, flex: 1 }}>
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Avatar
            src={tenant?.logoUrl}
            sx={{ width: 88, height: 88, mx: "auto", mb: 2.5, bgcolor: brandColor, fontSize: "2rem", fontWeight: 700 }}
          >
            {businessName.charAt(0).toUpperCase()}
          </Avatar>
          {/* Real text, not just a logo image — a bare logo has zero
              indexable content for local search. */}
          <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: "#111" }}>
            {businessName}
          </Typography>
          {tagline && <Typography sx={{ color: "#666", mt: 0.5 }}>{tagline}</Typography>}
          {city && <Typography sx={{ color: "#999", fontSize: "0.85rem", mt: 0.5 }}>{city}</Typography>}
          {/* This page has no gallery, no reviews, no about section — for a
              visitor arriving cold from a Google search with no other way
              to get a feel for the business, this is the one thing that
              can, so it needs to be obvious, not a small icon buried
              somewhere. */}
          {instagramUrl && (
            <Button
              component="a" href={instagramUrl} target="_blank" rel="noopener noreferrer"
              startIcon={<InstagramIcon />}
              sx={{
                mt: 2, px: 2.5, py: 1, borderRadius: 99, textTransform: "none",
                fontWeight: 700, fontSize: "0.85rem",
                border: `1.5px solid ${brandColor}`, color: brandColor,
                "&:hover": { bgcolor: `${brandColor}10` },
              }}
            >
              Follow us on Instagram
            </Button>
          )}
        </Box>

        {confirmed ? (
          <Box sx={{ textAlign: "center" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "success.main", mb: 2 }} />
            <Typography variant="h6" fontWeight={800} mb={1}>You're booked!</Typography>
            <Typography color="text.secondary">
              {formatDate(selectedSlot.date)} at {formatTime(selectedSlot.time)} with {businessName}.
            </Typography>
          </Box>
        ) : !selectedSlot ? (
          <SlotPicker
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            brandColor={brandColor}
            onSelect={setSelectedSlot}
          />
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Typography sx={{ mb: 2.5, color: "#444", fontWeight: 700 }}>
              {formatDate(selectedSlot.date)} at {formatTime(selectedSlot.time)}
            </Typography>
            {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
            <TextField fullWidth required label="Full Name" sx={{ mb: 2 }}
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <TextField fullWidth required label="Phone Number" sx={{ mb: 2 }}
              value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            <TextField fullWidth label="Email (optional)" type="email" sx={{ mb: 2 }}
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <TextField fullWidth multiline rows={2} label="What's this for? (optional)" placeholder="e.g. skin fade, consultation…" sx={{ mb: 2 }}
              value={formData.haircutStyle} onChange={e => setFormData({ ...formData, haircutStyle: e.target.value })} />
            <Button
              type="submit" fullWidth variant="contained" size="large" disabled={submitting}
              sx={{ bgcolor: brandColor, py: 1.6, fontWeight: 800, "&:hover": { bgcolor: brandColor, filter: "brightness(0.92)" } }}
            >
              {submitting ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Confirm Booking"}
            </Button>
            <Button fullWidth onClick={() => setSelectedSlot(null)} sx={{ mt: 1, color: "text.secondary" }}>
              Choose a different time
            </Button>
          </Box>
        )}
      </Container>

      {/* A real, contextual link a visitor might click carries more weight
          than a decorative footer badge — and doubles as a lead funnel. */}
      <Box sx={{ textAlign: "center", py: 3, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <Typography
          component="a" href="https://bookrightly.co.uk/signup" target="_blank" rel="noopener"
          sx={{ fontSize: "0.8rem", color: "#555", fontWeight: 600, textDecoration: "underline" }}
        >
          List your own business free — powered by Bookrightly
        </Typography>
        {/* No nav, no footer on this page means the usual "Log in" link
            (Footer.jsx) never reaches the owner either — this is the only
            way back to their own dashboard from their own public page. */}
        <Typography sx={{ mt: 1 }}>
          <Box component={Link} to="/login" sx={{ fontSize: "0.78rem", color: "#666", fontWeight: 600, textDecoration: "underline" }}>
            Business owner? Log in
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
