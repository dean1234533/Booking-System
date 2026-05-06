import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Grid, Typography, Avatar,
  Chip, Divider, Skeleton, Alert, Paper, List, ListItem, ListItemText
} from "@mui/material";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import SlotPicker from "../components/SlotPicker";
import { getBarber } from "../firebase/firestore"; 
import { useSlots } from "../hooks/useSlots.js";
import { formatCurrency } from "../stripe/formatters.js";

export default function ProfessionalProfile() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Custom hook to fetch available slots for this specific professional
  const { slots, loading: slotsLoading, error: slotsError } = useSlots(id);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getBarber(id);
        if (!data) {
          setError("Profile not found.");
        } else {
          setProvider(data);
        }
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [id]);

  if (loading) return (
    <Container sx={{ py: 8 }}>
      <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
      <Skeleton width="40%" height={40} />
      <Skeleton width="60%" />
    </Container>
  );

  if (error) return (
    <Container sx={{ py: 8 }}>
      <Alert severity="error">{error}</Alert>
    </Container>
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
      <Grid container spacing={5}>
        {/* Left Side: Bio & Services */}
        <Grid item xs={12} md={4}>
          <Box textAlign={{ xs: "center", md: "left" }}>
            {provider.photoURL ? (
              <Avatar 
                src={provider.photoURL} 
                sx={{ width: 140, height: 140, mb: 2, border: "3px solid", borderColor: "secondary.main", mx: { xs: "auto", md: 0 } }} 
              />
            ) : (
              <Avatar 
                sx={{ width: 140, height: 140, bgcolor: "primary.main", fontSize: 48, mb: 2, mx: { xs: "auto", md: 0 }, border: "3px solid", borderColor: "secondary.main" }}
              >
                {provider.name?.[0]}
              </Avatar>
            )}

            <Typography variant="h4" fontWeight={700} gutterBottom>
              {provider.name}
            </Typography>
            
            {/* Professional Tag (e.g., Hair Stylist) */}
            <Chip 
              label={provider.businessType || "Professional"} 
              variant="outlined" 
              sx={{ mb: 1, mr: 1 }} 
            />
            
            {provider.specialty && (
              <Chip 
                icon={<ContentCutIcon />} 
                label={provider.specialty} 
                sx={{ mb: 2, bgcolor: "secondary.main", color: "white" }} 
              />
            )}

            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
              {provider.bio || "No bio available."}
            </Typography>

            {/* Service Menu Section */}
            {provider.services?.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                  Services
                </Typography>
                <Paper variant="outlined">
                  <List dense>
                    {provider.services.map((service, index) => (
                      <ListItem 
                        key={index} 
                        divider={index !== provider.services.length - 1}
                        secondaryAction={
                          <Typography fontWeight={600}>
                            {formatCurrency(service.price)}
                          </Typography>
                        }
                      >
                        <ListItemText primary={service.name} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Box>
            )}

            <Paper variant="outlined" sx={{ mt: 3, p: 2, bgcolor: 'grey.50', textAlign: 'center' }}>
              <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                Deposit Required to Book
              </Typography>
              <Typography variant="h5" color="secondary.main" fontWeight={700}>
                {formatCurrency(provider.depositAmount || 10)}
              </Typography>
            </Paper>
          </Box>
        </Grid>

        {/* Right Side: Booking Calendar */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" fontWeight={700} mb={3}>
            Select a Time
          </Typography>
          <SlotPicker 
            slots={slots} 
            loading={slotsLoading} 
            error={slotsError} 
            depositAmount={provider.depositAmount}
          />
        </Grid>
      </Grid>
    </Container>
  );
}