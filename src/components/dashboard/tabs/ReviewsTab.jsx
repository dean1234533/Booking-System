import React from "react";
import { Grid, Paper, Box, Typography, Alert, Rating } from "@mui/material";

export default function ReviewsTab({ reviews }) {
  return (
    <>
      <Typography variant="h6" fontWeight={800} mb={3}>Reviews</Typography>
      {reviews.length === 0 ? (
        <Alert severity="info">No reviews yet.</Alert>
      ) : (
        <Grid container spacing={2}>
          {reviews.map(rev => (
            <Grid item xs={12} sm={6} key={rev.id}>
              <Paper sx={{ p: 2, borderRadius: 3 }} variant="outlined">
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography fontWeight={800}>{rev.customerName || "Anonymous"}</Typography>
                  <Rating value={rev.rating} readOnly size="small" />
                </Box>
                <Typography variant="body2">{rev.comment}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}