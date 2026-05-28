import React, { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import MenuBookIcon    from "@mui/icons-material/MenuBook";
import AssignmentIcon  from "@mui/icons-material/Assignment";
import FoodDiaryTab    from "./FoodDiaryTab";
import CheckInTab      from "./CheckInTab";

export default function ClientFormsTab({ barber, brandColor }) {
  const [sub, setSub] = useState(0);

  return (
    <Box>
      <Tabs
        value={sub}
        onChange={(_, v) => setSub(v)}
        sx={{
          mb: 3,
          borderBottom: "1px solid #1e1e1e",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "#555",
            minHeight: 44,
            gap: 0.5,
          },
          "& .Mui-selected":      { color: `${brandColor} !important` },
          "& .MuiTabs-indicator": { bgcolor: brandColor },
        }}
      >
        <Tab label="Food Diary"  icon={<MenuBookIcon   sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab label="Check-In"    icon={<AssignmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
      </Tabs>

      {sub === 0 && <FoodDiaryTab barber={barber} brandColor={brandColor} />}
      {sub === 1 && <CheckInTab  barber={barber} brandColor={brandColor} />}
    </Box>
  );
}
