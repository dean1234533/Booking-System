import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Tab,
  Tabs,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  calculateTotalTax,
  calculateQuarterlyTaxEstimate,
  getTaxYearInfo,
  formatCurrency,
  getTaxRates,
} from "../../../utils/taxCalculator";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import imageCompression from "browser-image-compression";

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

export default function TaxFinanceTab({ barberId, profile }) {
  const [tabValue, setTabValue] = useState(0);
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [expensesList, setExpensesList] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState(null);

  const taxYear = getTaxYearInfo();

  // Load data from Firestore
  useEffect(() => {
    if (!barberId) return;
    loadFinancialData();
  }, [barberId]);

  async function loadFinancialData() {
    try {
      setLoading(true);

      // Load expenses
      const expensesRef = collection(db, "barbers", barberId, "expenses");
      const expensesSnap = await getDocs(query(expensesRef));
      setExpensesList(expensesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load income
      const incomeRef = collection(db, "barbers", barberId, "income");
      const incomeSnap = await getDocs(query(incomeRef));
      setIncomeList(incomeSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load invoices
      const invoicesRef = collection(db, "barbers", barberId, "invoices");
      const invoicesSnap = await getDocs(query(invoicesRef));
      setInvoices(invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading financial data:", error);
      setMessage({ type: "error", text: "Failed to load financial data" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense() {
    if (!expenseName.trim() || !expenseAmount || !barberId) {
      setMessage({ type: "error", text: "Please fill in all expense fields" });
      return;
    }

    try {
      const expensesRef = collection(db, "barbers", barberId, "expenses");
      await addDoc(expensesRef, {
        name: expenseName,
        amount: parseFloat(expenseAmount),
        date: new Date().toISOString(),
        category: "business",
      });

      setExpenseName("");
      setExpenseAmount("");
      setMessage({ type: "success", text: "Expense added successfully" });
      loadFinancialData();
    } catch (error) {
      console.error("Error adding expense:", error);
      setMessage({ type: "error", text: "Failed to add expense" });
    }
  }

  async function handleAddIncome() {
    if (!incomeDescription.trim() || !incomeAmount || !barberId) {
      setMessage({ type: "error", text: "Please fill in all income fields" });
      return;
    }

    try {
      const incomeRef = collection(db, "barbers", barberId, "income");
      await addDoc(incomeRef, {
        description: incomeDescription,
        amount: parseFloat(incomeAmount),
        date: new Date().toISOString(),
      });

      setIncomeDescription("");
      setIncomeAmount("");
      setMessage({ type: "success", text: "Income recorded successfully" });
      loadFinancialData();
    } catch (error) {
      console.error("Error adding income:", error);
      setMessage({ type: "error", text: "Failed to add income" });
    }
  }

  async function handleDeleteExpense(expenseId) {
    try {
      await deleteDoc(doc(db, "barbers", barberId, "expenses", expenseId));
      setMessage({ type: "success", text: "Expense deleted" });
      loadFinancialData();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete expense" });
    }
  }

  async function handleDeleteIncome(incomeId) {
    try {
      await deleteDoc(doc(db, "barbers", barberId, "income", incomeId));
      setMessage({ type: "success", text: "Income entry deleted" });
      loadFinancialData();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete income" });
    }
  }

  async function handleInvoiceUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image if it's an image file
      let compressedFile = file;
      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        compressedFile = await imageCompression(file, options);
      }

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64String = event.target.result;

          const invoicesRef = collection(db, "barbers", barberId, "invoices");
          await addDoc(invoicesRef, {
            fileName: file.name,
            fileType: compressedFile.type,
            fileData: base64String,
            fileSize: compressedFile.size,
            uploadDate: new Date().toISOString(),
            description: "",
          });

          setInvoiceFile(null);
          setInvoicePreview(null);
          setUploadDialogOpen(false);
          setMessage({ type: "success", text: "Invoice uploaded successfully" });
          loadFinancialData();
        } catch (error) {
          console.error("Error uploading invoice:", error);
          setMessage({ type: "error", text: "Failed to upload invoice" });
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error processing invoice:", error);
      setMessage({ type: "error", text: "Failed to process invoice file" });
    }
  }

  async function handleDeleteInvoice(invoiceId) {
    try {
      await deleteDoc(doc(db, "barbers", barberId, "invoices", invoiceId));
      setMessage({ type: "success", text: "Invoice deleted" });
      loadFinancialData();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete invoice" });
    }
  }

  // Calculate totals
  const totalIncome = incomeList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpenses = expensesList.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxData = calculateTotalTax({
    income: totalIncome,
    expenses: totalExpenses,
  });
  const quarterly = calculateQuarterlyTaxEstimate(totalIncome);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3, borderBottom: "2px solid #e0e0e0" }}
      >
        <Tab label="Overview" />
        <Tab label="Income" />
        <Tab label="Expenses" />
        <Tab label="Invoices" />
      </Tabs>

      {/* OVERVIEW TAB */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Tax Year Info */}
          <Grid item xs={12}>
            <Card sx={{ bgcolor: "rgba(255,255,255,0.04)" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {taxYear.year} Tax Year
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {taxYear.startDate.toLocaleDateString()} - {taxYear.endDate.toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Income Card */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, bgcolor: "rgba(76,175,80,0.12)", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Total Income
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: "#7ae8a0" }}>
                {formatCurrency(totalIncome)}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {incomeList.length} income entries
              </Typography>
            </Paper>
          </Grid>

          {/* Expenses Card */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, bgcolor: "rgba(244,67,54,0.12)", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Total Expenses
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: "#ff8a80" }}>
                {formatCurrency(totalExpenses)}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {expensesList.length} expense entries
              </Typography>
            </Paper>
          </Grid>

          {/* Profit Card */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, bgcolor: "rgba(255,152,0,0.12)", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Profit (before tax)
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: "#ffb74d" }}>
                {formatCurrency(taxData.profit)}
              </Typography>
            </Paper>
          </Grid>

          {/* Total Tax Card */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, bgcolor: "rgba(233,30,99,0.12)", borderRadius: 2, border: "1px solid rgba(233,30,99,0.4)" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Estimated Tax Owed
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: "#E91E63" }}>
                {formatCurrency(taxData.totalTaxOwed)}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1, color: "#E91E63" }}>
                ⚠️ This is an estimate. Verify with a tax professional.
              </Typography>
            </Paper>
          </Grid>

          {/* Net Profit Card */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: "rgba(76,175,80,0.12)", border: "1px solid rgba(76,175,80,0.4)", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Net Profit (after tax)
              </Typography>
              <Typography variant="h3" fontWeight={900} sx={{ color: "#7ae8a0" }}>
                {formatCurrency(taxData.netProfit)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tax Breakdown */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Tax Breakdown
            </Typography>
            <Table size="small">
              <TableBody>
                {Object.entries(taxData.breakdown).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quarterly Breakdown */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              🗓️ Quarterly Tax Payments
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
              Estimated quarterly Self-Assessment payment: <strong>{formatCurrency(quarterly.estimatedQuarterlyPayment)}</strong>
            </Typography>
            <List dense>
              {quarterly.paymentDates.map((date, idx) => (
                <React.Fragment key={idx}>
                  <ListItem>
                    <ListItemText primary={date} secondary={`Payment due: ${formatCurrency(quarterly.estimatedQuarterlyPayment)}`} />
                  </ListItem>
                  {idx < quarterly.paymentDates.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            <Alert severity="info" sx={{ mt: 2 }}>
              💡 These are Self-Assessment quarterly installment payments. Check GOV.UK for exact deadlines and submit via Self-Assessment Tax Return by 31 January.
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>

      {/* INCOME TAB */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Income description (e.g., Bookings)"
              value={incomeDescription}
              onChange={(e) => setIncomeDescription(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Amount (£)"
              type="number"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddIncome} fullWidth>
              Add Income
            </Button>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(255,255,255,0.05)" }}>
                <TableCell fontWeight={700}>Date</TableCell>
                <TableCell fontWeight={700}>Description</TableCell>
                <TableCell align="right" fontWeight={700}>
                  Amount
                </TableCell>
                <TableCell align="center" fontWeight={700}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incomeList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#999" }}>
                    No income entries yet
                  </TableCell>
                </TableRow>
              ) : (
                incomeList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right" fontWeight={700}>
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteIncome(item.id)}
                        sx={{ color: "#f44336" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* EXPENSES TAB */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Expense name (e.g., Office supplies)"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Amount (£)"
              type="number"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddExpense} fullWidth>
              Add Expense
            </Button>
          </Grid>
        </Grid>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(255,255,255,0.05)" }}>
                <TableCell fontWeight={700}>Date</TableCell>
                <TableCell fontWeight={700}>Name</TableCell>
                <TableCell align="right" fontWeight={700}>
                  Amount
                </TableCell>
                <TableCell align="center" fontWeight={700}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expensesList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#999" }}>
                    No expenses recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                expensesList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right" fontWeight={700}>
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteExpense(item.id)}
                        sx={{ color: "#f44336" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* INVOICES TAB */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<ImageIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload Invoice
          </Button>
        </Box>

        {invoices.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255,255,255,0.03)" }}>
            <Typography color="text.secondary">No invoices uploaded yet</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {invoices.map((invoice) => (
              <Grid item xs={12} sm={6} key={invoice.id}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <Box>
                      <Typography fontWeight={700}>{invoice.fileName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(invoice.uploadDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Size: {(invoice.fileSize / 1024).toFixed(2)} KB
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" href={invoice.fileData} download={invoice.fileName} title="Download">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        sx={{ color: "#f44336" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Upload Invoice Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Invoice</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <input
              accept="image/*,.pdf"
              style={{ display: "none" }}
              id="invoice-input"
              type="file"
              onChange={handleInvoiceUpload}
            />
            <label htmlFor="invoice-input" style={{ width: "100%" }}>
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<ImageIcon />}
              >
                Select Invoice File
              </Button>
            </label>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: "#666" }}>
              Supported formats: JPG, PNG, PDF. Files will be compressed automatically.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
