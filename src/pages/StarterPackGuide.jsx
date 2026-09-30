import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { BLOG_POSTS } from "./blog/posts";
import { renderBlock, DARK, DARK2, SERIF, SANS } from "./blog/renderBlock";

const SLUG = "free-business-starter-pack-google-directories-search-console";

export default function StarterPackGuide() {
  const navigate = useNavigate();
  const post = BLOG_POSTS.find((p) => p.slug === SLUG);

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <Box sx={{ bgcolor: DARK2, borderBottom: "1px solid rgba(255,255,255,0.05)", pt: "var(--nav-height, 130px)", pb: { xs: 5, md: 6 }, px: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Box
            component="button"
            onClick={() => navigate("/dashboard")}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.82rem", fontFamily: SANS, p: 0, mb: 3, "&:hover": { color: "#fff" } }}
          >
            <BackIcon sx={{ fontSize: 18 }} /> Back to dashboard
          </Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.8rem", md: "2.6rem" }, fontWeight: 400, lineHeight: 1.2 }}>
            {post.title}
          </Typography>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          {post.content.map((block, i) => renderBlock(block, i))}
        </Container>
      </Box>
    </Box>
  );
}
