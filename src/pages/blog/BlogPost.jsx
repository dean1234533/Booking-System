import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { BLOG_POSTS } from "./posts";

const GOLD = "#C9A84C";
const DARK = "#0d0d0d";
const DARK2 = "#111";
const DARK3 = "#1a1a1a";
const SERIF = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";

const CATEGORY_COLOR = {
  Barbers: "#C9A84C",
  "Personal Trainers": "#4caf80",
  Marketing: "#5b9bd5",
  Salons: "#e05c5c",
  Decorators: "#b07d4a",
};

function renderBlock(block, i) {
  switch (block.type) {
    case "intro":
      return (
        <Typography key={i} sx={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.9, mb: 3, fontStyle: "italic", borderLeft: `3px solid ${GOLD}`, pl: 2.5 }}>
          {block.text}
        </Typography>
      );
    case "h2":
      return (
        <Typography key={i} sx={{ fontFamily: SERIF, fontSize: { xs: "1.3rem", md: "1.6rem" }, fontWeight: 400, mt: 5, mb: 2, color: "#fff" }}>
          {block.text}
        </Typography>
      );
    case "p":
      return (
        <Typography key={i} sx={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.9, mb: 2.5 }}>
          {block.text}
        </Typography>
      );
    case "cta":
      return (
        <Box key={i} sx={{ bgcolor: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.25)", p: 3.5, mt: 5 }}>
          <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>
            {block.text}
          </Typography>
        </Box>
      );
    default:
      return null;
  }
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "2rem", mb: 2 }}>Post not found</Typography>
          <Box component="button" onClick={() => navigate("/blog")} sx={{ px: 3, py: 1.5, bgcolor: GOLD, color: DARK, border: "none", cursor: "pointer", fontWeight: 700 }}>
            Back to blog
          </Box>
        </Box>
      </Box>
    );
  }

  const related = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <Box sx={{ bgcolor: DARK2, borderBottom: "1px solid rgba(255,255,255,0.05)", pt: { xs: 10, md: 12 }, pb: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box
              component="button"
              onClick={() => navigate("/blog")}
              sx={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "0.82rem", fontFamily: SANS, p: 0, "&:hover": { color: GOLD } }}
            >
              ← Blog
            </Box>
            <Box sx={{ px: 1.5, py: 0.4, bgcolor: `${CATEGORY_COLOR[post.category] || GOLD}18` }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: CATEGORY_COLOR[post.category] || GOLD, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {post.category}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{post.readTime} read</Typography>
          </Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.8rem", md: "2.8rem" }, fontWeight: 400, lineHeight: 1.2, mb: 2 }}>
            {post.title}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: "0.82rem" }}>
            {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </Typography>
        </Container>
      </Box>

      {/* Content */}
      <Box sx={{ py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          {post.content.map((block, i) => renderBlock(block, i))}

          {/* Sign-off CTA */}
          <Box sx={{ mt: 6, pt: 5, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.4rem", md: "1.8rem" }, mb: 2 }}>
              Start taking online bookings today
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", mb: 3, maxWidth: 440, mx: "auto", lineHeight: 1.8 }}>
              90-day free trial. No card needed. Set up in under an hour.
            </Typography>
            <Box component="button" onClick={() => navigate("/signup")} sx={{ px: 4, py: 1.75, bgcolor: GOLD, color: DARK, fontFamily: SANS, fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", "&:hover": { opacity: 0.9 } }}>
              Get started free
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Related posts */}
      {related.length > 0 && (
        <Box sx={{ bgcolor: DARK2, borderTop: "1px solid rgba(255,255,255,0.05)", py: { xs: 6, md: 8 }, px: { xs: 3, md: 5 } }}>
          <Container maxWidth="lg">
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.4rem", mb: 4 }}>More from the blog</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2.5 }}>
              {related.map((p) => (
                <Box
                  key={p.slug}
                  onClick={() => navigate(`/blog/${p.slug}`)}
                  sx={{ bgcolor: DARK3, border: "1px solid rgba(255,255,255,0.06)", p: 3, cursor: "pointer", "&:hover": { borderColor: "rgba(201,168,76,0.25)" }, transition: "border-color 0.2s" }}
                >
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: CATEGORY_COLOR[p.category] || GOLD, textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>
                    {p.category}
                  </Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: "1rem", lineHeight: 1.4, color: "#fff" }}>
                    {p.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>
      )}
    </Box>
  );
}
