import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box, Container, Typography, Paper,
  Button, Divider, CircularProgress, Alert, Stack, Chip
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import PersonIcon from "@mui/icons-material/Person";
import TagIcon from "@mui/icons-material/Tag";
import { getBooking, getBarber } from "../firebase/firestore";
import { formatDate, formatTime, formatCurrency } from "../stripe/formatters";

export default function Confirmation() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [barber,  setBarber]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const b = await getBooking(bookingId);
        
        if (!b) { 
          setError("Booking not found."); 
          return; 
        }

        const bar = await getBarber(b.barberId);
        setBooking(b);
        setBarber(bar);
      } catch (err) { 
        console.error("Confirmation load error:", err);
        setError("Could not load your booking details."); 
      } finally { 
        setLoading(false); 
      }
    }
    load();
  }, [bookingId]);

  if (loading) return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
      <CircularProgress sx={{ color: '#C9A84C' }} />
    </Container>
  );

  if (error) return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Alert severity="error">{error}</Alert>
      <Button component={Link} to="/" sx={{ mt: 2 }}>Return Home</Button>
    </Container>
  );

  const brandColor = barber?.brandColor || "#C9A84C";
  const totalPaid = (Number(booking.depositAmount) || 0) + (Number(booking.bookingFee) || 0);
  const balanceDue = booking.serviceName
    ? null
    : null; // placeholder if you add full service price later

  // Only show rows that have a value
  const appointmentRows = [
    { icon: <TagIcon fontSize="small" />,          label: "Reference",  value: bookingId.slice(-8).toUpperCase() },
    { icon: <PersonIcon fontSize="small" />,        label: "Barber",     value: barber?.name || booking.barberName },
    { icon: <CalendarTodayIcon fontSize="small" />, label: "Date",       value: booking.date ? formatDate(booking.date) : null },
    { icon: <AccessTimeIcon fontSize="small" />,    label: "Time",       value: booking.time ? formatTime(booking.time) : null },
    { icon: <ContentCutIcon fontSize="small" />,    label: "Service",    value: booking.haircutStyle || booking.serviceName },
    { icon: <LocationOnIcon fontSize="small" />,    label: "Location",   value: barber?.address || barber?.businessName },
  ].filter(r => r.value);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 }, textAlign: "center" }}>

      {/* Success Icon + Heading */}
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "success.main", mb: 2 }} />
      <Typography variant="h4" fontWeight={900} mb={1} sx={{ letterSpacing: '-0.02em' }}>
        YOU&rsquo;RE BOOKED!
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={1}>
        Hi <strong>{booking.customerName || booking.name}</strong>, your appointment is confirmed.
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        A confirmation email has been sent to <strong>{booking.email || booking.clientEmail}</strong>
      </Typography>

      {/* Appointment Summary */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 4,
          textAlign: "left",
          mb: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          borderTop: `6px solid ${brandColor}`
        }}
      >
        <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase' }}>
          Appointment Summary
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.5}>
          {appointmentRows.map(({ icon, label, value }) => (
            <Box key={label} display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1} sx={{ color: 'text.secondary' }}>
                {icon}
                <Typography variant="body2" fontWeight={700} color="text.secondary">{label}</Typography>
              </Box>
              <Typography variant="body2" fontWeight={800} sx={{ textAlign: 'right', maxWidth: '55%' }}>{value}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Payment Breakdown */}
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="text.secondary" gutterBottom sx={{ textTransform: 'uppercase', fontSize: 11 }}>
            Payment
          </Typography>
          <Box display="flex" justifyContent="space-between" mb={0.75}>
            <Typography variant="body2" color="text.secondary">Deposit</Typography>
            <Typography variant="body2" fontWeight={700}>{formatCurrency(booking.depositAmount || 0)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={0.75}>
            <Typography variant="body2" color="text.secondary">Booking Fee</Typography>
            <Typography variant="body2" fontWeight={700}>{formatCurrency(booking.bookingFee || 0)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" fontWeight={900}>Total Paid Today</Typography>
            <Typography variant="body1" fontWeight={900} color={brandColor}>{formatCurrency(totalPaid)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
            <Typography variant="caption" color="text.secondary">Remaining balance</Typography>
            <Chip label="Pay at shop" size="small" sx={{ fontSize: 10, height: 20 }} />
          </Box>
        </Box>
      </Paper>

      {/* Cancellation Policy */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          textAlign: "left",
          mb: 4,
          borderColor: "warning.light",
          bgcolor: "rgba(201,168,76,0.04)"
        }}
      >
        <Typography variant="body2" fontWeight={800} color="warning.dark" mb={0.5}>
          ⚠️ IMPORTANT INFORMATION
        </Typography>
        <Stack spacing={0.5} mt={1}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
            • Please arrive <strong>5 minutes early</strong>.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
            • To receive a full refund of your deposit, cancellations must be made at least <strong>24 hours in advance</strong>.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
            • Late cancellations and no-shows are <strong>non-refundable</strong>.
          </Typography>
        </Stack>
      </Paper>

      <Button
        component={Link}
        to="/"
        variant="contained"
        fullWidth
        size="large"
        sx={{
          bgcolor: 'black',
          color: 'white',
          fontWeight: 900,
          py: 2,
          borderRadius: 2,
          '&:hover': { bgcolor: brandColor }
        }}
      >
        DONE
      </Button>
    </Container>
  );
}