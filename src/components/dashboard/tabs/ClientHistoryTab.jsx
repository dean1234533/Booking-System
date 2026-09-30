import React, { useState, useRef } from "react";
import {
  Box, Typography, Button, IconButton, TextField, Stack,
  CircularProgress,
} from "@mui/material";
import ColorLensIcon         from "@mui/icons-material/ColorLens";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ArrowBackIcon         from "@mui/icons-material/ArrowBack";
import DeleteIcon            from "@mui/icons-material/Delete";
import SearchIcon            from "@mui/icons-material/Search";
import AddIcon               from "@mui/icons-material/Add";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { db, storage } from "../../../firebase/config";

const IMAGE_COMPRESSION_OPTIONS = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };

const SERIF = "'Playfair Display', serif";

function sanitizePhone(raw) { return raw.replace(/\D/g, "").slice(0, 15); }

function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function darkField(brand) {
  return {
    "& .MuiInputLabel-root":             { color: "rgba(0,0,0,0.5)", fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#1a1a1a", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(0,0,0,0.15)" },
      "&:hover fieldset":       { borderColor: "rgba(0,0,0,0.3)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
  };
}

const EMPTY_FORM = {
  clientName: "", stylistName: "", service: "", formula: "", developerVol: "",
  patchTestDate: "", notes: "",
};

export default function ClientHistoryTab({ barber, brandColor }) {
  const [view,        setView]    = useState("search"); // "search" | "history" | "add"
  const [phone,       setPhone]   = useState("");
  const [visits,      setVisits]  = useState([]);
  const [loading,     setLoading] = useState(false);
  const [saving,      setSaving]  = useState(false);
  const [error,       setError]   = useState("");
  const [form,        setForm]    = useState(EMPTY_FORM);
  const [photoFile,   setPhoto]   = useState(null);
  const [photoPreview, setPrev]   = useState("");
  const fileRef = useRef(null);

  const shopId = barber?.uid || barber?.id;
  const key    = sanitizePhone(phone);
  const visitsCol = () => collection(db, "barbers", shopId, "clientHistory", key, "visits");
  const fs = darkField(brandColor);

  async function search() {
    if (key.length < 7) { setError("Enter at least 7 digits."); return; }
    setError(""); setLoading(true);
    try {
      const snap = await getDocs(visitsCol());
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setVisits(data);
      setView("history");
    } catch (e) { console.error(e); setError("Failed to load records."); }
    finally     { setLoading(false); }
  }

  async function saveVisit() {
    if (!form.stylistName.trim()) { setError("Enter the stylist name."); return; }
    setError(""); setSaving(true);
    try {
      let photoUrl = "";
      if (photoFile) {
        const compressed = await imageCompression(photoFile, IMAGE_COMPRESSION_OPTIONS);
        const sRef = ref(storage, `clientHistory/${shopId}/${key}/${Date.now()}`);
        await uploadBytes(sRef, compressed);
        photoUrl = await getDownloadURL(sRef);
      }
      const data = {
        clientName:    form.clientName.trim(),
        stylistName:   form.stylistName.trim(),
        service:       form.service.trim(),
        formula:       form.formula.trim(),
        developerVol:  form.developerVol.trim(),
        patchTestDate: form.patchTestDate || "",
        notes:         form.notes.trim(),
        photoUrl,
        phone: key,
        createdAt: serverTimestamp(),
      };
      const added = await addDoc(visitsCol(), data);
      setVisits(prev => [{ id: added.id, ...data, createdAt: new Date() }, ...prev]);
      setForm(EMPTY_FORM); setPhoto(null); setPrev("");
      setView("history");
    } catch (e) { console.error(e); setError("Failed to save."); }
    finally     { setSaving(false); }
  }

  async function removeVisit(id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteDoc(doc(db, "barbers", shopId, "clientHistory", key, "visits", id));
      setVisits(prev => prev.filter(v => v.id !== id));
    } catch (e) { console.error(e); }
  }

  function reset() {
    setView("search"); setPhone(""); setVisits([]);
    setForm(EMPTY_FORM); setPhoto(null); setPrev(""); setError("");
  }

  // ── HEADER ───────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {view !== "search" && (
            <IconButton
              onClick={() => view === "add" ? setView("history") : reset()}
              sx={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 0, color: "rgba(0,0,0,0.5)", "&:hover": { color: "#1a1a1a" } }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Box>
            <Typography sx={{ color: "#1a1a1a", fontFamily: SERIF, fontSize: "1.5rem", fontWeight: 400 }}>
              {view === "search"  && "Client Records"}
              {view === "history" && `${key} · ${visits.length} visit${visits.length !== 1 ? "s" : ""}`}
              {view === "add"     && "Log New Visit"}
            </Typography>
            <Typography sx={{ color: "rgba(0,0,0,0.55)", fontSize: "0.8rem", mt: 0.4 }}>
              {view === "search"  && "Look up any client by their phone number to view or add their colour and style history."}
              {view === "history" && "Full visit history — colour formulas, patch tests, stylist notes, and reference photos."}
              {view === "add"     && `Recording visit for ${key}.`}
            </Typography>
          </Box>
        </Box>
        {view === "history" && (
          <Button
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => { setForm(EMPTY_FORM); setPhoto(null); setPrev(""); setView("add"); }}
            sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.08em", px: 2.5, py: 1.1, borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}
          >
            Log New Visit
          </Button>
        )}
      </Box>

      {/* ── SEARCH ── */}
      {view === "search" && (
        <Box sx={{ maxWidth: 480 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Client Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              inputProps={{ inputMode: "tel" }}
              helperText="Records are stored per phone number — enter it to pull up their history."
              FormHelperTextProps={{ sx: { color: "rgba(0,0,0,0.45)", fontSize: "0.75rem" } }}
              sx={fs}
            />
            {error && <Typography sx={{ color: "#ff6b6b", fontSize: "0.78rem" }}>{error}</Typography>}
            <Button
              onClick={search}
              disabled={loading || key.length < 7}
              startIcon={loading ? <CircularProgress size={14} sx={{ color: "#0d0d0d" }} /> : <SearchIcon sx={{ fontSize: 16 }} />}
              sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, py: 1.5, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.5 } }}
            >
              {loading ? "Searching…" : "Search Records"}
            </Button>
          </Stack>
        </Box>
      )}

      {/* ── HISTORY ── */}
      {view === "history" && (
        <Box sx={{ maxWidth: 760 }}>
          {visits.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 10, border: "1px dashed rgba(0,0,0,0.12)" }}>
              <ColorLensIcon sx={{ fontSize: 44, color: "rgba(0,0,0,0.15)", mb: 2 }} />
              <Typography sx={{ color: "rgba(0,0,0,0.5)", fontSize: "0.88rem", mb: 1 }}>No visits on record for this number.</Typography>
              <Typography sx={{ color: "rgba(0,0,0,0.35)", fontSize: "0.78rem" }}>Use "Log New Visit" to record their first appointment.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {visits.map(visit => (
                <Box key={visit.id} sx={{ bgcolor: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden" }}>
                  {visit.photoUrl && (
                    <Box component="img" src={visit.photoUrl} alt="visit reference"
                      sx={{ width: "100%", aspectRatio: { xs: "3 / 4", sm: "4 / 3" }, objectFit: "contain", objectPosition: "top center", display: "block", bgcolor: "#111" }} />
                  )}
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#1a1a1a" }}>
                          {visit.clientName || "Client"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.5)", mt: 0.2 }}>
                          {visit.service ? `${visit.service} · ` : ""}By {visit.stylistName} · {fmtDate(visit.createdAt)}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => removeVisit(visit.id)}
                        sx={{ color: "rgba(0,0,0,0.4)", "&:hover": { color: "#ff6b6b" } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    {(visit.formula || visit.developerVol) && (
                      <Typography sx={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.65)", mb: 1 }}>
                        {visit.formula && <>Formula: <strong>{visit.formula}</strong></>}
                        {visit.formula && visit.developerVol ? " · " : ""}
                        {visit.developerVol && <>Developer: <strong>{visit.developerVol}</strong></>}
                      </Typography>
                    )}
                    {visit.patchTestDate && (
                      <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.5)", mb: 1 }}>
                        Patch test: {new Date(visit.patchTestDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </Typography>
                    )}
                    {visit.notes && (
                      <Typography sx={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.55)", fontStyle: "italic", lineHeight: 1.65 }}>
                        "{visit.notes}"
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ── ADD NEW VISIT ── */}
      {view === "add" && (
        <Box sx={{ maxWidth: 760 }}>
          {/* Photo upload */}
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              width: "100%", aspectRatio: { xs: "3 / 4", sm: "4 / 3" },
              minHeight: { xs: 360, sm: 480 }, bgcolor: "#111", mb: 1,
              border: photoPreview ? "none" : "2px dashed rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", overflow: "hidden",
              "&:hover": { borderColor: `${brandColor}55` },
            }}
          >
            {photoPreview ? (
              <Box component="img" src={photoPreview} alt="Visit reference preview" sx={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "top center" }} />
            ) : (
              <Box sx={{ textAlign: "center" }}>
                <AddPhotoAlternateIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.55)", mb: 1 }} />
                <Typography sx={{ fontSize: "0.86rem", color: "rgba(255,255,255,0.78)" }}>Click to add reference photo</Typography>
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.5)", mb: 3 }}>
            The full photo is shown without cropping so the result stays visible. Portrait photos work best.
          </Typography>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            setPhoto(f); setPrev(URL.createObjectURL(f));
          }} />

          <Stack spacing={2}>
            <TextField
              fullWidth label="Client Name"
              value={form.clientName}
              onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
              sx={fs}
            />
            <TextField
              fullWidth label="Stylist Name *"
              value={form.stylistName}
              onChange={e => setForm(p => ({ ...p, stylistName: e.target.value }))}
              sx={fs}
            />
            <TextField
              fullWidth label="Service"
              placeholder="e.g. Full head colour, Balayage, Cut & finish…"
              value={form.service}
              onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
              sx={fs}
            />

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <TextField
                label="Colour Formula" size="small"
                placeholder="e.g. 6.3 + 7.4 (1:1)"
                value={form.formula}
                onChange={e => setForm(p => ({ ...p, formula: e.target.value }))}
                sx={{ ...fs, flex: "2 1 220px" }}
              />
              <TextField
                label="Developer Vol" size="small"
                placeholder="e.g. 20 vol"
                value={form.developerVol}
                onChange={e => setForm(p => ({ ...p, developerVol: e.target.value }))}
                sx={{ ...fs, flex: "1 1 120px" }}
              />
            </Box>

            <TextField
              fullWidth label="Patch Test Date" type="date"
              InputLabelProps={{ shrink: true }}
              value={form.patchTestDate}
              onChange={e => setForm(p => ({ ...p, patchTestDate: e.target.value }))}
              sx={{ ...fs, maxWidth: 240 }}
            />

            <TextField
              fullWidth label="Notes" multiline rows={3}
              placeholder="e.g. Sensitive scalp, allergic to PPD, prefers low ammonia…"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              sx={fs}
            />

            {error && <Typography sx={{ color: "#ff6b6b", fontSize: "0.78rem" }}>{error}</Typography>}

            <Button
              onClick={saveVisit}
              disabled={saving || !form.stylistName.trim()}
              sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, py: 1.6, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.5 } }}
            >
              {saving ? <CircularProgress size={18} sx={{ color: "#0d0d0d" }} /> : "Save Visit Record"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
