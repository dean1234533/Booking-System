import React from "react";

// src/components/BarberCard.jsx
// Displays a barber on the Home page grid.
// Clicking navigates to /barber/:id

import { useNavigate } from "react-router-dom";
import {
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Box,
  Avatar,
} from "@mui/material";
import { truncate } from "../Stripe+Utils/formatters.js";

export default function BarberCard({ barber }) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/barber/${barber.id}`)}
        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        {/* Photo */}
        {barber.photoURL ? (
          <CardMedia
            component="img"
            height="220"
            image={barber.photoURL}
            alt={barber.name}
            sx={{ objectFit: "cover" }}
          />
        ) : (
          <Box
            height={220}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="grey.100"
          >
            <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: 32 }}>
              {barber.name?.[0]?.toUpperCase()}
            </Avatar>
          </Box>
        )}

        <CardContent sx={{ flex: 1, p: 3 }}>
          {/* Name */}
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {barber.name}
          </Typography>

          {/* Specialty badge */}
          {barber.specialty && (
            <Chip
              label={barber.specialty}
              size="small"
              sx={{
                mb: 1.5,
                bgcolor: "secondary.main",
                color: "secondary.contrastText",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
          )}

          {/* Bio snippet */}
          <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
            {truncate(barber.bio, 90)}
          </Typography>

          {/* Deposit note */}
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={2}
            fontWeight={500}
          >
            £{barber.depositAmount ?? 10} deposit to book
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
