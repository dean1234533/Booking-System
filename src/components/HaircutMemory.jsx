import React, { useState, useRef } from "react";
import {
  Box, Typography, Fab, Drawer, IconButton, TextField, Button,
  CircularProgress, Stack, Chip, Divider,
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import CloseIcon from "@mui/icons-material/Close";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";

const SANS  = "'DM Sans', sans-serif";
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
    "& .MuiInputLabel-root":           { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
  };
}

const EMPTY_FORM = { barberName: "", notes: "", guards: { top: "", sides: "", back: "", fade: "" } };

export default function HaircutMemory({ shopId, brandColor = "#C9A84C" }) {
  const [open, setOpen]         = useState(false);
  const [phone, setPhone]       = useState("");
  const [cuts, setCuts]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [view, setView]         = useState("search");
  const [photoFile, setPhoto]   = useState(null);
  const [photoPreview, setPrev] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [form, setForm]         = useState(EMPTY_FORM);
  const fileRef = useRef(null);

  const key    = sanitizePhone(phone);
  const cutsCol = () => collection(db, "barbers", shopId, "haircutMemories", key, "cuts");

  async function search() {
    if (key.length < 7) { setError("Enter a valid phone number."); return; }
    setError(""); setLoading(true);
    try {
      const snap = await getDocs(cutsCol());
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setCuts(data);
      setView("history");
    } catch (e) { console.error(e); setError("Failed to load records."); }
    finally { setLoading(false); }
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
        barberName: form.barberName.trim(),
        notes:      form.notes.trim(),
        guards:     form.guards,
        photoUrl,
        phone:      key,
        createdAt:  serverTimestamp(),
      };
      const added = await addDoc(cutsCol(), data);
      setCuts(prev => [{ id: added.id, ...data, createdAt: { toMillis: () => Date.now() } }, ...prev]);
      setForm(EMPTY_FORM); setPhoto(null); setPrev("");
      setView("history");
    } catch (e) { console.error(e); setError("Failed to save."); }
    finally { setSaving(false); }
  }

  async function removeCut(id) {
    try {
      await deleteDoc(doc(db, "barbers", shopId, "haircutMemories", key, "cuts", id));
      setCuts(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  }

  function closeDrawer() {
    setOpen(false);
    setPhone(""); setCuts([]); setView("search");
    setForm(EMPTY_FORM); setPhoto(null); setPrev(""); setError("");
  }

  const setG = (k, v) => setForm(p => ({ ...p, guards: { ...p.guards, [k]: v } }));

  return (
    <>
      <Fab
        variant="extended"
        onClick={() => setOpen(true)}
        size="medium"
        sx={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1200,
          bgcolor: brandColor, color: "#0d0d0d",
          boxShadow: `0 4px 20px ${brandColor}55`,
          fontFamily: SANS, fontWeight: 700, fontSize: "0.75rem",
          letterSpacing: "0.06em", textTransform: "uppercase",
          gap: 1, px: 2.5,
          "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
        }}
      >
        <ContentCutIcon sx={{ fontSize: 20 }} />
        Haircut Memory
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 420 },
            bgcolor: "#0f0f0f",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            display: "flex", flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2.5, borderBottom: `2px solid ${brandColor}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {view !== "search" && (
              <IconButton size="small" onClick={() => setView(view === "add" ? "history" : "search")}
                sx={{ color: "rgba(255,255,255,0.5)", p: 0.5 }}>
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            <Box>
              <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem", color: "#fff", lineHeight: 1.2 }}>
                Haircut Memory
              </Typography>
              {view === "history" && (
                <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", mt: 0.2 }}>
                  {cuts.length} record{cuts.length !== 1 ? "s" : ""} · {key}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={closeDrawer} sx={{ color: "rgba(255,255,255,0.4)" }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 3 }}>

          {/* ── SEARCH ── */}
          {view === "search" && (
            <Box>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", mb: 1.5 }}>
                Look up customer
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.75, mb: 2.5 }}>
                Pull up a customer's full cut history by their phone number — guard sizes, barber notes, and reference photos from every previous visit.
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth label="Customer Phone Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && search()}
                  inputProps={{ inputMode: "tel" }}
                  sx={darkField(brandColor)}
                />
                {error && <Typography sx={{ color: "#ff6b6b", fontSize: "0.78rem" }}>{error}</Typography>}
                <Button
                  fullWidth onClick={search}
                  disabled={loading || key.length < 7}
                  startIcon={loading
                    ? <CircularProgress size={14} sx={{ color: "#0d0d0d" }} />
                    : <SearchIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700,
                    fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase",
                    borderRadius: 0, py: 1.4,
                    "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
                    "&:disabled": { bgcolor: brandColor, opacity: 0.5 },
                  }}
                >
                  {loading ? "Searching…" : "Search Records"}
                </Button>
              </Stack>
            </Box>
          )}

          {/* ── HISTORY ── */}
          {view === "history" && (
            <Box>
              <Button
                fullWidth onClick={() => setView("add")}
                sx={{
                  bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.8rem",
                  letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, py: 1.4, mb: 3,
                  "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
                }}
              >
                + Log New Haircut
              </Button>

              {cuts.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <ContentCutIcon sx={{ fontSize: 36, color: "rgba(255,255,255,0.1)", mb: 1.5 }} />
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1rem", color: "rgba(255,255,255,0.3)" }}>
                    No cuts on record yet
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "rgba(255,255,255,0.18)", mt: 0.5 }}>
                    Log their first haircut above
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {cuts.map(cut => (
                    <Box key={cut.id} sx={{ bgcolor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
                      {cut.photoUrl && (
                        <Box
                          component="img" src={cut.photoUrl} alt="haircut"
                          sx={{ width: "100%", height: 190, objectFit: "cover", objectPosition: "top center", display: "block" }}
                        />
                      )}
                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Box>
                            <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.88rem", color: "#fff" }}>
                              {cut.barberName}
                            </Typography>
                            <Typography sx={{ fontFamily: SANS, fontSize: "0.63rem", color: "rgba(255,255,255,0.3)", mt: 0.2 }}>
                              {fmtDate(cut.createdAt)}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => removeCut(cut.id)}
                            sx={{ color: "rgba(255,255,255,0.2)", "&:hover": { color: "#ff6b6b" } }}>
                            <DeleteIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Box>

                        {cut.guards && Object.values(cut.guards).some(v => v) && (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, mb: cut.notes ? 1.5 : 0 }}>
                            {GUARDS.map(pos => cut.guards[pos.key] ? (
                              <Chip
                                key={pos.key}
                                label={`${pos.label}: ${cut.guards[pos.key]}`}
                                size="small"
                                sx={{ bgcolor: `${brandColor}18`, color: brandColor, fontSize: "0.62rem", height: 20, borderRadius: 0 }}
                              />
                            ) : null)}
                          </Box>
                        )}

                        {cut.notes && (
                          <Typography sx={{ fontFamily: SANS, fontSize: "0.72rem", color: "rgba(255,255,255,0.36)", fontStyle: "italic", lineHeight: 1.65 }}>
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

          {/* ── ADD ── */}
          {view === "add" && (
            <Box>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", mb: 2.5 }}>
                New Cut Details
              </Typography>

              {/* Photo */}
              <Box
                onClick={() => fileRef.current?.click()}
                sx={{
                  width: "100%", height: 168, bgcolor: "#1a1a1a",
                  border: photoPreview ? "none" : "2px dashed rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", mb: 2.5, overflow: "hidden",
                  "&:hover": { borderColor: `${brandColor}55` },
                }}
              >
                {photoPreview ? (
                  <Box component="img" src={photoPreview} sx={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                ) : (
                  <Box sx={{ textAlign: "center" }}>
                    <AddPhotoAlternateIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.2)", mb: 0.5 }} />
                    <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(255,255,255,0.22)" }}>
                      Tap to add photo
                    </Typography>
                  </Box>
                )}
              </Box>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                setPhoto(f); setPrev(URL.createObjectURL(f));
              }} />

              <Stack spacing={2}>
                <TextField
                  fullWidth label="Barber Name *"
                  value={form.barberName}
                  onChange={e => setForm(p => ({ ...p, barberName: e.target.value }))}
                  sx={darkField(brandColor)}
                />

                <Box>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", mb: 1.5 }}>
                    Guard Numbers
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    {GUARDS.map(pos => (
                      <TextField
                        key={pos.key}
                        label={pos.label}
                        size="small"
                        value={form.guards[pos.key]}
                        onChange={e => setG(pos.key, e.target.value)}
                        inputProps={{ inputMode: "decimal", style: { width: 48 } }}
                        sx={{ ...darkField(brandColor), flex: "1 1 80px" }}
                      />
                    ))}
                  </Box>
                </Box>

                <TextField
                  fullWidth label="Notes" multiline rows={3}
                  placeholder="e.g. Skin fade, sharp temple line, textured top…"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  sx={darkField(brandColor)}
                />

                {error && <Typography sx={{ color: "#ff6b6b", fontSize: "0.78rem" }}>{error}</Typography>}

                <Button
                  fullWidth onClick={saveCut}
                  disabled={saving || !form.barberName.trim()}
                  sx={{
                    bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.8rem",
                    letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 0, py: 1.4,
                    "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
                    "&:disabled": { bgcolor: brandColor, opacity: 0.5 },
                  }}
                >
                  {saving ? <CircularProgress size={16} sx={{ color: "#0d0d0d" }} /> : "Save Haircut"}
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
}
