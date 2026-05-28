import React, { useState, useEffect } from "react";
import {
  Box, Typography, Button, IconButton, Card, CardContent,
  CircularProgress, Tooltip, Chip, Stack, Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon       from "@mui/icons-material/Delete";
import AddIcon          from "@mui/icons-material/Add";
import LinkIcon         from "@mui/icons-material/Link";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import {
  collection, getDocs, doc, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

function genToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function FoodGeneratorTab({ barber, brandColor }) {
  const [links,    setLinks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast,    setToast]    = useState(null);

  const barberId = barber?.uid;
  const origin   = window.location.origin;

  useEffect(() => {
    if (!barberId) return;
    fetchLinks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId]);

  async function fetchLinks() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "barbers", barberId, "foodGeneratorLinks"));
      const all  = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.active !== false)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setLinks(all);
    } finally {
      setLoading(false);
    }
  }

  async function createLink() {
    if (!barberId) return;
    setCreating(true);
    try {
      const token = genToken();
      const ref   = doc(db, "barbers", barberId, "foodGeneratorLinks", token);
      await setDoc(ref, {
        active:    true,
        createdAt: serverTimestamp(),
      });
      setToast("Link created!");
      await fetchLinks();
    } catch {
      setToast("Failed to create link.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteLink(token) {
    if (!barberId) return;
    try {
      await updateDoc(doc(db, "barbers", barberId, "foodGeneratorLinks", token), { active: false });
      setLinks(prev => prev.filter(l => l.id !== token));
      setToast("Link deactivated.");
    } catch {
      setToast("Could not deactivate link.");
    }
  }

  function copyLink(token) {
    const url = `${origin}/food-generator/${barberId}/${token}`;
    navigator.clipboard.writeText(url).then(() => setToast("Link copied!"));
  }

  function linkUrl(token) {
    return `${origin}/food-generator/${barberId}/${token}`;
  }

  return (
    <Box>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 4 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <RestaurantMenuIcon sx={{ color: brandColor }} />
            <Typography variant="h6" fontWeight={900} sx={{ color: "#fff" }}>Food Generator Links</Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "#777", maxWidth: 500, lineHeight: 1.6 }}>
            Create shareable nutrition guide links for your clients. Each link gives access to personalised food plans, calorie & macro calculators, BMI guides, and in-depth nutrition advice. Deactivate a link at any time to instantly revoke client access.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          disabled={creating}
          onClick={createLink}
          sx={{ bgcolor: brandColor, color: "#000", fontWeight: 800, borderRadius: 2, px: 3, "&:hover": { bgcolor: brandColor, filter: "brightness(0.9)" } }}
        >
          Create New Link
        </Button>
      </Box>

      {/* Toast */}
      {toast && (
        <Alert severity="info" onClose={() => setToast(null)} sx={{ mb: 3, borderRadius: 2, bgcolor: "#1a1a1a", color: "#fff", "& .MuiAlert-icon": { color: brandColor } }}>
          {toast}
        </Alert>
      )}

      {/* What clients see callout */}
      <Card sx={{ bgcolor: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 2, mb: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ color: brandColor, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", display: "block", mb: 1 }}>
            What your client gets
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {[
              "🎯 Goal selection (Weight Loss / Bulking / Trim & Tone)",
              "📊 Personal calorie & macro calculator",
              "⚖️ BMI calculator & body type guide",
              "💧 Daily hydration target",
              "🍽️ 25 foods per meal type per goal",
              "⚡ Pre & post workout nutrition guide",
              "🌅 Breakfast importance guide",
              "🌙 Late night eating advice",
              "☕ Complete drinks guide (pros & cons)",
              "🥤 Shakes for busy schedules",
            ].map(item => (
              <Chip key={item} label={item} size="small" sx={{ bgcolor: "#1a1a1a", color: "#888", fontSize: "0.7rem", height: 24, borderRadius: 1 }} />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Links list */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: brandColor }} />
        </Box>
      ) : links.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <LinkIcon sx={{ fontSize: 48, color: "#333", mb: 2 }} />
          <Typography variant="body1" sx={{ color: "#555" }}>No active links yet.</Typography>
          <Typography variant="body2" sx={{ color: "#444", mt: 0.5 }}>Create a link above and share it with your clients.</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {links.map(link => {
            const url       = linkUrl(link.id);
            const createdAt = link.createdAt?.toDate?.()?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";
            return (
              <Card key={link.id} sx={{ bgcolor: "#111", border: "1px solid #222", borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Chip label="Active" size="small" sx={{ bgcolor: "#0a3320", color: "#4caf80", fontWeight: 700, fontSize: "0.65rem", height: 18 }} />
                        <Typography variant="caption" sx={{ color: "#555" }}>Created {createdAt}</Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#555",
                          fontFamily: "monospace",
                          fontSize: "0.72rem",
                          wordBreak: "break-all",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {url}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                      <Tooltip title="Copy link">
                        <IconButton
                          size="small"
                          onClick={() => copyLink(link.id)}
                          sx={{ bgcolor: "#1a1a1a", color: brandColor, borderRadius: 1.5, "&:hover": { bgcolor: "#2a2a2a" } }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate link (client loses access immediately)">
                        <IconButton
                          size="small"
                          onClick={() => deleteLink(link.id)}
                          sx={{ bgcolor: "#1a1a1a", color: "#e05c5c", borderRadius: 1.5, "&:hover": { bgcolor: "#2a1a1a" } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyLink(link.id)}
                      sx={{ borderColor: "#2a2a2a", color: "#888", borderRadius: 1.5, textTransform: "none", fontSize: "0.75rem", mr: 1 }}
                    >
                      Copy link
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      component="a"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ borderColor: `${brandColor}44`, color: brandColor, borderRadius: 1.5, textTransform: "none", fontSize: "0.75rem" }}
                    >
                      Preview ↗
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

    </Box>
  );
}
