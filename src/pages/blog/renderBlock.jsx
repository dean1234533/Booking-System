import React from "react";
import { Box, Typography } from "@mui/material";

export const GOLD = "#2563EB";
export const DARK = "#0d0d0d";
export const DARK2 = "#111";
export const DARK3 = "#1a1a1a";
export const SERIF = "'Playfair Display', serif";
export const SANS = "'DM Sans', sans-serif";

export const CATEGORY_COLOR = {
  Barbers: "#2563EB",
  "Personal Trainers": "#4caf80",
  Marketing: "#5b9bd5",
  Salons: "#e05c5c",
  Decorators: "#b07d4a",
  Careers: "#9b7de3",
};

export function renderBlock(block, i) {
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
    // Same styling as "p", but renders author-authored HTML (e.g. an inline
    // <a> link) instead of plain text. Only ever fed static content from
    // posts.js, never user input, so dangerouslySetInnerHTML is safe here.
    case "p-html":
      return (
        <Typography
          key={i}
          sx={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.9, mb: 2.5, "& a": { color: GOLD, textDecoration: "underline" } }}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case "list":
      // Items are static, author-authored strings from posts.js (never user
      // input) so they may contain inline HTML like a plain <a> link — same
      // trust model as "p-html" above.
      return (
        <Box key={i} component={block.ordered ? "ol" : "ul"} sx={{ m: 0, mb: 2.5, pl: 3 }}>
          {block.items.map((item, j) => (
            <Typography
              key={j} component="li"
              sx={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.9, mb: 0.75, "& a": { color: GOLD, textDecoration: "underline" } }}
              dangerouslySetInnerHTML={{ __html: item }}
            />
          ))}
        </Box>
      );
    case "cta":
      return (
        <Box key={i} sx={{ bgcolor: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.25)", p: 3.5, mt: 5 }}>
          <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>
            {block.text}
          </Typography>
        </Box>
      );
    default:
      return null;
  }
}
