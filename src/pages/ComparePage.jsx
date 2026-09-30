import React from "react";
import { Box, Typography, Stack, Button, Chip } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { useNavigate } from "react-router-dom";

const COMPETITORS = [
  { name: "Fresha", price: "Free + fees", model: "Transaction-led", note: "Costs increase when customers pay online." },
  { name: "Treatwell", price: "~30%", model: "Booking commission", note: "A percentage of every marketplace booking." },
  { name: "Booksy", price: "£40 + VAT", model: "Monthly subscription", note: "Booking, marketplace and payment tools focused mainly on beauty professionals." },
  { name: "Mindbody", price: "£100–400+", model: "Tiered monthly", note: "Broad enterprise tooling at enterprise pricing." },
];

const FEATURES = [
  ["Multi-industry support", "Barbers, salons, PTs, decorators and plumbing trades", ["no", "no", "partial", "partial"]],
  ["Your own branded page", "Your identity stays front and centre", ["no", "no", "partial", "no"]],
  ["Flat monthly price", "Know your software cost", ["no", "no", "yes", "no"]],
  ["No booking commission", "Your growth does not raise the fee", ["no", "no", "yes", "yes"]],
  ["90-day free trial", "No card needed to begin", ["yes", "no", "no", "no"]],
  ["Installable web app", "Works from a phone home screen", ["no", "no", "no", "no"]],
  ["Full client portal", "Forms, plans, notes and check-ins", ["no", "no", "partial", "no"]],
  ["Trade-specific workflows", "Quotes, queues, PAR-Q and approvals", ["no", "no", "partial", "partial"]],
];

const REASONS = [
  ["01", "Your name stays above the door", "A branded booking page makes the client relationship yours—not the marketplace’s."],
  ["02", "Growth does not trigger a penalty", "A flat plan stays predictable whether you take five bookings or fifty."],
  ["03", "Different work gets different tools", "A decorator should not see the same workspace as a barber or personal trainer."],
  ["04", "Clients get more than a calendar", "History, forms, plans, payments and communication stay attached to the right person."],
];

function Status({ value = "yes" }) {
  const partial = value === "partial";
  const no = value === "no";
  const Icon = no ? CloseRoundedIcon : partial ? RemoveRoundedIcon : CheckRoundedIcon;
  return <Box sx={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: no ? "#ebe9e3" : partial ? "#EAF2FF" : "#93C5FD", color: no ? "#999a9f" : "#111116" }}><Icon sx={{ fontSize: 17 }} /></Box>;
}

