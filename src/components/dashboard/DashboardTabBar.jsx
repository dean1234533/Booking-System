import React, { useState } from "react";
import { Box, Button, ListItemIcon, Menu, MenuItem, Paper, Typography } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

function NavItem({ item, active, brandColor, onClick }) {
  return (
    <Button
      fullWidth
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      startIcon={React.cloneElement(item.icon, { sx: { fontSize: "18px !important" } })}
      sx={{
        justifyContent: "flex-start", px: 1.5, py: 1.05, borderRadius: 2.25,
        color: active ? "#111116" : "#ffffff8a",
        bgcolor: active ? "#93C5FD" : "transparent",
        fontWeight: active ? 800 : 600, fontSize: ".79rem",
        "& .MuiButton-startIcon": { color: active ? "#111116" : "#ffffff66", mr: 1.25 },
        "&:hover": { bgcolor: active ? "#93C5FD" : "#ffffff10" },
      }}
    >
      {item.label}
    </Button>
  );
}

export default function DashboardTabBar({
  groups, activeTab, onTabChange, brandColor = "#2563EB", isMobile, mobileItems = [],
}) {
  const [anchor, setAnchor] = useState(null);
  const visibleGroups = groups.filter(group => group.items.length > 0);
  const allItems = visibleGroups.flatMap(group => group.items);
  const primaryKeys = new Set(mobileItems.map(item => item.index));
  const moreItems = allItems.filter(item => !primaryKeys.has(item.index));
  const moreActive = moreItems.some(item => item.index === activeTab);

  if (!isMobile) {
    return (
      <Paper
        component="nav"
        aria-label="Dashboard sections"
        sx={{
          width: 238, flexShrink: 0, p: 1.5, borderRadius: "6px 24px 24px 24px",
          bgcolor: "#111116", color: "#fff", border: 0,
          position: "sticky", top: 94, alignSelf: "flex-start",
          maxHeight: "calc(100vh - 118px)", overflowY: "auto",
        }}
      >
        <Typography sx={{ px: 1.25, pt: .5, pb: 1.25, color: "#9ba0a9", fontSize: ".63rem", fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase" }}>
          Workspace
        </Typography>
        {visibleGroups.map((group, groupIndex) => (
          <Box key={group.label} sx={{ mt: groupIndex ? 1.5 : 0 }}>
            <Typography sx={{ px: 1.25, mb: .45, color: "#9ba0a9", fontSize: ".6rem", fontWeight: 850, letterSpacing: ".1em", textTransform: "uppercase" }}>
              {group.label}
            </Typography>
            <Box sx={{ display: "grid", gap: .25 }}>
              {group.items.map(item => (
                <NavItem
                  key={item.index}
                  item={item}
                  active={activeTab === item.index}
                  brandColor={brandColor}
                  onClick={() => onTabChange(item.index)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }

  return (
    <>
      <Paper
        component="nav"
        aria-label="Dashboard sections"
        sx={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1250,
          display: "grid", gridTemplateColumns: `repeat(${mobileItems.length + 1}, minmax(0, 1fr))`,
          borderRadius: 0, borderInline: 0, borderBottom: 0,
          px: .5, pb: "max(6px, env(safe-area-inset-bottom))", pt: .55,
          boxShadow: "0 -8px 24px rgba(16,24,40,.08)",
        }}
      >
        {mobileItems.map(item => {
          const active = activeTab === item.index;
          return (
            <Button
              key={item.index}
              onClick={() => onTabChange(item.index)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              sx={{
                minWidth: 0, px: .25, py: .55, borderRadius: 2,
                display: "flex", flexDirection: "column", gap: .25,
                color: active ? brandColor : "#747a85", fontSize: ".58rem", fontWeight: active ? 850 : 650,
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
              <span>{item.label}</span>
            </Button>
          );
        })}
        <Button
          onClick={event => setAnchor(event.currentTarget)}
          aria-label="More dashboard sections"
          aria-expanded={Boolean(anchor)}
          sx={{
            minWidth: 0, px: .25, py: .55, borderRadius: 2,
            display: "flex", flexDirection: "column", gap: .25,
            color: moreActive ? brandColor : "#747a85", fontSize: ".58rem", fontWeight: moreActive ? 850 : 650,
            "&:hover": { bgcolor: "transparent" },
          }}
        >
          <MoreHorizIcon sx={{ fontSize: 20 }} />
          <span>More</span>
        </Button>
      </Paper>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{ sx: { width: 260, maxHeight: "60vh", borderRadius: 3, mb: 1.5 } }}
      >
        {visibleGroups.map(group => {
          const remaining = group.items.filter(item => !primaryKeys.has(item.index));
          if (!remaining.length) return null;
          return (
            <Box key={group.label}>
              <Typography sx={{ px: 2, pt: 1.25, pb: .5, color: "#9ba0a9", fontSize: ".61rem", fontWeight: 850, letterSpacing: ".1em", textTransform: "uppercase" }}>
                {group.label}
              </Typography>
              {remaining.map(item => {
                const active = activeTab === item.index;
                return (
                  <MenuItem
                    key={item.index}
                    selected={active}
                    onClick={() => { onTabChange(item.index); setAnchor(null); }}
                    sx={{ mx: .75, mb: .25, borderRadius: 2, fontSize: ".82rem", fontWeight: active ? 800 : 500 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: active ? brandColor : "#8b919c" }}>
                      {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
                    </ListItemIcon>
                    {item.label}
                  </MenuItem>
                );
              })}
            </Box>
          );
        })}
      </Menu>
    </>
  );
}
