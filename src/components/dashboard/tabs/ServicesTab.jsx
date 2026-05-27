import React from "react";
import {
  Paper, Grid, TextField, Button, Card, CardContent,
  Typography, IconButton
} from "@mui/material";
import {
  Delete as DeleteIcon,
  AddCircle as AddCircleIcon,
} from "@mui/icons-material";

export default function ServicesTab({
  profile, newService, setNewService,
  handleAddService, handleRemoveService, brandColor
}) {
  return (
    <>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Service Name" value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })} />
          </Grid>
          <Grid item xs={8} sm={4}>
            <TextField fullWidth label="Price (£)" type="number" value={newService.price}
              onChange={e => setNewService({ ...newService, price: e.target.value })} />
          </Grid>
          <Grid item xs={4} sm={2}>
            <Button fullWidth variant="contained" sx={{ height: 56, bgcolor: brandColor }}
              onClick={handleAddService}>
              <AddCircleIcon />
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {(profile.services || []).map((s, i) => (
        <Card key={i} sx={{ mb: 1.5, borderRadius: 2 }} variant="outlined">
          <CardContent sx={{ display: "flex", justifyContent: "space-between", py: "12px !important" }}>
            <Typography fontWeight={700}>{s.name} — £{s.price}</Typography>
            <IconButton color="error" size="small" onClick={() => handleRemoveService(i)}>
              <DeleteIcon />
            </IconButton>
          </CardContent>
        </Card>
      ))}

      {(profile.services || []).length === 0 && (
        <Typography color="text.secondary" textAlign="center" mt={4}>
          No services added yet. Add your first service above.
        </Typography>
      )}
    </>
  );
}