import React, { useEffect, useState } from "react";
import { IconButton, Badge, Popover, Box, Typography, Button } from "@mui/material";
import { Notifications as BellIcon } from "@mui/icons-material";
import {
  collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";

const SANS = "'DM Sans', sans-serif";

function timeAgo(ts) {
  const d = ts?.toDate?.();
  if (!d) return "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotificationBell({ uid, brandColor = "#C9A84C" }) {
  const [items, setItems] = useState([]);
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    const q = query(
      collection(db, "barbers", uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
  }, [uid]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const batch = writeBatch(db);
    items.filter((n) => !n.read).forEach((n) => batch.update(doc(db, "barbers", uid, "notifications", n.id), { read: true }));
    await batch.commit().catch(() => {});
  };

  const markOne = (n) => {
    if (!n.read) updateDoc(doc(db, "barbers", uid, "notifications", n.id), { read: true }).catch(() => {});
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        size="small"
        aria-label="Notifications"
        sx={{
          color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 0, p: 0.9,
          "&:hover": { color: brandColor, borderColor: `${brandColor}55` },
        }}
      >
        <Badge badgeContent={unread} color="error" max={99}>
          <BellIcon sx={{ fontSize: 17 }} />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "92vw", maxHeight: 420, borderRadius: 0 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1, borderBottom: "1px solid #eee" }}>
          <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.85rem" }}>Notifications</Typography>
          {unread > 0 && <Button size="small" onClick={markAllRead} sx={{ fontSize: "0.7rem" }}>Mark all read</Button>}
        </Box>
        {items.length === 0 && (
          <Typography sx={{ p: 3, textAlign: "center", color: "text.secondary", fontSize: "0.85rem" }}>
            Nothing yet — changes to your dashboard will appear here.
          </Typography>
        )}
        {items.map((n) => (
          <Box
            key={n.id}
            onClick={() => markOne(n)}
            sx={{
              px: 2, py: 1.25, cursor: "pointer", borderBottom: "1px solid #f3f3f3",
              bgcolor: n.read ? "transparent" : `${brandColor}14`,
              "&:hover": { bgcolor: "#fafafa" },
            }}
          >
            <Typography sx={{ fontFamily: SANS, fontSize: "0.82rem", fontWeight: n.read ? 500 : 700, textTransform: "capitalize" }}>
              {n.title}
            </Typography>
            {n.body && <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{n.body}</Typography>}
            <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.25 }}>{timeAgo(n.createdAt)}</Typography>
          </Box>
        ))}
      </Popover>
    </>
  );
}
