import React, { useState, useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Paper, Alert } from "@mui/material";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getBooking, cancelBooking, createNotification } from "../firebase/firestore";
import { db } from "../firebase/config"; 
import { doc, getDoc } from "firebase/firestore";

export default function CancelBooking() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState("loading");
  const [branding, setBranding] = useState({ color: "#C9A84C", tenant: null });

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        if (!bookingId) {
            if (mounted) setStatus("error");
            return;
        }

        const bIdFromUrl = searchParams.get("barber");
        let booking = null;

        if (bIdFromUrl) {
          try {
            const nestedRef = doc(db, "barbers", bIdFromUrl, "bookings", bookingId);
            const nestedSnap = await getDoc(nestedRef);
            if (nestedSnap.exists()) {
              booking = { id: nestedSnap.id, ...nestedSnap.data() };
            }
          } catch (e) {
            console.error("Nested fetch error", e);
          }
        }

        if (!booking && typeof getBooking === 'function') {
          booking = await getBooking(bookingId); 
        }
        
        if (!booking) {
          if (mounted) setStatus("error");
          return;
        }

        const bId = booking.barberId || bIdFromUrl;
        let barberData = null;
        
        if (bId) {
          try {
            const barberSnap = await getDoc(doc(db, "barbers", bId));
            if (barberSnap.exists() && mounted) {
              barberData = barberSnap.data();
              setBranding({
                color: barberData.brandColor || "#C9A84C",
                tenant: { id: bId, ...barberData } 
              });
            }
          } catch (brandingError) {
            console.warn("Branding fetch failed:", brandingError);
          }
        }

        if (booking.status === "cancelled") {
          if (mounted) setStatus("already_cancelled");
          return;
        }

        if (typeof cancelBooking === 'function') {
            await cancelBooking(bookingId, booking.slotId, bId);
        }

        const pId = booking.paymentIntentId || booking.stripePaymentIntentId;
        const dateVal = booking.date || booking.slotDate;
        const timeVal = booking.time || booking.slotTime;
        const stripeAccountId = barberData?.stripeAccountId; // ✅ ADDED

        if (pId && dateVal && timeVal) {
          fetch('/api/cancel-refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              paymentIntentId: pId, 
              stripeAccountId: stripeAccountId, // ✅ ADDED
              date: dateVal, 
              time: timeVal 
            })
          })
          .then(res => res.json())
          .then(() => {})
          .catch((err) => console.error("Refund endpoint error:", err));
        }
        
        // 5. NOTIFICATION
        if (bId) {
          const clientName = booking.name || booking.customerName || "Customer";
          const serviceName = booking.haircutStyle || booking.serviceName || "appointment";
          createNotification(bId, {
            type:  "cancellation",
            title: "Booking Cancelled",
            body:  `${clientName} cancelled their ${serviceName} on ${dateVal} at ${timeVal}`,
            data:  { bookingId: booking.id, clientName, serviceName, date: dateVal, time: timeVal },
          });
        }

        if (mounted) setStatus("success");
      } catch (e) {
        console.error("Critical Page Error:", e);
        if (mounted) setStatus("error");
      }
    }
    
    run();
    return () => { mounted = false; };
  }, [bookingId, searchParams]);

  const handleGoHome = () => {
    const path = branding?.tenant?.id ? `/?barber=${branding.tenant.id}` : "/";
    navigate(path, { state: { tenant: branding?.tenant } });
  };

  const themeColor = branding?.color || "#C9A84C";

  return (
    <Box sx={{ p: 4, maxWidth: 500, mx: "auto", mt: 8, textAlign: "center" }}>
      <Paper variant="outlined" sx={{ 
          p: 4, borderRadius: 4, 
          boxShadow: "0px 10px 30px rgba(0,0,0,0.05)",
          borderTop: `8px solid ${status === "error" ? "#d32f2f" : themeColor}`
      }}>
        {status === "loading" ? (
          <Box sx={{ py: 2 }}>
            <CircularProgress sx={{ mb: 3, color: themeColor }} />
            <Typography variant="h6" fontWeight={700}>Processing...</Typography>
          </Box>
        ) : (
          <>
            {status === "success" && (
              <Box>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>Appointment Cancelled</Alert>
                <Typography variant="body1" sx={{ mb: 3 }}>Successfully removed. Refunds process in 5-10 days.</Typography>
              </Box>
            )}
            
            {status === "already_cancelled" && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>This appointment is already cancelled.</Alert>
            )}

            {status === "error" && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>We couldn't process this automatically. Please contact the shop.</Alert>
            )}
            
            <Button 
                variant="contained" 
                fullWidth 
                sx={{ bgcolor: themeColor, '&:hover': { bgcolor: themeColor, filter: 'brightness(0.9)' } }} 
                onClick={handleGoHome}
            >
              Back to Home
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}