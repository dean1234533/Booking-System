import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Container, Typography, Grid, Stack, IconButton, CircularProgress, Dialog, DialogContent, Chip } from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import FitnessCenterIcon     from "@mui/icons-material/FitnessCenter";
import TimerIcon             from "@mui/icons-material/Timer";
import RepeatIcon            from "@mui/icons-material/Repeat";
import NotesIcon             from "@mui/icons-material/Notes";
import CloseIcon             from "@mui/icons-material/Close";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YoutubeThumbnail({ url, name, brandColor, onPlay }) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return (
    <Box
      onClick={onPlay}
      sx={{
        position: "relative", cursor: "pointer", borderRadius: 0,
        overflow: "hidden", aspectRatio: "16/9", bgcolor: "#111",
        "&:hover .play-overlay": { opacity: 1 },
        "&:hover img": { transform: "scale(1.04)" },
      }}
    >
      <Box
        component="img"
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt={name}
        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
      />
      {/* Dark overlay */}
      <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.35)", transition: "opacity .2s" }} />
      {/* Play button overlay */}
      <Box
        className="play-overlay"
        sx={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          bgcolor: "rgba(0,0,0,0.45)", opacity: 0, transition: "opacity .2s",
        }}
      >
        <Box sx={{ bgcolor: brandColor, borderRadius: "50%", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PlayCircleOutlineIcon sx={{ fontSize: 30, color: "#0d0d0d" }} />
        </Box>
      </Box>
      {/* Permanent play icon bottom-right */}
      <Box sx={{ position: "absolute", bottom: 10, right: 12 }}>
        <PlayCircleOutlineIcon sx={{ fontSize: 28, color: "rgba(255,255,255,0.7)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }} />
      </Box>
    </Box>
  );
}

export default function WorkoutPlanView() {
  const { trainerId, planId } = useParams();
  const [plan,    setPlan]    = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);

  const brandColor = trainer?.brandColor || "#C9A84C";
  const activeId   = videoUrl ? extractYouTubeId(videoUrl) : null;

  useEffect(() => {
    async function load() {
      try {
        const [planSnap, trainerSnap] = await Promise.all([
          getDoc(doc(db, "barbers", trainerId, "workoutPlans", planId)),
          getDoc(doc(db, "barbers", trainerId)),
        ]);
        if (planSnap.exists()) setPlan({ id: planSnap.id, ...planSnap.data() });
        if (trainerSnap.exists()) setTrainer(trainerSnap.data());
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    }
    load();
  }, [trainerId, planId]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#C9A84C" }} thickness={2} size={52} />
      </Box>
    );
  }

  if (!plan) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <FitnessCenterIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.12)", mb: 2 }} />
          <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", color: "rgba(255,255,255,0.4)" }}>
            Plan not found
          </Typography>
        </Box>
      </Box>
    );
  }

  const exercises = plan.exercises || [];

  return (
    <Box sx={{ bgcolor: "#0d0d0d", minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <Box sx={{ borderBottom: `3px solid ${brandColor}`, bgcolor: "#111", py: { xs: 5, md: 8 }, px: { xs: 2, md: 5 } }}>
        <Container maxWidth="lg">
          {trainer?.businessName && (
            <Typography sx={{ fontFamily: SANS, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: brandColor, mb: 1.5 }}>
              {trainer.businessName}
            </Typography>
          )}
          <Typography sx={{ fontFamily: SERIF, fontWeight: 400, fontSize: { xs: "2rem", md: "3rem" }, color: "#fff", lineHeight: 1.1, mb: 1 }}>
            {plan.name}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Chip
              icon={<FitnessCenterIcon sx={{ fontSize: "14px !important", color: `${brandColor} !important` }} />}
              label={`${exercises.length} exercise${exercises.length !== 1 ? "s" : ""}`}
              sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", height: 24, borderRadius: 0, border: "1px solid rgba(255,255,255,0.08)" }}
            />
            {trainer?.name && (
              <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.28)", fontWeight: 400 }}>
                by {trainer.name}
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Exercise list */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, px: { xs: 2, md: 5 } }}>
        {exercises.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.25)", fontFamily: SERIF, fontSize: "1.1rem" }}>
              No exercises in this plan yet.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {exercises.map((ex, idx) => {
              const ytId = extractYouTubeId(ex.youtubeUrl);
              const hasStats = ex.sets || ex.reps || ex.time;
              return (
                <Box key={idx} sx={{ border: "1px solid rgba(255,255,255,0.07)", bgcolor: "#111", overflow: "hidden" }}>
                  {/* Accent bar */}
                  <Box sx={{ height: 3, bgcolor: brandColor }} />

                  <Grid container>
                    {/* Left: thumbnail */}
                    {ytId && (
                      <Grid item xs={12} md={4}>
                        <YoutubeThumbnail
                          url={ex.youtubeUrl}
                          name={ex.name}
                          brandColor={brandColor}
                          onPlay={() => setVideoUrl(ex.youtubeUrl)}
                        />
                      </Grid>
                    )}

                    {/* Right: details */}
                    <Grid item xs={12} md={ytId ? 8 : 12}>
                      <Box sx={{ p: { xs: 3, md: 3.5 }, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
                        {/* Number + name */}
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5 }}>
                          <Typography sx={{ fontFamily: SERIF, fontSize: "1.8rem", fontWeight: 400, color: brandColor, opacity: 0.35, lineHeight: 1, flexShrink: 0 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </Typography>
                          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.15rem", md: "1.3rem" }, fontWeight: 400, color: "#fff", lineHeight: 1.2 }}>
                            {ex.name || "Unnamed exercise"}
                          </Typography>
                        </Box>

                        {/* Stats row */}
                        {hasStats && (
                          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                            {ex.sets && (
                              <Stack direction="row" spacing={0.8} alignItems="center">
                                <RepeatIcon sx={{ fontSize: 15, color: brandColor }} />
                                <Box>
                                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>Sets</Typography>
                                  <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{ex.sets}</Typography>
                                </Box>
                              </Stack>
                            )}
                            {ex.reps && (
                              <Stack direction="row" spacing={0.8} alignItems="center">
                                <FitnessCenterIcon sx={{ fontSize: 15, color: brandColor }} />
                                <Box>
                                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>Reps</Typography>
                                  <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{ex.reps}</Typography>
                                </Box>
                              </Stack>
                            )}
                            {ex.time && (
                              <Stack direction="row" spacing={0.8} alignItems="center">
                                <TimerIcon sx={{ fontSize: 15, color: brandColor }} />
                                <Box>
                                  <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>Time</Typography>
                                  <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{ex.time}</Typography>
                                </Box>
                              </Stack>
                            )}
                          </Stack>
                        )}

                        {/* Notes */}
                        {ex.notes && (
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <NotesIcon sx={{ fontSize: 15, color: brandColor, mt: 0.3, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", fontWeight: 300, lineHeight: 1.7 }}>
                              {ex.notes}
                            </Typography>
                          </Stack>
                        )}

                        {/* Play button (if no thumbnail space due to no ytId) */}
                        {!ytId && ex.youtubeUrl && (
                          <Box>
                            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
                              Invalid YouTube URL
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
          </Stack>
        )}
      </Container>

      {/* Video player dialog */}
      <Dialog
        open={Boolean(activeId)}
        onClose={() => setVideoUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: "#0d0d0d", borderRadius: 0, overflow: "hidden", m: { xs: 1, sm: 3 } } }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1, bgcolor: "#111" }}>
          <IconButton onClick={() => setVideoUrl(null)} sx={{ color: "rgba(255,255,255,0.5)", "&:hover": { color: "#fff" } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 0, lineHeight: 0 }}>
          {activeId && (
            <Box
              component="iframe"
              src={`https://www.youtube.com/embed/${activeId}?autoplay=1`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              sx={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block", minHeight: { xs: 220, sm: 360 } }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
