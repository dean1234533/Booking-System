import React, { useState } from "react";
import { Box, Button, Menu, MenuItem, ListItemIcon, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

/**
 * Compressed, grouped tab bar for the dashboard.
 *
 * groups: Array of { label, icon, items: [{ label, icon, index }] }
 *
 * Groups with 1 item render as a plain tab.
 * Groups with 2+ items render as a dropdown button.
 */
export default function DashboardTabBar({ groups, activeTab, onTabChange, brandColor = "#C9A84C", isMobile }) {
  const [anchor,    setAnchor]    = useState(null);
  const [openGroup, setOpenGroup] = useState(null);

  const openMenu  = (e, label) => { setAnchor(e.currentTarget); setOpenGroup(label); };
  const closeMenu = ()          => { setAnchor(null); setOpenGroup(null); };
  const pick      = (idx)       => { onTabChange(idx); closeMenu(); };

  const visible = groups.filter(g => g.items.length > 0);

  return (
    <Box sx={{
      display: "flex",
      flexWrap: "wrap",
      gap: { xs: 0.25, sm: 0.5 },
      alignItems: "flex-end",
      borderBottom: "1.5px solid #e8e8e8",
      mb: 3,
      pb: 0,
      px: 0,
    }}>
      {visible.map((group) => {
        const isActive  = group.items.some(i => i.index === activeTab);
        const isOpen    = openGroup === group.label;

        // ── Single-item group → plain tab ──
        if (group.items.length === 1) {
          const item = group.items[0];
          const active = activeTab === item.index;
          return (
            <SingleTab
              key={group.label}
              label={group.label}
              icon={item.icon}
              active={active}
              isMobile={isMobile}
              brandColor={brandColor}
              onClick={() => pick(item.index)}
            />
          );
        }

        // ── Multi-item group → dropdown ──
        return (
          <React.Fragment key={group.label}>
            <Button
              onClick={(e) => openMenu(e, group.label)}
              disableRipple
              endIcon={
                <KeyboardArrowDownIcon sx={{
                  fontSize: "15px !important",
                  ml: -0.25,
                  opacity: 0.6,
                  transition: "transform .2s",
                  transform: isOpen ? "rotate(180deg)" : "none",
                }} />
              }
              sx={{
                color:       isActive ? "#1a1a1a" : "#6b6b6b",
                borderBottom: isActive ? `2.5px solid ${brandColor}` : "2.5px solid transparent",
                borderRadius: 0,
                px: { xs: 1, sm: 1.5 },
                py: 1.2,
                minWidth: 0,
                fontWeight: isActive ? 700 : 500,
                fontSize:   "0.78rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                lineHeight: 1,
                bgcolor: isOpen ? "rgba(0,0,0,0.03)" : "transparent",
                transition: "color .15s, border-color .15s, background .15s",
                "&:hover": {
                  bgcolor: "rgba(0,0,0,0.04)",
                  color: "#1a1a1a",
                },
              }}
            >
              {isMobile
                ? React.cloneElement(group.icon, { sx: { fontSize: 18 } })
                : group.label
              }
            </Button>

            <Menu
              anchorEl={anchor}
              open={isOpen}
              onClose={closeMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              TransitionProps={{ timeout: 150 }}
              PaperProps={{
                elevation: 4,
                sx: {
                  minWidth: 210,
                  borderRadius: "10px",
                  mt: 0.75,
                  border: "1px solid #f0f0f0",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
                  overflow: "hidden",
                  "& .MuiList-root": { py: 0.75 },
                },
              }}
            >
              {/* Dropdown header */}
              <Box sx={{ px: 2, pt: 1.5, pb: 0.75, borderBottom: "1px solid #f4f4f4" }}>
                <Typography sx={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#aaa",
                }}>
                  {group.label}
                </Typography>
              </Box>

              {group.items.map((item) => {
                const sel = activeTab === item.index;
                return (
                  <MenuItem
                    key={item.label}
                    onClick={() => pick(item.index)}
                    selected={sel}
                    dense
                    sx={{
                      mx: 0.75,
                      my: 0.25,
                      px: 1.25,
                      py: 0.9,
                      borderRadius: "6px",
                      fontSize: "0.84rem",
                      fontWeight: sel ? 700 : 400,
                      color: sel ? brandColor : "#333",
                      bgcolor: sel ? `${brandColor}14` : "transparent",
                      transition: "background .12s, color .12s",
                      "&:hover": {
                        bgcolor: sel ? `${brandColor}20` : "#f7f7f7",
                      },
                      "&.Mui-selected": { bgcolor: `${brandColor}14` },
                      "&.Mui-selected:hover": { bgcolor: `${brandColor}20` },
                    }}
                  >
                    <ListItemIcon sx={{
                      minWidth: 28,
                      color: sel ? brandColor : "#999",
                    }}>
                      {React.cloneElement(item.icon, { style: { fontSize: 15 } })}
                    </ListItemIcon>
                    {item.label}
                  </MenuItem>
                );
              })}
            </Menu>
          </React.Fragment>
        );
      })}
    </Box>
  );
}

function SingleTab({ label, icon, active, isMobile, brandColor, onClick }) {
  return (
    <Button
      onClick={onClick}
      disableRipple
      startIcon={React.cloneElement(icon, { style: { fontSize: 15 } })}
      sx={{
        color:        active ? "#1a1a1a" : "#6b6b6b",
        borderBottom: active ? `2.5px solid ${brandColor}` : "2.5px solid transparent",
        borderRadius: 0,
        px: { xs: 1, sm: 1.5 },
        py: 1.2,
        minWidth: 0,
        fontWeight: active ? 700 : 500,
        fontSize:   "0.78rem",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: 1,
        gap: 0.5,
        transition: "color .15s, border-color .15s",
        "& .MuiButton-startIcon": { mr: isMobile ? 0 : 0.75 },
        "&:hover": { bgcolor: "transparent", color: "#1a1a1a" },
      }}
    >
      {!isMobile && label}
    </Button>
  );
}
