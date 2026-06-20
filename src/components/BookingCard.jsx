import React, { useState } from "react";
import {
  Card, CardContent, Typography, Box, Chip, Button, Divider,
  CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Alert
} from "@mui/material";
import PersonIcon       from "@mui/icons-material/Person";
import PhoneIcon        from "@mui/icons-material/Phone";
import EmailIcon        from "@mui/icons-material/Email";
import ContentCutIcon   from "@mui/icons-material/ContentCut";
import { formatDate, formatTime, formatCurrency, isRefundEligible } from "../stripe/formatters.js";
import { cancelBooking } from "../firebase/firestore";
import { requestRefund } from "../stripe/stripeClient.js";
import { sendCancellationEmail } from "../stripe/emailService.js";
import { useAuth } from "../context/AuthContext";

export default function BookingCard({ booking, onCancelled }) {
  const { barber: authBarber } = useAuth();
  const [open,       setOpen]       = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error,      setError]      = useState(null);

  // --- DYNAMIC BRANDING & DATA SYNC ---
  // Ensure deposit is a Number to avoid formatting errors
  const depositValue = Number(booking?.depositAmount) || 10;
  const brandColor = booking.brandColor || authBarber?.brandColor || "#C9A84C";

  const refundable = isRefundEligible(booking.slotDate);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      let refunded = false;
      if (refundable) {
        const result = await requestRefund({
          paymentIntentId: booking.stripePaymentIntentId,
          slotDate: booking.slotDate,
        });
        refunded = result.refunded;
      }

      await cancelBooking(booking.id, booking.slotId);

      await sendCancellationEmail({
        clientName:  booking.clientName,
        clientEmail: booking.clientEmail,
        barberName:  booking.barberName,
        businessName: booking.businessName || authBarber?.businessName,
        brandColor:   brandColor,
        date:        formatDate(booking.slotDate),
        time:        formatTime(booking.slotTime),
        refunded,
      });

      setOpen(false);
      onCancelled?.(); 
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Card 
        variant="outlined" 
        sx={{ 
          borderRadius: 3, 
          transition: 'all 0.3s ease', 
          '&:hover': { 
            borderColor: brandColor,
            boxShadow: `0 4px 12px ${brandColor}15`
          } 
        }}
      >
        <CardContent sx={{ p: 3 }}>

          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                {formatDate(booking.slotDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {formatTime(booking.slotTime ?? booking.time)}
              </Typography>
            </Box>
            <Chip
              label={`${formatCurrency(depositValue)}`}
              size="small"
              sx={{ 
                bgcolor: `${brandColor}12`, 
                color: brandColor, 
                fontWeight: 800,
                border: `1px solid ${brandColor}30`,
                borderRadius: 1.5
              }}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box display="flex" flexDirection="column" gap={1.2} mb={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <PersonIcon fontSize="small" sx={{ color: brandColor }} />
              <Typography variant="body2" fontWeight={700}>
                {booking.clientName}
                {booking.gender && (
                  <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.6, fontWeight: 400 }}>
                    • {booking.gender}
                  </Typography>
                )}
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1.5}>
              <PhoneIcon fontSize="small" sx={{ color: "text.secondary", opacity: 0.7 }} />
              <Typography variant="body2" fontWeight={500}>{booking.clientPhone}</Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1.5}>
              <EmailIcon fontSize="small" sx={{ color: "text.secondary", opacity: 0.7 }} />
              <Typography variant="body2" fontWeight={500}>{booking.clientEmail}</Typography>
            </Box>

            <Box 
              sx={{ 
                mt: 1, 
                p: 1.5, 
                bgcolor: 'grey.50', 
                borderRadius: 2, 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 1.5,
                border: '1px dashed',
                borderColor: 'grey.200'
              }}
            >
              <ContentCutIcon fontSize="small" sx={{ color: brandColor, mt: 0.2 }} />
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.4 }}>
                "{booking.haircutStyle || "No notes provided"}"
              </Typography>
            </Box>
          </Box>

          {!booking.cancelled ? (
            <Button
              variant="outlined"
              color="error"
              size="medium"
              fullWidth
              onClick={() => setOpen(true)}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 800, 
                textTransform: 'none',
                borderWidth: 2,
                '&:hover': { borderWidth: 2 }
              }}
            >
              Cancel Booking
            </Button>
          ) : (
            <Chip 
              label="CANCELLED" 
              color="error" 
              size="small" 
              variant="filled" 
              sx={{ width: '100%', fontWeight: 900, borderRadius: 2 }} 
            />
          )}

        </CardContent>
      </Card>

      <Dialog 
        open={open} 
        onClose={() => !cancelling && setOpen(false)} 
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle fontWeight={800} fontSize="1.3rem">Cancel Appointment?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', mb: 2 }}>
            {refundable
              ? "This appointment is eligible for a refund. The deposit will be returned to the client automatically."
              : "This appointment is within 24 hours. The deposit is non-refundable."}
          </DialogContentText>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setOpen(false)} 
            disabled={cancelling} 
            sx={{ color: 'text.secondary', fontWeight: 700 }}
          >
            Go Back
          </Button>
          <Button
            onClick={handleCancel}
            color="error"
            variant="contained"
            disabled={cancelling}
            sx={{ borderRadius: 2.5, px: 3, fontWeight: 800, textTransform: 'none' }}
            startIcon={cancelling ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {cancelling ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}