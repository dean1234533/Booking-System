import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, TextField, Button, Rating,
  CircularProgress, Container, Alert
} from "@mui/material";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { Star as StarIcon } from "@mui/icons-material";

export default function ReviewPage() {
  const { shopId } = useParams(); // Ensure your Router path uses :shopId
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState({
    customerName: "",
    rating: 5,
    comment: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!review.customerName) { setError("Please enter your name."); return; }
    setError("");
    setLoading(true);
    try {
      // This path: db/barbers/{shopId}/reviews
      // Matches the fetch logic: collection(db, "barbers", barber.uid, "reviews")
      const reviewsRef = collection(db, "barbers", shopId, "reviews");
      
      await addDoc(reviewsRef, {
        customerName: review.customerName,
        rating: review.rating,
        comment: review.comment,
        date: new Date().toLocaleDateString(),
        createdAt: serverTimestamp()
      });
      
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting review:", err);
      setError("Failed to send review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center' }}>
        <Paper sx={{ p: 5, borderRadius: 4 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>Thank You! ✂️</Typography>
          <Typography color="text.secondary">Your feedback helps me grow and helps others find a great barber.</Typography>
          <Button variant="contained" sx={{ mt: 3, bgcolor: "#1A1A1A" }} onClick={() => navigate('/')}>Back to Home</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper sx={{ p: 4, borderRadius: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
        <Typography variant="h5" fontWeight={900} textAlign="center" mb={1}>
          How was your cut?
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={4}>
          Share your experience with the community.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="caption" fontWeight={800} display="block" gutterBottom>
              YOUR RATING
            </Typography>
            <Rating 
              size="large"
              value={review.rating}
              onChange={(e, newValue) => setReview({...review, rating: newValue})}
              emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
            />
          </Box>

          <TextField
            fullWidth
            label="Your Name"
            variant="outlined"
            required
            value={review.customerName}
            onChange={(e) => setReview({...review, customerName: e.target.value})}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="What did you like?"
            placeholder="Clean fade, great vibes, etc..."
            multiline
            rows={4}
            value={review.comment}
            onChange={(e) => setReview({...review, comment: e.target.value})}
            sx={{ mb: 4 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
          )}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ 
              bgcolor: "#1A1A1A", 
              py: 1.5, 
              borderRadius: 2, 
              fontWeight: 800,
              '&:hover': { bgcolor: "#333" }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Post Review"}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}