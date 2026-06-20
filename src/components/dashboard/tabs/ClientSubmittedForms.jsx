import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Chip, Stack } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";

const SOURCES = [
  { key: "checkInSubmissions",   label: "Weekly Check-In", color: "#4CAF50" },
  { key: "parQSubmissions",      label: "PAR-Q Health",    color: "#2196F3" },
  { key: "foodDiarySubmissions", label: "Food Diary",      color: "#FF9800" },
];

function toDate(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  return new Date(v);
}

/**
 * Shows the forms a specific client has submitted through their portal link.
 * Submissions are tagged with clientId (see CheckIn/FoodDiary/ParQ submit pages).
 */
export default function ClientSubmittedForms({ trainerId, clientId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!trainerId || !clientId) { setLoading(false); return; }
      setLoading(true);
      try {
        const all = [];
        for (const src of SOURCES) {
          const snap = await getDocs(query(
            collection(db, "barbers", trainerId, src.key),
            where("clientId", "==", clientId),
          ));
          snap.docs.forEach((d) => {
            const data = d.data();
            all.push({
              id: d.id,
              type: src.label,
              color: src.color,
              date: toDate(data.submittedAt || data.date || data.createdAt),
            });
          });
        }
        all.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
        if (active) setItems(all);
      } catch (e) {
        console.error("Error loading submitted forms:", e);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [trainerId, clientId]);

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>;
  }

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 5 }}>
        <AssignmentIcon sx={{ fontSize: 40, color: "rgba(0,0,0,0.15)", mb: 1 }} />
        <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
          No forms submitted yet. When this client completes a form from their portal link, it appears here.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.25}>
      {items.map((it) => (
        <Box key={it.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip label={it.type} size="small" sx={{ bgcolor: `${it.color}22`, color: it.color, fontWeight: 700, fontSize: "0.72rem" }} />
            <Typography sx={{ fontSize: "0.85rem", color: "#1a1a1a" }}>Submitted</Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.5)" }}>
            {it.date ? it.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
