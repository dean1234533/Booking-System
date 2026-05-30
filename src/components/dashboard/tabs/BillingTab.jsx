import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Paper,
  Chip,
} from "@mui/material";
import { CreditCard, CheckCircle, WarningAmber } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { getBillingInfo, reportUsageToStripe, calculateTrainerCost } from "../../../utils/billingUtils";

export default function BillingTab({ barber: passedBarber, profile, brandColor }) {
  const { barber: authBarber, user } = useAuth();
  const barber = passedBarber || authBarber;
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadBilling() {
      try {
        setLoading(true);
        const billingInfo = await getBillingInfo(barber.id);
        setBilling(billingInfo);
      } catch (error) {
        console.error("Error loading billing:", error);
        setMessage({ type: "error", text: "Failed to load billing info" });
      } finally {
        setLoading(false);
      }
    }

    if (barber?.id) {
      loadBilling();
    }
  }, [barber?.id]);

  const handleReportUsage = async () => {
    if (!barber?.id || !user?.email || !billing) return;

    setReporting(true);
    setMessage(null);

    try {
      const result = await reportUsageToStripe(barber.id, user.email, billing.clientCount);

      if (result?.success) {
        setMessage({
          type: "success",
          text: `Usage reported: ${billing.clientCount} clients (${result.data.billingUnits} billing units)`,
        });
      } else {
        setMessage({
          type: "info",
          text: "Usage reporting completed",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Failed to report usage",
      });
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!billing) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">Unable to load billing information</Alert>
      </Box>
    );
  }

  const isTrainer = billing.businessType === "trainer";

  return (
    <Box sx={{ py: 3 }}>
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {/* Main Billing Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <CreditCard size={24} style={{ marginRight: 12 }} />
            <Typography variant="h6" fontWeight={600}>
              Current Billing
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Base Cost */}
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, bgcolor: "#F5F5F5", borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Base Monthly Fee
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {billing.baseCost}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isTrainer ? "Includes 10 clients" : "All services included"}
                </Typography>
              </Paper>
            </Grid>

            {/* Overage Cost */}
            {isTrainer && (
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: "#E3F2FD", borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Extra Clients
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {billing.overageCost}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {billing.overageClients} extra × £1.50 per 3
                  </Typography>
                </Paper>
              </Grid>
            )}

            {/* Total Cost */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, bgcolor: "#C8E6C9", borderRadius: 2, border: "2px solid #4CAF50" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Total Monthly Cost
                    </Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: "#1B5E20" }}>
                      {billing.totalCost}
                    </Typography>
                  </Box>
                  <CheckCircle size={40} style={{ color: "#4CAF50" }} />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Client Info (Trainers Only) */}
          {isTrainer && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Client Count Breakdown
              </Typography>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                <Chip
                  label={`Total: ${billing.clientCount}`}
                  color="primary"
                  variant="filled"
                />
                <Chip
                  label={`Free: ${billing.freeClients}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`Extra: ${billing.overageClients}`}
                  color="warning"
                  variant="outlined"
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {billing.message}
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={handleReportUsage}
                disabled={reporting}
                sx={{ mb: 2 }}
              >
                {reporting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                {reporting ? "Reporting..." : "Report Usage to Stripe"}
              </Button>

              <Typography variant="caption" color="text.secondary" display="block">
                Usage is typically reported automatically daily. Use this button to manually report your current client count.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Pricing Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {isTrainer ? "PT Booking System Pricing" : "Booking System Pricing"}
          </Typography>

          {isTrainer ? (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Base Fee:</strong> £20/month (includes 10 clients)
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Extra Clients:</strong> £1.50 per 3 clients/month
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Your Cost:</strong> {billing.totalCost}/month
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Calculation Example:
              </Typography>
              <Typography variant="caption" display="block" sx={{ mb: 2, fontFamily: "monospace", bgcolor: "#F5F5F5", p: 1, borderRadius: 1 }}>
                {billing.overageClients > 0
                  ? `£20 (base) + (${billing.overageClients} extra clients ÷ 3 = ${billing.overageUnits} units) × £1.50 = ${billing.totalCost}`
                  : `£20 (base, all 10 clients included) = ${billing.totalCost}`}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Monthly Fee:</strong> £10/month
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Includes:</strong> All booking system features
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Your Cost:</strong> {billing.totalCost}/month
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1, bgcolor: "#FFF3CD", borderRadius: 1 }}>
            <WarningAmber sx={{ fontSize: 20, marginTop: 0.25, flexShrink: 0 }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Next Billing Date
              </Typography>
              <Typography variant="body2">
                Your next invoice will be generated on the 1st of next month, based on your current client count.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Payment Management */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Payment Management
          </Typography>

          <Button
            variant="outlined"
            fullWidth
            href="https://billing.stripe.com/login"
            target="_blank"
            sx={{ mb: 1 }}
          >
            Manage Payment Methods
          </Button>

          <Button
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
          >
            View Invoice History
          </Button>

          <Typography variant="caption" color="text.secondary" display="block">
            Need help with billing? Contact support at support@yourdomain.com
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
