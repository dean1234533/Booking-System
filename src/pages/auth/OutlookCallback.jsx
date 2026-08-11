import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/config";
import { exchangeOutlookCode, saveOutlookTokens } from "../../firebase/outlook";

export default function OutlookCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connecting to Outlook...");
  const [error, setError]   = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");
    const state  = params.get("state");
    const stored = sessionStorage.getItem("outlook_state");

    if (!code) {
      setError("No authorisation code received from Microsoft.");
      return;
    }
    if (!state || state !== stored) {
      setError("Invalid state — please try connecting again.");
      return;
    }

    const uid = state.split(":")[0];

    // Wait for Firebase Auth to rehydrate before writing to Firestore
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        setError("You need to be logged in. Please log in and try again.");
        return;
      }
      try {
        sessionStorage.removeItem("outlook_state");
        setStatus("Exchanging tokens...");
        const tokens = await exchangeOutlookCode(code);
        setStatus("Saving connection...");
        await saveOutlookTokens(uid, tokens);
        setStatus("Connected! Redirecting...");
        setTimeout(() => navigate("/dashboard?tab=integrations"), 1000);
      } catch (e) {
        setError(e.message || "Connection failed. Please try again.");
      }
    });
  }, []);

  return (
    <Box sx={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", bgcolor: "#F6F7F9", gap: 2,
    }}>
      {error ? (
        <>
          <Typography variant="h6" color="error">{error}</Typography>
          <Typography
            sx={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline" }}
            onClick={() => navigate("/dashboard")}
          >
            Back to dashboard
          </Typography>
        </>
      ) : (
        <>
          <CircularProgress size={40} />
          <Typography color="text.secondary">{status}</Typography>
        </>
      )}
    </Box>
  );
}
