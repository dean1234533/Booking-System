import React, { useEffect, useState } from "react";
import {
  Box, Button, TextField, Typography, IconButton, Grid, Switch,
  CircularProgress, Alert, Chip,
} from "@mui/material";
import {
  Delete as DeleteIcon, AddCircle as AddCircleIcon,
  Instagram as InstagramIcon, Facebook as FacebookIcon,
  Link as LinkIcon, CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { getShopStaff, addStaffMember, removeStaffMember, updateBarber, addSlot } from "../../../firebase/firestore";
import { Section, ImageField, PortfolioSection, TikTokIcon } from "./sharedFormComponents";

// Staff added here start with no login — the owner manages everything
// including availability, until the team member claims their invite link
// (see InviteBox/StaffSignup.jsx) and starts managing it themselves.
// Mirrors Onboarding.jsx's weekly-hours step exactly (same DAYS/DAY_INDEX/
// date-walk), just scoped to a specific staff member's barberId instead of
// the owner's own uid.
const HOURS_DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];
const HOURS_DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const addDaysToDate = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

function WeeklyHours({ staffId, shopId, brandColor, businessType }) {
  // Barber is the only type with real per-person booking pages (BarberProfile
  // queries slots by its own id) — hairdresser/decorator/PT staff pages all
  // book against the shop's shared pool (queried by shopId), so a staff
  // member's slots there need to carry the shop's id to actually show up.
  const slotBarberId = businessType === "barber" ? staffId : shopId;
  const [hours, setHours] = useState(() =>
    Object.fromEntries(HOURS_DAYS.map(d => [d.key, { enabled: false, start: "09:00", end: "17:00" }]))
  );
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const toggleDay = (key) => setHours(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  const setDayTime = (key, field, value) => setHours(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  async function handleGenerate() {
    const enabledDays = HOURS_DAYS.filter(d => hours[d.key].enabled);
    if (enabledDays.length === 0) return;
    setGenerating(true);
    setDone(false);
    try {
      const today = new Date().toISOString().split("T")[0];
      const jobs = [];
      for (let i = 0; i < 28; i++) {
        const date = addDaysToDate(today, i);
        const weekday = new Date(date + "T00:00:00").getDay();
        const dayCfg = enabledDays.find(d => HOURS_DAY_INDEX[d.key] === weekday);
        if (dayCfg) {
          jobs.push(addSlot({ barberId: slotBarberId, shopId, isStaff: true, date, time: hours[dayCfg.key].start }));
        }
      }
      await Promise.all(jobs);
      setDone(true);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Section title="Weekly Hours">
      <Typography variant="body2" color="text.secondary" mb={2}>
        This team member has no login of their own, so their availability is set here. Turn on the days they work — this opens slots for the next 4 weeks. Running it again adds another 4 weeks on top, so only re-run it once existing slots are running low.
      </Typography>
      {HOURS_DAYS.map(d => (
        <Box key={d.key} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderBottom: "1px solid #f0f0f0" }}>
          <Switch size="small" checked={hours[d.key].enabled} onChange={() => toggleDay(d.key)}
            sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: brandColor }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: brandColor } }} />
          <Typography sx={{ width: 40, fontWeight: 600, fontSize: 13 }}>{d.label}</Typography>
          <TextField type="time" size="small" value={hours[d.key].start} disabled={!hours[d.key].enabled}
            onChange={e => setDayTime(d.key, "start", e.target.value)} sx={{ width: 120 }} />
          <Typography variant="caption" color="text.secondary">to</Typography>
          <TextField type="time" size="small" value={hours[d.key].end} disabled={!hours[d.key].enabled}
            onChange={e => setDayTime(d.key, "end", e.target.value)} sx={{ width: 120 }} />
        </Box>
      ))}
      <Box display="flex" alignItems="center" gap={1.5} mt={2}>
        <Button variant="contained" size="small" disabled={generating} onClick={handleGenerate} sx={{ bgcolor: brandColor }}>
          {generating ? <CircularProgress size={16} color="inherit" /> : "Generate 4 Weeks of Slots"}
        </Button>
        {done && <Typography variant="caption" color="success.main">Slots created</Typography>}
      </Box>
    </Section>
  );
}

function InviteBox({ member, shopId, brandColor }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/staff-signup/${shopId}/${member.id}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invite link:", inviteUrl);
    }
  }

  return (
    <Section title="Give them their own login">
      <Typography variant="body2" color="text.secondary" mb={2}>
        Send this link to {member.name || "this team member"} so they can set a password, then manage their own hours, photo and page from their own dashboard — instead of you doing it for them.
      </Typography>
      <Button variant="outlined" size="small" startIcon={<LinkIcon />} onClick={handleCopy} sx={{ borderColor: brandColor, color: brandColor }}>
        {copied ? "Link copied!" : "Copy invite link"}
      </Button>
    </Section>
  );
}

function StaffMemberCard({ member, shopId, brandColor, businessType, onRemove }) {
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
      {data.hasLogin && (
        <Chip icon={<CheckCircleIcon />} label="Has their own login" size="small" color="success" variant="outlined" sx={{ mb: 2 }} />
      )}
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

      {data.hasLogin ? (
        <Typography variant="body2" color="text.secondary" mt={3}>
          {data.name || "This team member"} manages their own hours and profile from their own dashboard.
        </Typography>
      ) : (
        <>
          <WeeklyHours staffId={member.id} shopId={shopId} brandColor={brandColor} businessType={businessType} />
          <InviteBox member={data} shopId={shopId} brandColor={brandColor} />
        </>
      )}

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

export default function StaffTab({ shopId, brandColor, businessType }) {
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
          <StaffMemberCard key={member.id} member={member} shopId={shopId} brandColor={brandColor} businessType={businessType} onRemove={handleRemove} />
        ))
      )}
    </Box>
  );
}
