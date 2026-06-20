import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Stack, IconButton,
  CircularProgress, Chip, Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ChevronRight as ChevronRightIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

function fieldSx(brand) {
  return {
    "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: brand },
    "& .MuiOutlinedInput-root": {
      color: "#fff", borderRadius: 0,
      "& fieldset":             { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset":       { borderColor: "rgba(255,255,255,0.28)" },
      "&.Mui-focused fieldset": { borderColor: brand },
    },
  };
}

const blankColour = () => ({ id: `c-${Date.now()}-${Math.random()}`, name: "", hex: "#C9A84C" });

export default function ColourApprovalTab({ barber, brandColor }) {
  const [palettes,   setPalettes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState("list");   // "list" | "create" | "approvals"
  const [selected,   setSelected]   = useState(null);
  const [approvals,  setApprovals]  = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [toast,      setToast]      = useState("");

  const [palName, setPalName] = useState("");
  const [colours, setColours] = useState([blankColour()]);
  const [saving,  setSaving]  = useState(false);

  const fx  = fieldSx(brandColor);
  const tid = barber?.uid;

  useEffect(() => { loadPalettes(); }, [tid]);

  async function loadPalettes() {
    if (!tid) return;
    try {
      const snap = await getDocs(collection(db, "barbers", tid, "colourPalettes"));
      setPalettes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function openApprovals(pal) {
    setSelected(pal);
    setView("approvals");
    setAppLoading(true);
    try {
      const snap = await getDocs(
        collection(db, "barbers", tid, "colourPalettes", pal.id, "approvals")
      );
      setApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setAppLoading(false); }
  }

  async function deletePalette(id) {
    if (!window.confirm("Delete this palette? All client responses will also be deleted.")) return;
    try {
      await deleteDoc(doc(db, "barbers", tid, "colourPalettes", id));
      setPalettes(p => p.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  }

  async function deleteApproval(id) {
    try {
      await deleteDoc(doc(db, "barbers", tid, "colourPalettes", selected.id, "approvals", id));
      setApprovals(p => p.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  }

  function updateColour(id, field, val) {
    setColours(p => p.map(c => c.id === id ? { ...c, [field]: val } : c));
  }

  async function savePalette() {
    if (!palName.trim() || colours.length === 0) return;
    setSaving(true);
    try {
      const data = {
        name: palName.trim(),
        colours: colours.map(({ id, ...rest }) => rest),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "barbers", tid, "colourPalettes"), data);
      setPalettes(p => [...p, { id: ref.id, ...data }]);
      setPalName(""); setColours([blankColour()]); setView("list");
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  function copyLink(pal) {
    const url = `${window.location.origin}/colour-approval/${tid}/${pal.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setToast("Client link copied to clipboard!");
    setTimeout(() => setToast(""), 2800);
  }

  const Flash = () => toast ? (
    <Box sx={{ mb: 2.5, px: 2, py: 1.25, bgcolor: `${brandColor}15`, border: `1px solid ${brandColor}35`, fontFamily: SANS, fontSize: "0.78rem", color: brandColor }}>
      {toast}
    </Box>
  ) : null;

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (view === "list") return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#fff", fontWeight: 400, lineHeight: 1.2 }}>
            Colour Approval
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", mt: 0.4 }}>
            Build colour schemes and send approval links to homeowners
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setView("create")}
          sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.74rem", letterSpacing: "0.06em", borderRadius: 0, px: 2.5, py: 1, flexShrink: 0, ml: 2,
            "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
          }}
        >
          New Palette
        </Button>
      </Box>

      <Flash />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}>
          <CircularProgress sx={{ color: brandColor }} size={34} thickness={2} />
        </Box>
      ) : palettes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 9, color: "rgba(255,255,255,0.18)" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.25rem" }}>No palettes yet</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", mt: 0.75 }}>
            Create a colour palette and send the approval link to your client
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {palettes.map(pal => (
            <Box key={pal.id} sx={{ bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
              {/* Swatches */}
              <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                {(pal.colours || []).slice(0, 7).map((c, i) => (
                  <Tooltip key={i} title={`${c.name ? c.name + " · " : ""}${c.hex?.toUpperCase()}`}>
                    <Box sx={{ width: 26, height: 26, bgcolor: c.hex, border: "1px solid rgba(255,255,255,0.1)" }} />
                  </Tooltip>
                ))}
              </Box>

              {/* Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{pal.name}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(255,255,255,0.32)" }}>
                  {(pal.colours || []).length} colour{(pal.colours || []).length !== 1 ? "s" : ""}
                </Typography>
              </Box>

              {/* Actions */}
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Tooltip title="View client responses">
                  <IconButton size="small" onClick={() => openApprovals(pal)}
                    sx={{ color: "rgba(255,255,255,0.38)", "&:hover": { color: brandColor } }}>
                    <ChevronRightIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy client approval link">
                  <IconButton size="small" onClick={() => copyLink(pal)}
                    sx={{ color: "rgba(255,255,255,0.38)", "&:hover": { color: brandColor } }}>
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete palette">
                  <IconButton size="small" onClick={() => deletePalette(pal.id)}
                    sx={{ color: "rgba(255,255,255,0.22)", "&:hover": { color: "#ff6b6b" } }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  // ── CREATE ────────────────────────────────────────────────────────────────
  if (view === "create") return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton size="small" onClick={() => setView("list")}
          sx={{ color: "rgba(255,255,255,0.38)", "&:hover": { color: "#fff" } }}>
          <ArrowBackIcon sx={{ fontSize: 19 }} />
        </IconButton>
        <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#fff", fontWeight: 400 }}>
          New Colour Palette
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 620 }}>
        <TextField
          fullWidth label="Palette name (e.g. Living Room Scheme)"
          value={palName} onChange={e => setPalName(e.target.value)}
          sx={{ ...fx, mb: 3 }}
        />

        <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", mb: 1.5 }}>
          Colours
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          {colours.map(c => (
            <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 2, bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", p: 2 }}>
              {/* Colour picker swatch */}
              <Box component="label" sx={{ cursor: "pointer", flexShrink: 0, position: "relative" }}>
                <Box sx={{
                  width: 46, height: 46, bgcolor: c.hex, flexShrink: 0,
                  border: `2px solid ${c.hex}66`,
                  boxShadow: `0 0 14px ${c.hex}35`,
                  transition: "box-shadow .15s",
                  "&:hover": { boxShadow: `0 0 20px ${c.hex}55` },
                }} />
                <input type="color" value={c.hex} onChange={e => updateColour(c.id, "hex", e.target.value)}
                  style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} />
              </Box>

              <TextField size="small" label="Colour name" value={c.name}
                onChange={e => updateColour(c.id, "name", e.target.value)}
                sx={{ ...fx, flex: 1 }} />

              <Typography sx={{ fontFamily: "'Courier New', monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.38)", width: 72, flexShrink: 0, letterSpacing: "0.04em" }}>
                {(c.hex || "").toUpperCase()}
              </Typography>

              <IconButton size="small" onClick={() => setColours(p => p.filter(x => x.id !== c.id))}
                sx={{ color: "rgba(255,255,255,0.2)", flexShrink: 0, "&:hover": { color: "#ff6b6b" } }}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>

        <Button startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setColours(p => [...p, blankColour()])}
          sx={{ color: brandColor, fontWeight: 700, fontSize: "0.74rem", mb: 4, "&:hover": { bgcolor: `${brandColor}10` } }}>
          Add Colour
        </Button>

        <Stack direction="row" spacing={1.5}>
          <Button onClick={() => setView("list")}
            sx={{ color: "rgba(255,255,255,0.38)", fontWeight: 600, fontSize: "0.76rem" }}>
            Cancel
          </Button>
          <Button onClick={savePalette} disabled={saving || !palName.trim() || colours.length === 0}
            sx={{ bgcolor: brandColor, color: "#0d0d0d", fontWeight: 700, fontSize: "0.76rem", borderRadius: 0, px: 3, py: 1,
              "&:hover": { bgcolor: brandColor, filter: "brightness(1.1)" },
              "&:disabled": { bgcolor: brandColor, opacity: 0.5 },
            }}>
            {saving ? <CircularProgress size={15} sx={{ color: "#0d0d0d" }} /> : "Save & Get Link"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );

  // ── APPROVALS ─────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton size="small" onClick={() => setView("list")}
          sx={{ color: "rgba(255,255,255,0.38)", "&:hover": { color: "#fff" } }}>
          <ArrowBackIcon sx={{ fontSize: 19 }} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "#fff", fontWeight: 400 }}>{selected?.name}</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>Client responses</Typography>
        </Box>
        <Button startIcon={<ContentCopyIcon sx={{ fontSize: 15 }} />} onClick={() => copyLink(selected)}
          sx={{ color: brandColor, fontWeight: 700, fontSize: "0.72rem", flexShrink: 0, "&:hover": { bgcolor: `${brandColor}10` } }}>
          Copy Link
        </Button>
      </Box>

      {/* Palette preview */}
      <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
        {(selected?.colours || []).map((c, i) => (
          <Tooltip key={i} title={`${c.name || ""} ${c.hex?.toUpperCase()}`}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 50, height: 50, bgcolor: c.hex, border: "1px solid rgba(255,255,255,0.1)" }} />
              <Typography sx={{ fontFamily: SANS, fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", maxWidth: 50, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name || c.hex?.toUpperCase()}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Box>

      <Flash />

      {appLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brandColor }} size={32} thickness={2} />
        </Box>
      ) : approvals.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 7, color: "rgba(255,255,255,0.18)" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.1rem" }}>No responses yet</Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", mt: 0.75 }}>
            Share the link with your client to collect their approval
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {approvals.map(a => (
            <Box key={a.id} sx={{ bgcolor: "#111", border: "1px solid rgba(255,255,255,0.07)", p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 17, color: "#4ade80" }} />
                  <Typography sx={{ fontFamily: SANS, fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{a.clientName}</Typography>
                  <Chip label="Approved" size="small" sx={{ bgcolor: "#4ade8015", color: "#4ade80", fontSize: "0.62rem", height: 19, borderRadius: 0 }} />
                </Box>
                <IconButton size="small" onClick={() => deleteApproval(a.id)}
                  sx={{ color: "rgba(255,255,255,0.2)", "&:hover": { color: "#ff6b6b" } }}>
                  <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>
              {a.feedback && (
                <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", fontStyle: "italic", mt: 1, pl: 3.5, lineHeight: 1.55 }}>
                  "{a.feedback}"
                </Typography>
              )}
              <Typography sx={{ fontFamily: SANS, fontSize: "0.64rem", color: "rgba(255,255,255,0.2)", mt: 1, pl: 3.5 }}>
                {a.submittedAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) ?? ""}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
