import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, CircularProgress, Stack, Divider } from "@mui/material";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const SANS  = "'DM Sans', sans-serif";
const SERIF = "'Playfair Display', serif";

function fmt(n) { return `£${Number(n || 0).toFixed(2)}`; }

function calcTotals(items, vatRate) {
  const subtotal = (items || []).reduce((s, i) => s + (Number(i.qty || 0) * Number(i.price || 0)), 0);
  const vat      = subtotal * (Number(vatRate || 0) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

export default function QuoteViewPage() {
  const { tradeId, quoteId } = useParams();
  const [quote,    setQuote]    = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [quoteSnap, bizSnap] = await Promise.all([
          getDoc(doc(db, "barbers", tradeId, "quotes", quoteId)),
          getDoc(doc(db, "barbers", tradeId)),
        ]);
        if (!quoteSnap.exists()) { setNotFound(true); return; }
        setQuote({ id: quoteSnap.id, ...quoteSnap.data() });
        if (bizSnap.exists()) setBusiness(bizSnap.data());
      } catch (e) {
        console.error(e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tradeId, quoteId]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#faf9f7" }}>
      <CircularProgress sx={{ color: "#C9A84C" }} />
    </Box>
  );

  if (notFound) return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#faf9f7", gap: 1 }}>
      <Typography sx={{ fontFamily: SERIF, fontSize: "1.5rem", color: "#1c1917" }}>Quote not found</Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: "0.85rem", color: "#78716c" }}>This link may have expired or been removed.</Typography>
    </Box>
  );

  const brand      = business?.brandColor || "#C9A84C";
  const bizName    = business?.businessName || business?.displayName || "Your Decorator";
  const logoUrl    = business?.businessLogo || business?.logoUrl || "";
  const bizEmail   = business?.businessEmail || business?.email || "";
  const bizPhone   = business?.phone || business?.businessPhone || "";
  const { subtotal, vat, total } = calcTotals(quote.items, quote.vatRate);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#faf9f7", py: { xs: 3, md: 6 }, px: 2 }}>
      <Box sx={{ maxWidth: 760, mx: "auto", bgcolor: "#fff", boxShadow: "0 2px 24px rgba(0,0,0,0.07)", borderRadius: "12px", overflow: "hidden" }}>

        {/* Header */}
        <Box sx={{ borderBottom: `4px solid ${brand}`, px: { xs: 3, md: 5 }, py: 3.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box>
            {logoUrl && (
              <Box component="img" src={logoUrl} alt="logo"
                sx={{ height: 44, objectFit: "contain", display: "block", mb: 1 }} />
            )}
            <Typography sx={{ fontFamily: SERIF, fontSize: "1.3rem", fontWeight: 700, color: "#1c1917" }}>{bizName}</Typography>
            {bizEmail && <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "#78716c", mt: 0.25 }}>{bizEmail}</Typography>}
            {bizPhone && <Typography sx={{ fontFamily: SANS, fontSize: "0.78rem", color: "#78716c" }}>{bizPhone}</Typography>}
          </Box>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e", mb: 0.25 }}>
              Quote Reference
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.95rem", fontWeight: 700, color: "#1c1917" }}>
              #{quote.reference || quoteId.slice(-6).toUpperCase()}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e", mt: 1.5, mb: 0.25 }}>
              Date Issued
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "#1c1917" }}>{quote.quoteDate}</Typography>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 3, md: 5 }, py: 4 }}>

          {/* Quote title */}
          <Typography sx={{ fontFamily: SERIF, fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 400, color: "#1c1917", lineHeight: 1.2, mb: 3 }}>
            Quotation for {quote.jobTitle || "Decorating Works"}
          </Typography>

          {/* Meta row */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" }, gap: 2.5, mb: 4, p: 2.5, bgcolor: "#faf8f5", borderLeft: `3px solid ${brand}`, borderRadius: "0 8px 8px 0" }}>
            <Box>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e", mb: 0.5 }}>
                Prepared For
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", fontWeight: 600, color: "#1c1917" }}>{quote.clientName}</Typography>
              {quote.clientEmail && <Typography sx={{ fontFamily: SANS, fontSize: "0.75rem", color: "#78716c", mt: 0.25 }}>{quote.clientEmail}</Typography>}
            </Box>
            {quote.address && (
              <Box>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e", mb: 0.5 }}>
                  Property
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "#1c1917" }}>{quote.address}</Typography>
              </Box>
            )}
            <Box>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e", mb: 0.5 }}>
                Valid For
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.88rem", color: "#1c1917" }}>{quote.validDays || 30} days</Typography>
            </Box>
          </Box>

          {/* Line items table */}
          <Box sx={{ mb: 3 }}>
            {/* Header row */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 90px 90px", gap: 1, pb: 1, borderBottom: `2px solid ${brand}`, mb: 0.5 }}>
              {["Description", "Qty", "Unit", "Unit Price", "Total"].map((h, i) => (
                <Typography key={h} sx={{ fontFamily: SANS, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a8a29e", textAlign: i >= 3 ? "right" : "left" }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {(quote.items || []).map((item, idx) => (
              <Box key={idx} sx={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 90px 90px", gap: 1, py: 1.5, borderBottom: "1px solid #f0ebe2", alignItems: "start" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.86rem", color: "#44403c" }}>{item.desc}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.86rem", color: "#44403c" }}>{item.qty}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.86rem", color: "#44403c" }}>{item.unit}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.86rem", color: "#44403c", textAlign: "right" }}>{fmt(Number(item.price || 0))}</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.86rem", color: "#44403c", textAlign: "right" }}>{fmt(Number(item.qty || 0) * Number(item.price || 0))}</Typography>
              </Box>
            ))}
          </Box>

          {/* Totals */}
          <Box sx={{ ml: "auto", width: { xs: "100%", sm: 280 }, mb: 4 }}>
            <Stack spacing={0.75}>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid #f0ebe2" }}>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.84rem", color: "#78716c" }}>Subtotal</Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "0.84rem", color: "#44403c" }}>{fmt(subtotal)}</Typography>
              </Box>
              {Number(quote.vatRate) > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid #f0ebe2" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.84rem", color: "#78716c" }}>VAT ({quote.vatRate}%)</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: "0.84rem", color: "#44403c" }}>{fmt(vat)}</Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1.5, mt: 0.5, borderTop: `2px solid ${brand}` }}>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.15rem", color: "#1c1917" }}>Total</Typography>
                <Typography sx={{ fontFamily: SERIF, fontSize: "1.15rem", color: brand, fontWeight: 700 }}>{fmt(total)}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Notes */}
          {quote.notes && (
            <Box sx={{ p: 2.5, bgcolor: "#faf8f5", borderLeft: `3px solid ${brand}`, borderRadius: "0 8px 8px 0", mb: 3 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a8a29e", mb: 1 }}>
                Notes & Terms
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "0.84rem", color: "#78716c", lineHeight: 1.7 }}>
                {quote.notes}
              </Typography>
            </Box>
          )}

          {/* Footer */}
          <Divider sx={{ my: 3, borderColor: "#f0ebe2" }} />
          <Typography sx={{ fontFamily: SANS, fontSize: "0.68rem", color: "#a8a29e", textAlign: "center", letterSpacing: "0.08em" }}>
            {bizName} &nbsp;·&nbsp; Quote generated via Bookrightly
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
