import React from "react";
import { Box, Typography, Stack, Button, IconButton } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BarberCard from "./BarberCard"; // Import your card component

export default function CategoryRow({ title, businessType, allBusinesses }) {
  // Filter for this specific category
  const categoryBusinesses = allBusinesses.filter(b => (b.businessType || "barber") === businessType);
  
  if (categoryBusinesses.length === 0) return null;

  // Limit to 10 for the "slider" view
  const displayList = categoryBusinesses.slice(0, 10);
  const hasMore = categoryBusinesses.length > 10;

  return (
    <Box sx={{ my: 6 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={2}>
        <Typography variant="h5" fontWeight={900} sx={{ textTransform: 'capitalize' }}>
          {title}
        </Typography>
        {hasMore && (
          <Button endIcon={<ArrowForwardIcon />} sx={{ color: '#C9A84C', fontWeight: 700 }}>
            VIEW ALL
          </Button>
        )}
      </Box>

      <Stack 
        direction="row" 
        spacing={3} 
        sx={{ 
          overflowX: 'auto', 
          pb: 3, 
          px: 2,
          '&::-webkit-scrollbar': { display: 'none' } // Hide scrollbar for clean look
        }}
      >
        {displayList.map((barber) => (
          <Box key={barber.id || barber.uid} sx={{ minWidth: { xs: 280, sm: 320 } }}>
            <BarberCard barber={barber} isMarketplace={true} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}