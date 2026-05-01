import React from "react";

// src/components/BookingCard.jsx
// Shows a single booking in the barber Dashboard.
// Barber can cancel (and optionally refund) from here.

import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import PersonIcon       from "@mui/icons-material/Person";
import PhoneIcon        from "@mui/icons-material/Phone";
import EmailIcon        from "@mui/icons-material/Email";
import ContentCutIcon   from "@mui/icons-material/ContentCut";
import { formatDate, formatTime, formatCurrency, isRefundEligible } from "../stripe/formatters.js";
import { cancelBooking } from "../firebase/firestore";
import { requestRefund } from "../stripe/stripeClient.js";
import { sendCancellationEmail } from "../stripe/emailService.js";

export default function BookingCard({ booking, onCancelled }) {
  const [open,       setOpen]       = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error,      setError]      = useState(null);

  const refundable = isRefundEligible(booking.slotDate);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      // Issue Stripe refund if eligible
      let refunded = false;
      if (refundable) {
        const result = await requestRefund({
          paymentIntentId: booking.stripePaymentIntentId,
          slotDate: booking.slotDate,
        });
        refunded = result.refunded;
      }

      // Cancel in Firestore + reopen slot
      await cancelBooking(booking.id, booking.slotId);

      // Notify client by email
      await sendCancellationEmail({
        clientName:  booking.clientName,
        clientEmail: booking.clientEmail,
        barberName:  booking.barberName,
        date:        formatDate(booking.slotDate),
        time:        formatTime(booking.slotTime),
        refunded,
      });

      setOpen(false);
      onCancelled?.(); // trigger refetch in Dashboard
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>

          {/* Date + time header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {formatDate(booking.slotDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatTime(booking.slotTime ?? booking.time)}
              </Typography>
            </Box>
            <Chip
              label={`Deposit: ${formatCurrency(booking.depositAmount)}`}
              size="small"
              sx={{ bgcolor: "rgba(201,168,76,0.15)", color: "#8B6914", fontWeight: 600 }}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Client details */}
          <Box display="flex" flexDirection="column" gap={1} mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2">
                {booking.clientName}
                {booking.gender && (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {" "}· {booking.gender}
                  </Typography>
                )}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <PhoneIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2">{booking.clientPhone}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <EmailIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2">{booking.clientEmail}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <ContentCutIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2">{booking.haircutStyle}</Typography>
            </Box>
          </Box>

          {/* Cancel button */}
          {!booking.cancelled && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              fullWidth
              onClick={() => setOpen(true)}
            >
              Cancel Booking
            </Button>
          )}

          {booking.cancelled && (
            <Chip label="Cancelled" color="error" size="small" variant="outlined" />
          )}

        </CardContent>
      </Card>

      {/* Confirm cancel dialog */}
      <Dialog open={open} onClose={() => !cancelling && setOpen(false)}>
        <DialogTitle>Cancel this booking?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {refundable
              ? "This appointment is more than 24 hours away. The client will receive a full refund of their deposit."
              : "This appointment is within 24 hours. The deposit is non-refundable."}
          </DialogContentText>
          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} disabled={cancelling}>
            Keep Booking
          </Button>
          <Button
            onClick={handleCancel}
            color="error"
            variant="contained"
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {cancelling ? "Cancelling…" : "Yes, Cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
