import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Container, Grid, Typography, Avatar,
  Paper, Skeleton, Alert, Divider, List, ListItem, ListItemText,
  ButtonBase, Stack
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import SlotPicker from "../components/SlotPicker";
import SEOConfig from "../components/SEOConfig"; 

import { db } from "../firebase/config"; 
import { doc, getDoc, collectionGroup, query, where, getDocs } from "firebase/firestore"; 
import { formatCurrency } from "../stripe/formatters";
import { useSlots } from "../hooks/useSlots";

export default function BarberProfile({ tenant: initialTenant }) {
  const { id: barberId } = useParams(); 

  const [barber, setBarber] = useState(null);
  const [footerData, setFooterData] = useState(initialTenant || null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSpecialty, setExpandedSpecialty] = useState(false);

  const { slots, loading: slotsLoading, error: slotsError } = useSlots(
    barberId, 
    barber?.isStaff || false, 
    barber?.shopId
  );

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadBarberData() {
      if (!barberId) return;
      try {
        setLoading(true);
        let staffData = null;

        const ownerSnap = await getDoc(doc(db, "barbers", barberId));
        if (ownerSnap.exists()) {
          const data = ownerSnap.data();
          if (data.role !== 'staff' && data.name) {
            staffData = { id: ownerSnap.id, ...data, isStaff: false, shopId: ownerSnap.id };
          }
        }

        if (!staffData) {
          const shopId = initialTenant?.id || ownerSnap?.data()?.shopId;
          if (shopId) {
            const staffSnap = await getDoc(doc(db, "barbers", shopId, "staff", barberId));
            if (staffSnap.exists() && staffSnap.data().name) {
              staffData = { id: staffSnap.id, ...staffSnap.data(), isStaff: true, shopId };
            }
          }
        }

        if (!staffData) {
          const q = query(collectionGroup(db, "staff"), where("uid", "==", barberId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docData = snap.docs[0].data();
            if (docData.name) {
              const parentShopId = snap.docs[0].ref.path.split('/')[1]; 
              staffData = { id: snap.docs[0].id, ...docData, isStaff: true, shopId: parentShopId };
            }
          }
        }

        if (staffData) {
          setBarber(staffData);
          
          if (staffData.shopId && !initialTenant) {
            const shopSnap = await getDoc(doc(db, "tenants", staffData.shopId));
            if (shopSnap.exists()) {
              setFooterData({ id: shopSnap.id, ...shopSnap.data() });
            }
          }
          setError(null);
        } else {
          setError("Barber profile not found.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    }
    loadBarberData();
  }, [barberId, initialTenant]);

  const brandColor = initialTenant?.brandColor || footerData?.brandColor || barber?.brandColor || "#C9A84C";
  const deposit = barber?.depositAmount ?? initialTenant?.depositAmount ?? 10;
  const firstName = barber?.name?.split(" ")[0] || "";

  if (loading) return (
    <Container maxWidth={false} sx={{ py: 8, minHeight: '100vh' }}>
      <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
      <Skeleton width="40%" height={40} /><Skeleton width="60%" />
    </Container>
  );

  if (error) return <Container maxWidth={false} sx={{ py: 8, minHeight: '100vh' }}><Alert severity="error">{error}</Alert></Container>;
  if (!barber) return null;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth={false} sx={{ py: { xs: 5, md: 8 }, flexGrow: 1, px: { xs: 2, md: 6 } }}>
        <SEOConfig barber={barber} tenant={initialTenant || footerData} />
        
        <Grid container spacing={6}>
          <Grid item xs={12} md={3} lg={2.5}>
            <Box textAlign={{ xs: "center", md: "left" }}>
              {barber.profilePic ? (
                <Box component="img" src={barber.profilePic} alt={barber.name}
                  sx={{ width: 180, height: 180, borderRadius: "50%", objectFit: "cover", mb: 2, border: "3px solid", borderColor: brandColor, mx: { xs: "auto", md: "0" }, display: "block" }} 
                />
              ) : (
                <Avatar sx={{ width: 180, height: 180, bgcolor: "grey.200", color: "grey.600", fontSize: 48, mb: 2, mx: { xs: "auto", md: "0" }, border: "3px solid", borderColor: brandColor }}>
                  {barber.name?.[0]?.toUpperCase()}
                </Avatar>
              )}
              
              <Typography variant="h3" fontWeight={900}>{firstName}</Typography>
              
              {/* THE SPECIALTY BOX THAT SHRINKS/EXPANDS */}
              {barber.specialty && (
                <ButtonBase
                  onClick={() => setExpandedSpecialty(!expandedSpecialty)}
                  sx={{
                    mt: 2,
                    p: 2,
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: "16px",
                    bgcolor: "#2D2D5F", // Dark blue background from your screenshot
                    color: "white",
                    display: 'block', // Allows the text inside to stack/wrap
                    transition: "all 0.3s ease-in-out",
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 0.5 }}>
                    <ContentCutIcon sx={{ fontSize: 16, mt: 0.3 }} />
                    <Typography 
                      variant="body2" 
                      fontWeight={600}
                      sx={{
                        lineHeight: 1.6,
                        display: expandedSpecialty ? 'block' : '-webkit-box',
                        WebkitLineClamp: expandedSpecialty ? 'unset' : 4, // Clamps to 4 lines when closed
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'normal'
                      }}
                    >
                      {barber.specialty}
                    </Typography>
                  </Stack>

                  {/* Icon to show it's clickable */}
                  <Box sx={{ position: 'absolute', bottom: 8, right: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                     <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem', fontWeight: 700 }}>
                        {expandedSpecialty ? "SHOW LESS" : "READ MORE"}
                     </Typography>
                     {expandedSpecialty ? <KeyboardArrowUpIcon sx={{ fontSize: 14 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
                  </Box>
                </ButtonBase>
              )}

              <Divider sx={{ my: 4 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" fontWeight={700} sx={{ mb: 1, display: 'block' }}>Services</Typography>
                <List dense disablePadding>
                  {barber.services?.map((service, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 1 }}>
                      <ListItemText primary={service.name} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                      <Typography variant="body2" fontWeight={700} color={brandColor}>
                        {formatCurrency(service.price)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>

             
            </Box>
          </Grid>
          
          <Grid item xs={12} md={9} lg={9.5}>
            <Typography variant="h4" fontWeight={900} mb={3}>Select a Time</Typography>
            <SlotPicker 
              slots={slots} 
              loading={slotsLoading} 
              error={slotsError} 
              barberId={barberId} 
              brandColor={brandColor} 
              shopId={barber.shopId} 
              isStaff={barber.isStaff} 
              tenant={footerData || initialTenant} 
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}