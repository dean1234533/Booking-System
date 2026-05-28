import React, { useState, useRef } from "react";
import {
  Box, Typography, Button, IconButton, TextField, Stack,
  CircularProgress, Chip,
} from "@mui/material";
import ContentCutIcon        from "@mui/icons-material/ContentCut";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ArrowBackIcon         from "@mui/icons-material/ArrowBack";
import DeleteIcon            from "@mui/icons-material/Delete";
import SearchIcon            from "@mui/icons-material/Search";
import AddIcon               from "@mui/icons-material/Add";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase/config";

const SERIF = "'Playfair Display', serif";

const GUARDS = [
  { key: "top",   label: "Top" },
  { key: "sides", label: "Sides" },
  { key: "back",  label: "Back" },
  { key: "fade",  label: "Fade" },
];

function sanitizePhone(raw) { return raw.replace(/\D/g, "").slice(0, 15); }

function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function darkField(brand) {
  return {
    "& .MuiInputLabel-root":             { color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.1)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.22)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
  };
}

const EMPTY_FORM = { clientName: "", barberName: "", notes: "", guards: { top: "", sides: "", back: "", fade: "" } };

export default function HaircutTab({ barber, brandColor }) {
  const [view,        setView]    = useState("search"); // "search" | "history" | "add"
  const [phone,       setPhone]   = useState("");
  const [cuts,        setCuts]    = useState([]);
  const [loading,     setLoading] = useState(false);
  const [saving,      setSaving]  = useState(false);
  const [error,       setError]   = useState("");
  const [form,        setForm]    = useState(EMPTY_FORM);
  const [photoFile,   setPhoto]   = useState(null);
  const [photoPreview, setPrev]   = useState("");
  const fileRef = useRef(null);

  const shopId = barber?.uid || barber?.id;
  const key    = sanitizePhone(phone);
  const cutsCol = () => collection(db, "barbers", shopId, "haircutMemories", key, "cuts");
  const fs = darkField(brandColor);

  async function search() {
    if (key.length < 7) { setError("Enter at least 7 digits."); return; }
    setError(""); setLoading(true);
    try {
      const snap = await getDocs(cutsCol());
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCuts(data);
      setView("history");
    } catch (e) { console.error(e); setError("Failed to load records."); }
    finally     { setLoading(false); }
  }

  async function saveCut() {
    if (!form.barberName.trim()) { setError("Enter the barber name."); return; }
    setError(""); setSaving(true);
    try {
      let photoUrl = "";
      if (photoFile) {
        const sRef = ref(storage, `haircutMemory/${shopId}/${key}/${Date.now()}`);
        await uploadBytes(sRef, photoFile);
        photoUrl = await getDownloadURL(sRef);
      }
      const data = {
        clientName: form.clientName.trim(),
        barberName: form.barberName.trim(),
        notes:      form.notes.trim(),
        guards:     form.guards,
        photoUrl,
        phone: key,
        createdAt: serverTimestamp(),
      };
      const added = await addDoc(cutsCol(), data);
      setCuts(prev => [{ id: added.id, ...data, createdAt: { toMillis: () => Date.now() } }, ...prev]);
      setForm(EMPTY_FORM); setPhoto(null); setPrev("");
      setView("history");
    } catch (e) { console.error(e); setError("Failed to save."); }
    finally     { setSaving(false); }
  }

  async function removeCut(id) {
    if (!window.confirm("Delete this haircut record?")) return;
    try {
      await deleteDoc(doc(db, "barbers", shopId, "haircutMemories", key, "cuts", id));
      setCuts(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  }

  function reset() {
    setView("search"); setPhone(""); setCuts([]);
    setForm(EMPTY_FORM); setPhoto(null); setPrev(""); setError("");
  }

  const setG = (k, v) => setForm(p => ({ ...p, guards: { ...p.guards, [k]: v } }));

  // ── HEADER ───────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {view !== "search" && (
            <IconButton
              onClick={() => view === "add" ? setView("history") : reset()}
              sx={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 0, color: "rgba(255,255,255,0.45)", "&:hover": { color: "#fff" } }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Box>
            <Typography sx={{ color: "#fff", fontFamily: SERIF, fontSize: "1.5rem", fontWeight: 400 }}>
              {view === "search"  && "Haircut Records"}
              {view === "history" && `${key} · ${cuts.length} cut${cuts.length !== 1 ? "s" : ""}`}
              {view === "add"     && "Log New Haircut"}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", mt: 0.4 }}>
              {view === "search"  && "Look up any client by their phone number to view or add their full cut history."}
              {view === "history" && "Full cut history — guard sizes, barber notes, and reference photos."}
              {view === "add"     && `Recording cut for ${key}.`}
            </Typography>
          </Box>
        </Box>
        {view === "history" && (
          <Button
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => { setForm(EMPTY_FORM); setPhoto(null); setPrev(""); setView("add"); }}
            sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.08em", px: 2.5, py: 1.1, borderRadius: 0, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" } }}
          >
            Log New Cut
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
              FormHelperTextProps={{ sx: { color: "rgba(255,255,255,0.25)", fontSize: "0.75rem" } }}
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
        <Box sx={{ maxWidth: 680 }}>
          {cuts.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 10, border: "1px dashed rgba(255,255,255,0.08)" }}>
              <ContentCutIcon sx={{ fontSize: 44, color: "rgba(255,255,255,0.1)", mb: 2 }} />
              <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.88rem", mb: 1 }}>No cuts on record for this number.</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.18)", fontSize: "0.78rem" }}>Use "Log New Cut" to record their first visit.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {cuts.map(cut => (
                <Box key={cut.id} sx={{ bgcolor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  {cut.photoUrl && (
                    <Box component="img" src={cut.photoUrl} alt="haircut"
                      sx={{ width: "100%", height: 200, objectFit: "cover", objectPosition: "top center", display: "block" }} />
                  )}
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>
                          {cut.clientName || "Client"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", mt: 0.2 }}>
                          Cut by {cut.barberName} · {fmtDate(cut.createdAt)}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => removeCut(cut.id)}
                        sx={{ color: "rgba(255,255,255,0.2)", "&:hover": { color: "#ff6b6b" } }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    {cut.guards && Object.values(cut.guards).some(v => v) && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, mb: cut.notes ? 1.5 : 0 }}>
                        {GUARDS.map(pos => cut.guards[pos.key] ? (
                          <Chip key={pos.key}
                            label={`${pos.label}: ${cut.guards[pos.key]}`}
                            size="small"
                            sx={{ bgcolor: `${brandColor}18`, color: brandColor, fontSize: "0.62rem", height: 20, borderRadius: 0 }}
                          />
                        ) : null)}
                      </Box>
                    )}
                    {cut.notes && (
                      <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", fontStyle: "italic", lineHeight: 1.65 }}>
                        "{cut.notes}"
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ── ADD NEW CUT ── */}
      {view === "add" && (
        <Box sx={{ maxWidth: 580 }}>
          {/* Photo upload */}
          <Box
            onClick={() => fileRef.current?.click()}
            sx={{
              width: "100%", height: 200, bgcolor: "#1a1a1a", mb: 3,
              border: photoPreview ? "none" : "2px dashed rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", overflow: "hidden",
              "&:hover": { borderColor: `${brandColor}55` },
            }}
          >
            {photoPreview ? (
              <Box component="img" src={photoPreview} sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            ) : (
              <Box sx={{ textAlign: "center" }}>
                <AddPhotoAlternateIcon sx={{ fontSize: 36, color: "rgba(255,255,255,0.18)", mb: 0.75 }} />
                <Typography sx={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.28)" }}>Click to add reference photo</Typography>
              </Box>
            )}
          </Box>
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
              fullWidth label="Barber Name *"
              value={form.barberName}
              onChange={e => setForm(p => ({ ...p, barberName: e.target.value }))}
              sx={fs}
            />

            <Box>
              <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", mb: 1.5 }}>
                Guard Numbers
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {GUARDS.map(pos => (
                  <TextField
                    key={pos.key}
                    label={pos.label} size="small"
                    value={form.guards[pos.key]}
                    onChange={e => setG(pos.key, e.target.value)}
                    inputProps={{ inputMode: "decimal", style: { width: 52 } }}
                    sx={{ ...fs, flex: "1 1 80px" }}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              fullWidth label="Notes" multiline rows={3}
              placeholder="e.g. Skin fade, sharp temple line, textured top…"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              sx={fs}
            />

            {error && <Typography sx={{ color: "#ff6b6b", fontSize: "0.78rem" }}>{error}</Typography>}

            <Button
              onClick={saveCut}
              disabled={saving || !form.barberName.trim()}
              sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, py: 1.6, boxShadow: "none", "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" }, "&:disabled": { bgcolor: brandColor, opacity: 0.5 } }}
            >
              {saving ? <CircularProgress size={18} sx={{ color: "#0d0d0d" }} /> : "Save Haircut Record"}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
