import React, { useEffect, useState } from "react";
import {
  Box, Button, TextField, Typography, IconButton, Grid,
  CircularProgress, Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon, AddCircle as AddCircleIcon,
  Instagram as InstagramIcon, Facebook as FacebookIcon,
} from "@mui/icons-material";
import { getShopStaff, addStaffMember, removeStaffMember, updateBarber } from "../../../firebase/firestore";
import { Section, ImageField, PortfolioSection, TikTokIcon } from "./sharedFormComponents";

function StaffMemberCard({ member, shopId, brandColor, onRemove }) {
  const [data, setData] = useState(member);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (key, val) => { setData(prev => ({ ...prev, [key]: val })); setSaved(false); };

  const services = data.services?.length > 0 ? data.services : [{ name: "", price: "" }];
  const updateService = (i, field, val) =>
    set("services", services.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  async function handleSave() {
    setSaving(true);
    try {
      await updateBarber(member.id, data, true, shopId);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title={`${data.name || "New team member"}${data.specialty ? " — " + data.specialty : ""}`}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Name" value={data.name || ""} onChange={e => set("name", e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="Role / Specialty" value={data.specialty || ""} onChange={e => set("specialty", e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline rows={3} size="small" label="Bio" value={data.bio || ""} onChange={e => set("bio", e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <ImageField label="Photo" value={data.profilePic || data.photoURL || ""} onChange={v => set("profilePic", v)}
            barberId={member.id} fieldKey="staff_photo" isStaff shopId={shopId} />
        </Grid>
      </Grid>

      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mt={3} mb={1}>
        Services (leave empty to show the shop's services instead)
      </Typography>
      {services.map((svc, i) => (
        <Box key={i} display="flex" gap={1} mb={1} alignItems="center">
          <TextField fullWidth size="small" label={`Service ${i + 1}`} value={svc.name || ""} onChange={e => updateService(i, "name", e.target.value)} />
          <TextField size="small" label="Price (£)" sx={{ width: 110, flexShrink: 0 }} value={svc.price || ""} onChange={e => updateService(i, "price", e.target.value)} />
          <IconButton size="small" color="error" onClick={() => set("services", services.filter((_, idx) => idx !== i))}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddCircleIcon />} sx={{ color: brandColor, mb: 2 }}
        onClick={() => set("services", [...services, { name: "", price: "" }])}>
        Add Service
      </Button>

      <PortfolioSection profile={data} set={set} brandColor={brandColor} barberId={member.id} isStaff shopId={shopId}
        headingPlaceholder="Recent work" subtextPlaceholder="Drag the slider to reveal the difference." />

      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mt={3} mb={1}>Personal socials</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth size="small" label="Instagram" value={data.staffInstagram || ""} onChange={e => set("staffInstagram", e.target.value)}
            InputProps={{ startAdornment: <InstagramIcon fontSize="small" sx={{ mr: 1, color: "#E1306C" }} /> }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth size="small" label="TikTok" value={data.staffTiktok || ""} onChange={e => set("staffTiktok", e.target.value)}
            InputProps={{ startAdornment: <Box sx={{ mr: 1, display: "flex" }}><TikTokIcon size={16} /></Box> }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth size="small" label="Facebook" value={data.staffFacebook || ""} onChange={e => set("staffFacebook", e.target.value)}
            InputProps={{ startAdornment: <FacebookIcon fontSize="small" sx={{ mr: 1, color: "#1877F2" }} /> }} />
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
        <Button color="error" size="small" onClick={() => onRemove(member.id)}>Remove from team</Button>
        <Box display="flex" alignItems="center" gap={1.5}>
          {saved && <Typography variant="caption" color="success.main">Saved</Typography>}
          <Button variant="contained" size="small" disabled={saving} onClick={handleSave} sx={{ bgcolor: brandColor }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : "Save"}
          </Button>
        </Box>
      </Box>
    </Section>
  );
}

export default function StaffTab({ shopId, brandColor }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shopId) return;
    getShopStaff(shopId).then(list => { setStaff(list); setLoading(false); }).catch(() => setLoading(false));
  }, [shopId]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const id = await addStaffMember(shopId, { name: newName.trim(), specialty: "", bio: "", services: [], portfolioItems: [] });
      setStaff(prev => [...prev, { id, uid: id, shopId, role: "staff", name: newName.trim() }]);
      setNewName("");
    } catch (e) {
      setError("Couldn't add team member — please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(staffId) {
    if (!window.confirm("Remove this team member? Their public page will stop working immediately.")) return;
    try {
      await removeStaffMember(shopId, staffId);
      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch {
      setError("Couldn't remove that team member — please try again.");
    }
  }

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Add team members to give each of them their own page — gallery, services, reviews and socials — linked from your shop page.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box display="flex" gap={1} mb={3}>
        <TextField size="small" fullWidth label="New team member's name" value={newName} onChange={e => setNewName(e.target.value)} />
        <Button variant="contained" disabled={adding || !newName.trim()} onClick={handleAdd} sx={{ bgcolor: brandColor, flexShrink: 0 }}>
          {adding ? <CircularProgress size={18} color="inherit" /> : "Add"}
        </Button>
      </Box>

      {staff.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" mt={4}>No team members yet.</Typography>
      ) : (
        staff.map(member => (
          <StaffMemberCard key={member.id} member={member} shopId={shopId} brandColor={brandColor} onRemove={handleRemove} />
        ))
      )}
    </Box>
  );
}
