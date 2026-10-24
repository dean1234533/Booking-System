import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton, Stack, Typography, useMediaQuery } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

// SourceForge's own embed snippet is a literal <script>...</script> block,
// which the site's CSP (worker.js) would block as an inline script unless
// hashed. Reproducing what that snippet does — append its own loader
// script — from here instead means only the external src's origin
// (b.sf-syn.com) needs allowlisting, not a content hash for this exact
// snippet. Guarded so it only ever injects once even if Footer re-mounts.
function SourceForgeBadge() {
  const rootRef = useRef(null);
  useEffect(() => {
    if (document.querySelector('script[src^="https://b.sf-syn.com/badge_js"]')) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://b.sf-syn.com/badge_js?sf_id=4133962&variant_id=sf";
    document.body.appendChild(script);
  }, []);
  return (
    <div
      ref={rootRef}
      className="sf-root"
      data-id="4133962"
      data-badge="light-default"
      data-variant-id="sf"
      style={{ width: 125 }}
    >
      <a href="https://sourceforge.net/software/product/Bookrightly/" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff55", fontSize: ".7rem" }}>
        Bookrightly Reviews
      </a>
    </div>
  );
}

// The server supplies sanitised directory embeds and working destinations.
export default function DirectoryBadgeCarousel() {
  const trackRef = useRef(null);
  const [serverItems, setServerItems] = useState(() =>
    typeof document === "undefined" ? "" : document.querySelector("#bookrightly-badge-fallback ul")?.innerHTML || ""
  );
  useEffect(() => {
    document.getElementById("bookrightly-badge-fallback")?.remove();
    if (serverItems) return;
    const controller = new AbortController();
    fetch("/api/directory-badges", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.html) setServerItems(data.html); })
      .catch(() => {}); // The existing directory links remain usable offline.
    return () => controller.abort();
  }, []);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const track = trackRef.current;
    const update = () => setEdges({
      start: track.scrollLeft <= 1,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    });
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [serverItems]);

  useEffect(() => {
    const track = trackRef.current;
    const showImageFallback = (image) => {
      if (image.tagName !== "IMG" || !track.contains(image)) return;
      const link = image.closest("a");
      if (!link) return;
      const label = document.createElement("span");
      label.textContent = image.alt || link.hostname;
      image.replaceWith(label);
    };
    const onError = (event) => showImageFallback(event.target);
    track.addEventListener("error", onError, true);
    // Images can fail before React mounts or before this listener is installed.
    track.querySelectorAll("img").forEach(image => {
      if (image.complete && image.naturalWidth === 0) showImageFallback(image);
    });
    return () => track.removeEventListener("error", onError, true);
  }, [serverItems]);

  const move = (direction) => {
    const track = trackRef.current;
    track.scrollBy({ left: direction * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  };
  const cardStyles = {
    flex: "0 0 248px", minWidth: 0, scrollSnapAlign: "start",
    border: "1px solid #ffffff26", borderRadius: 2, p: 2,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    textAlign: "center", gap: 1.5,
    minHeight: 112, bgcolor: "#ffffff06",
    "& a:focus-visible": { outline: "2px solid #93C5FD", outlineOffset: 4 },
  };

  return (
    <Box component="section" aria-label="Bookrightly directory listings" aria-roledescription="carousel"
      sx={{ borderTop: "1px solid #ffffff17", px: { xs: 3, md: 6 }, py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Typography component="h2" sx={{ fontSize: ".72rem", fontWeight: 850, letterSpacing: ".1em", textTransform: "uppercase", color: "#ffffffb3" }}>
          Find us on
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton aria-label="Previous directory badges" aria-controls="directory-badges" disabled={edges.start} onClick={() => move(-1)} sx={{ color: "#fff", border: "1px solid #ffffff26", "&.Mui-disabled": { color: "#ffffff40" }, "&:focus-visible": { outline: "2px solid #93C5FD" } }}>
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="Next directory badges" aria-controls="directory-badges" disabled={edges.end} onClick={() => move(1)} sx={{ color: "#fff", border: "1px solid #ffffff26", "&.Mui-disabled": { color: "#ffffff40" }, "&:focus-visible": { outline: "2px solid #93C5FD" } }}>
            <ArrowForwardRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <Box component="ul" id="directory-badges" ref={trackRef} tabIndex={0} aria-label="Directory badges; swipe or use the arrow buttons"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }}
        children={serverItems ? undefined : (<><Box component="li" sx={cardStyles}>
          <Typography sx={{ fontSize: ".66rem", color: "#ffffff99" }}>Startup directory</Typography>
          <Typography component="a" href="https://launchpadly.co/startup/bookrightly?ref=badge" target="_blank" rel="noopener noreferrer" data-launchpadly-badge="bookrightly"
            sx={{ color: "#fff", fontSize: ".85rem", fontWeight: 750, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
            Proudly listed on Launchpadly Startup Directory
          </Typography>
        </Box>
        <Box component="li" sx={cardStyles}>
          <Typography sx={{ fontSize: ".66rem", color: "#ffffff99" }}>Software reviews</Typography>
          <SourceForgeBadge />
        </Box></>)}
        dangerouslySetInnerHTML={serverItems ? { __html: serverItems } : undefined}
        sx={{ "& > li": cardStyles, "& img": { maxWidth: "100%", height: "auto", objectFit: "contain" }, "& a": { color: "#fff" }, m: 0, p: 0, listStyle: "none", display: "flex", gap: 2, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "thin", scrollbarColor: "#93C5FD #ffffff0a", "&:focus-visible": { outline: "2px solid #93C5FD", outlineOffset: 3 } }} />
    </Box>
  );
}