export default function ComparePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState(0);
  const competitor = COMPETITORS[selected];

  return (
    <Box sx={{ bgcolor: "#f4f1e9", color: "#111116", minHeight: "100vh", overflowX: "hidden" }}>
      <Box sx={{ px: { xs: 2, md: 5 }, pt: { xs: 13, md: 17 }, pb: { xs: 7, md: 10 }, maxWidth: 1240, mx: "auto" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr .8fr" }, gap: 6, alignItems: "end" }}>
          <Box><Chip label="An honest side-by-side" sx={{ bgcolor: "#EAF2FF", color: "#2563EB", fontWeight: 900 }} /><Typography component="h1" sx={{ mt: 2.5, fontSize: { xs: "3rem", md: "6.2rem" }, fontWeight: 950, letterSpacing: "-.08em", lineHeight: .87 }}>Compare the fit.<br/>Not just the list.</Typography></Box>
          <Box><Typography sx={{ color: "#696a73", fontSize: "1.05rem", lineHeight: 1.75 }}>Most comparisons hide the working model behind a wall of ticks. Pick a platform and see what changes for your brand, clients and monthly cost.</Typography><Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={1.2} sx={{ mt: 3 }}><Button onClick={() => navigate("/signup")} sx={{ bgcolor: "#111116", color: "#fff", borderRadius: 99, px: 3, py: 1.25, fontWeight: 900 }}>Start free</Button><Button onClick={() => navigate("/pricing")} endIcon={<ArrowOutwardRoundedIcon />} sx={{ color: "#111116", fontWeight: 900 }}>See pricing</Button></Stack></Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "#111116", color: "#fff", borderRadius: { xs: "32px 32px 0 0", md: "58px 58px 0 0" }, px: { xs: 2, md: 5 }, py: { xs: 6, md: 9 } }}>
        <Box sx={{ maxWidth: 1160, mx: "auto" }}>
          <Typography sx={{ color: "#9da6ff", fontSize: ".68rem", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>Choose who to compare</Typography>
          <Box sx={{ display: "flex", gap: 1, mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }, overflowX: "auto", py: 2.5, scrollSnapType: "x mandatory", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
            {COMPETITORS.map((item, index) => <Button key={item.name} onClick={() => setSelected(index)} sx={{ flexShrink: 0, scrollSnapAlign: "start", whiteSpace: "nowrap", color: selected === index ? "#111116" : "#fff", bgcolor: selected === index ? "#93C5FD" : "#ffffff0c", border: "1px solid #ffffff22", borderRadius: 99, px: 2.5, "&:hover": { bgcolor: selected === index ? "#93C5FD" : "#ffffff18" } }}>{item.name}</Button>)}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: ".78fr 1.22fr" }, border: "1px solid #ffffff1c", borderRadius: { xs: 4, md: 7 }, overflow: "hidden" }}>
            <Box sx={{ p: { xs: 3, md: 5 }, bgcolor: "#2563EB", display: "flex", flexDirection: "column", minHeight: { xs: 280, md: 370 } }}>
              <Typography sx={{ fontSize: ".68rem", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", opacity: .65 }}>Bookrightly</Typography>
              <Typography sx={{ fontSize: { xs: "3.5rem", md: "5.2rem" }, fontWeight: 950, letterSpacing: "-.08em", lineHeight: .85, mt: "auto" }}>£10</Typography>
              <Typography sx={{ fontWeight: 850, mt: 1 }}>/month • flat subscription</Typography>
              <Typography sx={{ color: "#ffffffaa", mt: 3, lineHeight: 1.65 }}>Your branded page, purpose-built workspace and 90-day trial are included.</Typography>
            </Box>
            <Box sx={{ p: { xs: 3, md: 5 }, bgcolor: "#191a20", display: "flex", flexDirection: "column", minHeight: { xs: 280, md: 370 } }}>
              <Typography sx={{ color: "#ffffff77", fontSize: ".68rem", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>{competitor.name}</Typography>
              <Typography sx={{ fontSize: { xs: "3rem", md: "4.7rem" }, fontWeight: 950, letterSpacing: "-.07em", lineHeight: .9, mt: "auto" }}>{competitor.price}</Typography>
              <Typography sx={{ color: "#ff765c", fontWeight: 850, mt: 1 }}>{competitor.model}</Typography>
              <Typography sx={{ color: "#ffffff77", mt: 3, lineHeight: 1.65 }}>{competitor.note}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "#fff", px: { xs: 2, md: 5 }, py: { xs: 7, md: 11 } }}>
        <Box sx={{ maxWidth: 1160, mx: "auto" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: ".8fr 1.2fr" }, gap: 5, mb: 5 }}><Typography sx={{ fontSize: { xs: "2.4rem", md: "4rem" }, fontWeight: 950, letterSpacing: "-.07em", lineHeight: .95 }}>What changes in practice.</Typography><Typography sx={{ color: "#696a73", lineHeight: 1.75, alignSelf: "end" }}>Bookrightly is always the left status. The right status updates when you select another platform above.</Typography></Box>
          <Stack spacing={0}>
            {FEATURES.map(([label, sub, values], index) => <Box key={label} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr) 34px 34px", sm: "minmax(0, 1fr) 130px 130px" }, alignItems: "center", gap: { xs: .75, sm: 1 }, py: 2.2, borderBottom: "1px solid #dedbd3" }}><Box sx={{ minWidth: 0, pr: { xs: 1, sm: 0 } }}><Typography sx={{ fontWeight: 900, lineHeight: 1.25 }}>{label}</Typography><Typography sx={{ color: "#818189", fontSize: ".73rem", mt: .25, lineHeight: 1.45 }}>{sub}</Typography></Box><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Status/><Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: ".7rem", fontWeight: 800 }}>Bookrightly</Typography></Box><Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Status value={values[selected]}/><Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: ".7rem", fontWeight: 800 }}>{competitor.name}</Typography></Box></Box>)}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 7, md: 11 } }}>
        <Box sx={{ maxWidth: 1160, mx: "auto" }}>
          <Typography sx={{ color: "#2563EB", fontWeight: 900, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase" }}>Why people switch</Typography>
          <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2 }}>{REASONS.map(([number,title,body], index) => <Box key={title} sx={{ minHeight: 240, p: { xs: 3, md: 4 }, borderRadius: index % 2 ? "30px 7px 30px 30px" : "7px 30px 30px 30px", bgcolor: index === 0 ? "#93C5FD" : index === 1 ? "#2563EB" : "#fff", color: index === 1 ? "#fff" : "#111116", display: "flex", flexDirection: "column" }}><Typography sx={{ opacity: .5, fontWeight: 950 }}>{number}</Typography><Box sx={{ mt: "auto" }}><Typography sx={{ fontSize: "1.25rem", fontWeight: 950 }}>{title}</Typography><Typography sx={{ mt: 1, opacity: .62, fontSize: ".82rem", lineHeight: 1.7 }}>{body}</Typography></Box></Box>)}</Box>
          <Box sx={{ mt: 3, bgcolor: "#ff765c", borderRadius: "30px 7px 30px 30px", p: { xs: 4, md: 6 }, display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { md: "center" }, gap: 3 }}><Typography sx={{ fontSize: { xs: "2.2rem", md: "3.8rem" }, fontWeight: 950, letterSpacing: "-.07em", lineHeight: .95, maxWidth: 720 }}>Try the difference before you pay.</Typography><Button onClick={() => navigate("/signup")} endIcon={<ArrowOutwardRoundedIcon />} sx={{ bgcolor: "#111116", color: "#fff", borderRadius: 99, px: 3, py: 1.4, fontWeight: 900 }}>Start 90 days free</Button></Box>
        </Box>
      </Box>
    </Box>
  );
}
