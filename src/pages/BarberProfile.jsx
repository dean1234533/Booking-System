import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Grid, Typography, Avatar,
  Chip, Paper, List, ListItem, ListItemText, Skeleton, Alert
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import SlotPicker from "../components/SlotPicker";
import { getBarber } from "../firebase/firestore";
import { useSlots } from "../hooks/useSlots";
import { formatCurrency } from "../stripe/formatters";

export default function BarberProfile() {
  const { id } = useParams(); 
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSpecialty, setExpandedSpecialty] = useState(false);

  const { slots, loading: slotsLoading, error: slotsError } = useSlots(id);

  useEffect(() => {
    async function load() {
      try {
        const data = await getBarber(id);
        if (!data) setError("Barber not found.");
        else setBarber(data);
      } catch { setError("Failed to load profile."); } finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) return (
    <Container sx={{ py: 8 }}>
      <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
      <Skeleton width="40%" height={40} /><Skeleton width="60%" />
    </Container>
  );

  if (error) return <Container sx={{ py: 8 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Grid container spacing={5}>
        {/* Left Side: Barber Info */}
        <Grid item xs={12} md={4}>
          <Box textAlign={{ xs: "center", md: "left" }}>
            
            {barber.profilePic ? (
              <Box 
                component="img" 
                src={barber.profilePic} 
                alt={barber.name}
                sx={{ 
                  width: 140, 
                  height: 140, 
                  borderRadius: "50%", 
                  objectFit: "cover", 
                  mb: 2, 
                  border: "3px solid", 
                  borderColor: "secondary.main", 
                  mx: { xs: "auto", md: 0 }, 
                  display: "block" 
                }} 
              />
            ) : (
              <Avatar sx={{ 
                width: 140, 
                height: 140, 
                bgcolor: "primary.main", 
                fontSize: 48, 
                mb: 2, 
                mx: { xs: "auto", md: 0 }, 
                border: "3px solid", 
                borderColor: "secondary.main" 
              }}>
                {barber.name?.[0]?.toUpperCase()}
              </Avatar>
            )}

            <Typography variant="h4" fontWeight={700} gutterBottom>{barber.name}</Typography>

            {barber.businessType && (
              <Chip label={barber.businessType} variant="outlined" sx={{ mb: 1, mr: 1 }} />
            )}
            
            {/* SPECIALTY CHIP WITH CLICK-TO-EXPAND */}
            {barber.specialty && (
              <Chip 
                icon={<ContentCutIcon style={{ color: 'white' }} />} 
                label={barber.specialty}
                onClick={() => setExpandedSpecialty(!expandedSpecialty)}
                sx={{ 
                  mb: 2, 
                  bgcolor: "secondary.main", // Restored Gold
                  color: "white",
                  cursor: "pointer",
                  height: "auto",
                  "& .MuiChip-label": {
                    display: "block",
                    whiteSpace: expandedSpecialty ? "normal" : "nowrap",
                    overflow: expandedSpecialty ? "visible" : "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: expandedSpecialty ? "100%" : "200px",
                    py: expandedSpecialty ? 1 : 0.5,
                    lineHeight: 1.4
                  },
                  "&:hover": {
                    bgcolor: "secondary.main", // Kept consistent gold on hover
                    opacity: 0.9
                  }
                }} 
              />
            )}

            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
              {barber.bio || "No bio available."}
            </Typography>

            {/* THE SERVICE LIST */}
            {barber.services?.length > 0 && (
              <Box mb={3}>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>Services</Typography>
                <Paper variant="outlined">
                  <List dense>
                    {barber.services.map((service, i) => (
                      <ListItem 
                        key={i} 
                        divider={i !== barber.services.length - 1}
                        secondaryAction={<Typography fontWeight={600}>{formatCurrency(service.price)}</Typography>}
                      >
                        <ListItemText primary={service.name} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

            <Paper variant="outlined" sx={{ mt: 3, p: 2, bgcolor: "grey.50", textAlign: "center" }}>
              <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                Deposit Required to Book
              </Typography>
              <Typography variant="h5" color="secondary.main" fontWeight={700}>
                {formatCurrency(barber.depositAmount || 10)}
              </Typography>
            </Paper>
          </Box>
        </Grid>

        {/* Right Side: Slot Picker */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" fontWeight={700} mb={3}>Select a Time</Typography>
          <SlotPicker 
            slots={slots} 
            loading={slotsLoading} 
            error={slotsError} 
            barberId={id} 
          />
        </Grid>
      </Grid>
    </Container>
  );
}