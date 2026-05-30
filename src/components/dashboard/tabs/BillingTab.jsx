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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { CreditCard, CheckCircle, WarningAmber } from "@mui/icons-material";
import { useAuth } from "../../../context/AuthContext";
import { getBillingInfo, reportUsageToStripe, calculateTrainerCost } from "../../../utils/billingUtils";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";

export default function BillingTab({ barber: passedBarber, profile, brandColor }) {
  const { barber: authBarber, user } = useAuth();
  const barber = passedBarber || authBarber;
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      try {
        setLoading(true);
        const userId = barber?.uid || barber?.id;
        const billingInfo = await getBillingInfo(userId);
        setBilling(billingInfo);
      } catch (error) {
        console.error("Error loading billing:", error);
        setMessage({ type: "error", text: "Failed to load billing info" });
      } finally {
        setLoading(false);
      }
    }

    if (barber?.uid || barber?.id) {
      loadBilling();
    }
  }, [barber?.uid, barber?.id]);

  const handleReportUsage = async () => {
    const userId = barber?.uid || barber?.id;
    if (!userId || !user?.email || !billing) return;

    setReporting(true);
    setMessage(null);

    try {
      const result = await reportUsageToStripe(userId, user.email, billing.clientCount);

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

  const handleBillingPortal = async () => {
    const userId = barber?.uid || barber?.id;
    if (!userId) return;

    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: userId }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const text = await res.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      const data = JSON.parse(text);
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setMessage({ type: "error", text: `Billing error: ${data.error}` });
      } else {
        throw new Error("No URL in response");
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      setMessage({
        type: "error",
        text: "Failed to open billing portal. Please ensure Stripe is connected in the Finance tab."
      });
    }
  };

  const handleViewInvoices = async () => {
    const userId = barber?.uid || barber?.id;
    if (!userId) return;

    setInvoiceDialogOpen(true);
    setInvoicesLoading(true);

    try {
      const invoicesRef = collection(db, "barbers", userId, "invoices");
      const snapshot = await getDocs(invoicesRef);
      const invoiceList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(a.date);
        const dateB = b.date?.toDate?.() || new Date(b.date);
        return dateB - dateA;
      });
      setInvoices(invoiceList);
    } catch (error) {
      console.error("Failed to load invoices:", error);
      setMessage({ type: "error", text: "Failed to load invoices" });
    } finally {
      setInvoicesLoading(false);
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
            onClick={handleBillingPortal}
            sx={{ mb: 1 }}
          >
            Manage Payment Methods (via Stripe)
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={handleViewInvoices}
            sx={{ mb: 2 }}
          >
            View Invoice History
          </Button>

          <Typography variant="caption" color="text.secondary" display="block">
            Need help with billing? Contact support at support@yourdomain.com
          </Typography>
        </CardContent>
      </Card>

      {/* Invoice History Dialog */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoice History</DialogTitle>
        <DialogContent>
          {invoicesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : invoices.length === 0 ? (
            <Typography color="text.secondary">No invoices found</Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {invoices.map(invoice => {
                const invoiceDate = invoice.date?.toDate?.() || new Date(invoice.date);
                const formattedDate = invoiceDate.toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <Paper key={invoice.id} sx={{ p: 2, bgcolor: "#F5F5F5" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Invoice {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        £{invoice.amount || "0.00"}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formattedDate}
                    </Typography>
                    {invoice.description && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {invoice.description}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
