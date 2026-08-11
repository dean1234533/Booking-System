import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Button, TextField,
  CircularProgress, Alert, Grid, Tabs, Tab, Chip, Avatar,
  Divider, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, Paper, IconButton,
} from "@mui/material";
import PersonAddIcon      from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon  from "@mui/icons-material/DeleteOutline";
import EditIcon           from "@mui/icons-material/Edit";
import WhatsAppIcon       from "@mui/icons-material/WhatsApp";
import SearchIcon         from "@mui/icons-material/Search";
import EmailIcon          from "@mui/icons-material/Email";
import PhoneIcon          from "@mui/icons-material/Phone";
import LinkIcon           from "@mui/icons-material/Link";
import CheckIcon          from "@mui/icons-material/Check";
import AssignmentIcon     from "@mui/icons-material/Assignment";
import TrendingUpIcon     from "@mui/icons-material/TrendingUp";
import ListIcon           from "@mui/icons-material/List";
import FitnessCenterIcon  from "@mui/icons-material/FitnessCenter";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import PeopleIcon         from "@mui/icons-material/People";
import {
  getClientsList, createClient, deleteClient,
  getClientProfile, saveClientProfile,
} from "../../../firebase/firestore";
import {
  collection, getDocs, query, orderBy, limit,
  doc, getDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import ClientSubmittedForms    from "./ClientSubmittedForms";
import WorkoutPlansTab         from "./WorkoutPlansTab";
import NutritionPlanTab        from "./NutritionPlanTab";
import ExerciseGeneratorTab    from "./ExerciseGeneratorTab";
import NotepadTab              from "./NotepadTab";
import ClientFormsTab          from "./ClientFormsTab";

const METRICS = [
  { id: "weight",  label: "Weight",       unit: "kg"    },
  { id: "bodyfat", label: "Body Fat",     unit: "%"     },
  { id: "chest",   label: "Chest",        unit: "cm"    },
  { id: "waist",   label: "Waist",        unit: "cm"    },
  { id: "hips",    label: "Hips",         unit: "cm"    },
  { id: "steps",   label: "Daily Steps",  unit: "steps" },
  { id: "sleep",   label: "Sleep",        unit: "hrs"   },
  { id: "energy",  label: "Energy Level", unit: "/10"   },
];

export default function ClientProfileTab({ barber, profile, brandColor, trainerId: trainerIdProp, bookings = [] }) {
  const trainerId = trainerIdProp || barber?.uid || barber?.id;

  // Section-level tab (Clients | Workouts | Nutrition | …)
  const [sectionTab, setSectionTab] = useState(0);

  const [clients,        setClients]        = useState([]);
  const [selectedId,     setSelectedId]     = useState("");
  const [clientProfile,  setClientProfile]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [tab,            setTab]            = useState(0);

  // Profile edit
  const [editMode,  setEditMode]  = useState(false);
  const [editData,  setEditData]  = useState({});

  // Add dialog
  const [addOpen,   setAddOpen]   = useState(false);
  const [newClient, setNewClient] = useState({ customerName: "", customerEmail: "", customerPhone: "" });
  const [adding,    setAdding]    = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  // Portal link copy
  const [linkCopied, setLinkCopied] = useState(false);

  // Progress entries (submitted by client)
  const [progressEntries, setProgressEntries] = useState([]);
  const [progLoading,     setProgLoading]     = useState(false);

  // Check-in submissions
  const [checkIns,       setCheckIns]       = useState([]);
  const [checkInsLoading, setCheckInsLoading] = useState(false);

  useEffect(() => { loadClients(); }, [trainerId]);
  useEffect(() => { if (selectedId) loadClientProfile(); }, [selectedId]);

  const loadClients = async () => {
    if (!trainerId) return;
    setLoading(true);
    try {
      const data = await getClientsList(trainerId);
      setClients(data || []);
    } catch (err) {
      setError("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const loadClientProfile = async () => {
    if (!trainerId || !selectedId) return;
    setLoading(true);
    try {
      const p = await getClientProfile(trainerId, selectedId);
      setClientProfile(p || {});
      setEditData(p || {});
      setEditMode(false);
    } catch { setError("Failed to load client"); }
    finally  { setLoading(false); }
  };

  const loadProgressEntries = async () => {
    if (!trainerId || !selectedId) return;
    setProgLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "barbers", trainerId, "clients", selectedId, "progressEntries"), orderBy("createdAt", "desc"), limit(30))
      );
      setProgressEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { /* silent */ }
    finally { setProgLoading(false); }
  };

  const loadCheckIns = async () => {
    if (!trainerId || !selectedId) return;
    setCheckInsLoading(true);
    try {
      const snap = await getDocs(collection(db, "barbers", trainerId, "checkInSubmissions"));
      const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCheckIns(all.filter(c => c.clientId === selectedId).sort((a, b) => {
        const ta = a.submittedAt?.seconds || 0;
        const tb = b.submittedAt?.seconds || 0;
        return tb - ta;
      }));
    } catch { /* silent */ }
    finally { setCheckInsLoading(false); }
  };

  const handleTabChange = (_, newTab) => {
    setTab(newTab);
    if (newTab === 1) loadProgressEntries();
    if (newTab === 2) loadCheckIns();
  };

  const handleAddClient = async () => {
    if (!newClient.customerName.trim()) { setError("Please enter a client name"); return; }
    setAdding(true);
    setError("");
    try {
      const created = await createClient(trainerId, newClient);
      setClients(prev => [created, ...prev]);
      setSelectedId(created.id);
      setAddOpen(false);
      setNewClient({ customerName: "", customerEmail: "", customerPhone: "" });
    } catch (err) {
      setError("Failed to add client: " + err.message);
    } finally { setAdding(false); }
  };

  const handleDeleteClient = async () => {
    if (!trainerId || !selectedId) return;
    setDeleting(true);
    try {
      await deleteClient(trainerId, selectedId);
      setClients(prev => prev.filter(c => c.id !== selectedId));
      setSelectedId(""); setClientProfile(null); setDeleteOpen(false);
    } catch (err) {
      setError("Failed to delete client: " + err.message);
    } finally { setDeleting(false); }
  };

  const handleUpdateProfile = async () => {
    if (!trainerId || !selectedId) return;
    setLoading(true);
    try {
      await saveClientProfile(trainerId, selectedId, editData);
      setClientProfile(editData);
      setEditMode(false);
      // Update display name in list
      setClients(prev => prev.map(c => c.id === selectedId ? { ...c, customerName: editData.customerName || c.customerName } : c));
    } catch (err) { setError("Failed to update: " + err.message); }
    finally { setLoading(false); }
  };

  const handleCopyPortalLink = async () => {
    const url = `${window.location.origin}/client-portal/${trainerId}/${selectedId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch { prompt("Copy this link:", url); }
  };

  const handleWhatsApp = () => {
    if (clientProfile?.customerPhone) {
      const msg = encodeURIComponent(`Hi ${clientProfile.customerName}, here's your training portal: ${window.location.origin}/client-portal/${trainerId}/${selectedId}`);
      window.open(`https://wa.me/${clientProfile.customerPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    }
  };

  if (!trainerId) return <Box sx={{ p: 2 }}><Alert severity="warning">PT profile not found.</Alert></Box>;

  const SECTION_TABS = [
    { label: "Clients",         icon: <PeopleIcon fontSize="small" /> },
    { label: "Workouts",        icon: <FitnessCenterIcon fontSize="small" /> },
    { label: "Nutrition",       icon: <RestaurantMenuIcon fontSize="small" /> },
    { label: "Exercises",       icon: <FitnessCenterIcon fontSize="small" /> },
    { label: "Notepad",         icon: <ListIcon fontSize="small" /> },
    { label: "Check-In Config", icon: <AssignmentIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ p: { xs: 0, sm: 0 } }}>
      {/* ── Section navigation ── */}
      <Tabs
        value={sectionTab}
        onChange={(_, v) => setSectionTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {SECTION_TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 48, fontSize: "0.78rem" }} />
        ))}
      </Tabs>

      {/* ── Trainer tools (shown without needing a client selected) ── */}
      {sectionTab === 1 && <WorkoutPlansTab barber={barber} brandColor={brandColor} />}
      {sectionTab === 2 && <NutritionPlanTab barber={barber} profile={profile} brandColor={brandColor} bookings={bookings} />}
      {sectionTab === 3 && <ExerciseGeneratorTab barber={barber} profile={profile} brandColor={brandColor} />}
      {sectionTab === 4 && <NotepadTab barber={barber} profile={profile} brandColor={brandColor} />}
      {sectionTab === 5 && <ClientFormsTab barber={barber} brandColor={brandColor} />}

      {/* ── Clients section ── */}
      {sectionTab === 0 && (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>

      {/* ── Client selector row ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <SearchIcon color="action" />
            <TextField
              select fullWidth placeholder="Select a client…"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setTab(0); }}
              variant="standard" disabled={loading || clients.length === 0}
            >
              {clients.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.customerName}{c.customerEmail ? ` — ${c.customerEmail}` : ""}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setAddOpen(true)} sx={{ flexShrink: 0, bgcolor: brandColor, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}>
              Add
            </Button>
          </Box>
          {clients.length === 0 && !loading && (
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              No clients yet. Click <strong>Add</strong> to create one.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Add client dialog ── */}
      <Dialog open={addOpen} onClose={() => !adding && setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add a Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" required fullWidth autoFocus value={newClient.customerName} onChange={e => setNewClient({ ...newClient, customerName: e.target.value })} />
            <TextField label="Email" type="email" fullWidth value={newClient.customerEmail} onChange={e => setNewClient({ ...newClient, customerEmail: e.target.value })} />
            <TextField label="Phone (for WhatsApp)" fullWidth value={newClient.customerPhone} onChange={e => setNewClient({ ...newClient, customerPhone: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
          <Button variant="contained" onClick={handleAddClient} disabled={adding} sx={{ bgcolor: brandColor }}>
            {adding ? <CircularProgress size={16} /> : "Add Client"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete client?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This permanently removes <strong>{clientProfile?.customerName || "this client"}</strong>. This can't be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteClient} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Client detail area ── */}
      {loading && selectedId && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {!loading && selectedId && clientProfile && (
        <>
          {/* Profile header card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
                <Avatar sx={{ width: 52, height: 52, bgcolor: brandColor, fontWeight: 700, fontSize: "1.2rem" }}>
                  {clientProfile.customerName?.charAt(0) || "?"}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={700}>{clientProfile.customerName || "—"}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" gap={0.5} mt={0.25}>
                    {clientProfile.customerEmail && (
                      <Chip icon={<EmailIcon />} label={clientProfile.customerEmail} size="small" variant="outlined" />
                    )}
                    {clientProfile.customerPhone && (
                      <Chip icon={<PhoneIcon />} label={clientProfile.customerPhone} size="small" variant="outlined" />
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ flexShrink: 0 }}>
                  <Button size="small" variant="outlined" startIcon={linkCopied ? <CheckIcon /> : <LinkIcon />}
                    onClick={handleCopyPortalLink} color={linkCopied ? "success" : "primary"}>
                    {linkCopied ? "Copied!" : "Portal Link"}
                  </Button>
                  <Button size="small" variant="outlined" color="success" startIcon={<WhatsAppIcon />}
                    onClick={handleWhatsApp} disabled={!clientProfile.customerPhone}>
                    WhatsApp
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<EditIcon />}
                    onClick={() => setEditMode(!editMode)}>
                    {editMode ? "Cancel" : "Edit"}
                  </Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDeleteOpen(true)}>
                    Delete
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              <Tab label="Profile"    icon={<EditIcon fontSize="small" />}          iconPosition="start" />
              <Tab label="Progress"   icon={<TrendingUpIcon fontSize="small" />}   iconPosition="start" />
              <Tab label="Check-Ins"  icon={<AssignmentIcon fontSize="small" />}   iconPosition="start" />
              <Tab label="Forms"      icon={<AssignmentIcon fontSize="small" />}   iconPosition="start" />
            </Tabs>
            <Divider />
            <CardContent>

              {/* ── Profile tab ── */}
              {tab === 0 && (
                editMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth name="customerName" label="Name" size="small" value={editData.customerName || ""} onChange={e => setEditData({ ...editData, customerName: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth name="customerEmail" label="Email" type="email" size="small" value={editData.customerEmail || ""} onChange={e => setEditData({ ...editData, customerEmail: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth name="customerPhone" label="Phone" size="small" value={editData.customerPhone || ""} onChange={e => setEditData({ ...editData, customerPhone: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth name="age" label="Age" type="number" size="small" value={editData.age || ""} onChange={e => setEditData({ ...editData, age: e.target.value })} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth name="goals" label="Goals (comma-separated)" size="small"
                        value={Array.isArray(editData.goals) ? editData.goals.join(", ") : ""}
                        onChange={e => setEditData({ ...editData, goals: e.target.value.split(",").map(g => g.trim()) })} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth name="notes" label="PT Notes" multiline minRows={3} size="small" value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Private notes visible only to you..." />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={handleUpdateProfile} disabled={loading} sx={{ bgcolor: brandColor }}>Save</Button>
                        <Button variant="outlined" onClick={() => { setEditMode(false); setEditData(clientProfile); }}>Cancel</Button>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    {[
                      { icon: EmailIcon, label: "Email",    value: clientProfile.customerEmail },
                      { icon: PhoneIcon, label: "Phone",    value: clientProfile.customerPhone },
                    ].map(({ icon: Icon, label, value }) => value ? (
                      <Grid item xs={12} sm={6} key={label}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Icon fontSize="small" color="action" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="body2">{value}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ) : null)}
                    {clientProfile.age && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Age</Typography>
                        <Typography variant="body2">{clientProfile.age}</Typography>
                      </Grid>
                    )}
                    {clientProfile.goals?.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Goals</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {clientProfile.goals.map(g => <Chip key={g} label={g} size="small" variant="outlined" />)}
                        </Stack>
                      </Grid>
                    )}
                    {clientProfile.notes && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">PT Notes</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.25 }}>{clientProfile.notes}</Typography>
                      </Grid>
                    )}
                    {!clientProfile.customerEmail && !clientProfile.customerPhone && !clientProfile.age && !clientProfile.goals?.length && !clientProfile.notes && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">No profile details yet. Click Edit to add.</Typography>
                      </Grid>
                    )}
                  </Grid>
                )
              )}

              {/* ── Progress entries submitted by client ── */}
              {tab === 1 && (
                progLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress /></Box>
                ) : progressEntries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No progress logged yet. The client logs this themselves from their portal.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {progressEntries.map(entry => {
                      const meta = METRICS.find(m => m.id === entry.metric);
                      return (
                        <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip label={meta?.label || entry.metric} size="small" sx={{ bgcolor: `${brandColor}18`, color: brandColor, fontWeight: 600 }} />
                              <Typography fontWeight={700}>{entry.value} {entry.unit}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">{entry.date || ""}</Typography>
                          </Box>
                          {entry.notes && <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{entry.notes}</Typography>}
                        </Paper>
                      );
                    })}
                  </Stack>
                )
              )}

              {/* ── Check-ins submitted by client ── */}
              {tab === 2 && (
                checkInsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress /></Box>
                ) : checkIns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No check-ins received yet. The client submits these from their portal.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {checkIns.map(ci => (
                      <Paper key={ci.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          {ci.date || (ci.submittedAt?.toDate?.().toLocaleDateString("en-GB") || "Unknown date")}
                        </Typography>
                        <Stack spacing={1}>
                          {(ci.answers || []).map((a, i) => (
                            <Box key={i}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>{a.question}</Typography>
                              <Typography variant="body2">{a.answer || "—"}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )
              )}

              {/* ── Submitted forms (PAR-Q, food diary etc.) ── */}
              {tab === 3 && (
                <ClientSubmittedForms trainerId={trainerId} clientId={selectedId} />
              )}


            </CardContent>
          </Card>
        </>
      )}
    </Box>
      )}
    </Box>
  );
}
