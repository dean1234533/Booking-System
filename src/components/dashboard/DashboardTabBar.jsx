import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Collapse, ListItemIcon, Menu, MenuItem, Paper, Typography,
} from "@mui/material";
import { ChevronDown, MoreHorizontal } from "lucide-react";

function renderIcon(icon, size = 18, strokeWidth = 1.8) {
  return (
    <Box component="span" sx={{ display: "inline-flex", "& svg": { width: size, height: size, strokeWidth } }}>
      {icon}
    </Box>
  );
}

function NavItem({ item, active, brandColor, onClick, nested = false }) {
  return (
    <Button
      fullWidth
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      startIcon={renderIcon(item.icon)}
      sx={{
        justifyContent: "flex-start", minHeight: 40, px: 1.25,
        pl: nested ? 2.25 : 1.25, py: .8, borderRadius: 2,
        color: active ? brandColor : "#475467",
        bgcolor: active ? `${brandColor}12` : "transparent",
        fontWeight: active ? 750 : 550, fontSize: ".82rem",
        "& .MuiButton-startIcon": { color: active ? brandColor : "#98A2B3", mr: 1.15 },
        "&:hover": { bgcolor: active ? `${brandColor}18` : "#F2F4F7" },
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
  const activeGroup = visibleGroups.find(group => group.items.some(item => item.index === activeTab));
  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroup ? [activeGroup.label] : []));
  const allItems = visibleGroups.flatMap(group => group.items);
  const primaryKeys = useMemo(() => new Set(mobileItems.map(item => item.index)), [mobileItems]);
  const moreItems = allItems.filter(item => !primaryKeys.has(item.index));
  const moreActive = moreItems.some(item => item.index === activeTab);

  useEffect(() => {
    if (!activeGroup || activeGroup.items.length === 1) return;
    setOpenGroups(current => new Set([...current, activeGroup.label]));
  }, [activeGroup?.label, activeTab]);

  const toggleGroup = label => {
    setOpenGroups(current => {
      const next = new Set(current);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  if (!isMobile) {
    return (
      <Paper
        component="nav"
        aria-label="Dashboard sections"
        sx={{
          width: 232, flexShrink: 0, p: 1.25, borderRadius: 3,
          bgcolor: "#fff", color: "#101828",
          position: "sticky", top: 82, alignSelf: "flex-start",
          maxHeight: "calc(100vh - 106px)", overflowY: "auto",
          boxShadow: "0 1px 3px rgba(16,24,40,.04)",
        }}
      >
        <Typography sx={{ px: 1.25, pt: .5, pb: 1, color: "#98A2B3", fontSize: ".68rem", fontWeight: 750 }}>
          Menu
        </Typography>
        <Box sx={{ display: "grid", gap: .4 }}>
          {visibleGroups.map(group => {
            if (group.items.length === 1) {
              const item = group.items[0];
              return (
                <NavItem key={group.label} item={item} active={activeTab === item.index}
                  brandColor={brandColor} onClick={() => onTabChange(item.index)} />
              );
            }
            const open = openGroups.has(group.label);
            const containsActive = group.items.some(item => item.index === activeTab);
            return (
              <Box key={group.label}>
                <Button
                  fullWidth onClick={() => toggleGroup(group.label)} aria-expanded={open}
                  startIcon={renderIcon(group.icon)} endIcon={<ChevronDown size={16} strokeWidth={1.8} />}
                  sx={{
                    justifyContent: "flex-start", minHeight: 40, px: 1.25, py: .8,
                    borderRadius: 2, color: containsActive ? "#101828" : "#475467",
                    bgcolor: containsActive && !open ? "#F2F4F7" : "transparent",
                    fontWeight: containsActive ? 750 : 650, fontSize: ".82rem",
                    "& .MuiButton-startIcon": { color: containsActive ? brandColor : "#98A2B3", mr: 1.15 },
                    "& .MuiButton-endIcon": { ml: "auto", color: "#98A2B3", transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" },
                    "&:hover": { bgcolor: "#F2F4F7" },
                  }}
                >
                  {group.label}
                </Button>
                <Collapse in={open} timeout={180} unmountOnExit>
                  <Box sx={{ display: "grid", gap: .25, pt: .25, pb: .5 }}>
                    {group.items.map(item => (
                      <NavItem key={item.index} item={item} nested active={activeTab === item.index}
                        brandColor={brandColor} onClick={() => onTabChange(item.index)} />
                    ))}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        component="nav" aria-label="Dashboard sections"
        sx={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1250,
          display: "grid", gridTemplateColumns: `repeat(${mobileItems.length + 1}, minmax(0, 1fr))`,
          borderRadius: 0, borderInline: 0, borderBottom: 0,
          px: .5, pb: "max(6px, env(safe-area-inset-bottom))", pt: .55,
          boxShadow: "0 -4px 16px rgba(16,24,40,.08)",
        }}
      >
        {mobileItems.map(item => {
          const active = activeTab === item.index;
          return (
            <Button key={item.index} onClick={() => onTabChange(item.index)} aria-label={item.label}
              aria-current={active ? "page" : undefined}
              sx={{
                minWidth: 0, px: .25, py: .55, borderRadius: 2,
                display: "flex", flexDirection: "column", gap: .25,
                color: active ? brandColor : "#667085", fontSize: ".6rem", fontWeight: active ? 750 : 600,
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              {renderIcon(item.icon, 20)}
              <span>{item.label}</span>
            </Button>
          );
        })}
        <Button onClick={event => setAnchor(event.currentTarget)} aria-label="More dashboard sections"
          aria-expanded={Boolean(anchor)}
          sx={{
            minWidth: 0, px: .25, py: .55, borderRadius: 2,
            display: "flex", flexDirection: "column", gap: .25,
            color: moreActive ? brandColor : "#667085", fontSize: ".6rem", fontWeight: moreActive ? 750 : 600,
            "&:hover": { bgcolor: "transparent" },
          }}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>More</span>
        </Button>
      </Paper>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        PaperProps={{ sx: { width: 270, maxHeight: "65vh", borderRadius: 3, mb: 1.5, p: .5 } }}
      >
        {visibleGroups.map(group => {
          const remaining = group.items.filter(item => !primaryKeys.has(item.index));
          if (!remaining.length) return null;
          return (
            <Box key={group.label}>
              <Typography sx={{ px: 1.5, pt: 1.25, pb: .4, color: "#98A2B3", fontSize: ".67rem", fontWeight: 750 }}>
                {group.label}
              </Typography>
              {remaining.map(item => {
                const active = activeTab === item.index;
                return (
                  <MenuItem key={item.index} selected={active}
                    onClick={() => { onTabChange(item.index); setAnchor(null); }}
                    sx={{ mx: .5, mb: .25, borderRadius: 2, fontSize: ".84rem", fontWeight: active ? 750 : 500 }}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: active ? brandColor : "#98A2B3" }}>
                      {renderIcon(item.icon)}
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
