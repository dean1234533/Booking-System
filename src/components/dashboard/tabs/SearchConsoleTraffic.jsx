import React, {useState, useEffect, useCallback} from "react";
import {
  Box, Button, CircularProgress, Divider, Grid,
  Paper, Typography, Alert, Stack,
} from "@mui/material";
import {
  TrendingUp      as TrafficIcon,
  Refresh         as RefreshIcon,
  ContentCopy     as CopyIcon,
} from "@mui/icons-material";
import {getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";
import {Link as RouterLink} from "react-router-dom";
import {Line} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Filler);

function StatBox({label, value}) {
  return (
    <Box textAlign="center">
      <Typography variant="h6" fontWeight={800}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

function CopyField({label, value}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" p={1.25} mb={1}
      sx={{bgcolor: "rgba(255,255,255,0.04)", borderRadius: 1.5, border: "1px solid rgba(255,255,255,0.1)"}}>
      <Box minWidth={0}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">{label}</Typography>
        <Typography variant="body2" sx={{fontFamily: "monospace", fontSize: 12, wordBreak: "break-all"}}>{value}</Typography>
      </Box>
      <Button size="small" onClick={copy} startIcon={<CopyIcon fontSize="small" />} sx={{ml: 1, minWidth: 80, flexShrink: 0}}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </Box>
  );
}

// status: loading | unverified | pending | verified | error
export default function SearchConsoleTraffic({domain, brandColor}) {
  const functions = getFunctions(getApp(), "us-central1");
  const [status, setStatus]   = useState("loading");
  const [traffic, setTraffic] = useState(null);
  const [txtRecord, setTxtRecord] = useState(null);
  const [pendingMessage, setPendingMessage] = useState("");
  const [error, setError]     = useState("");
  const [verifying, setVerifying] = useState(false);

  const loadTraffic = useCallback(async () => {
    try {
      const get = httpsCallable(functions, "getSearchConsoleTraffic");
      const res = await get();
      setTraffic(res.data);
      setStatus("verified");
    } catch (err) {
      if (/not_verified/.test(err.message)) {
        setStatus("unverified");
      } else {
        setError(err.message || "Couldn't load traffic data.");
        setStatus("error");
      }
    }
  }, [functions]);

  useEffect(() => { loadTraffic(); }, [loadTraffic]);

  const handleEnable = async () => {
    setVerifying(true);
    setError("");
    try {
      const verify = httpsCallable(functions, "verifyDomainForSearchConsole");
      const res = await verify();
      if (res.data.verified) {
        await loadTraffic();
      } else {
        setStatus("pending");
        setTxtRecord(res.data.txtRecord);
        setPendingMessage(res.data.message);
      }
    } catch (err) {
      setError(err.message || "Couldn't start verification.");
      setStatus("error");
    } finally {
      setVerifying(false);
    }
  };

  const chartData = traffic && {
    labels: traffic.rows.map(r => new Date(r.date).toLocaleDateString("en-GB", {day: "numeric", month: "short"})),
    datasets: [{
      label: "Clicks",
      data: traffic.rows.map(r => r.clicks),
      borderColor: brandColor,
      backgroundColor: `${brandColor}22`,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
    }],
  };

  return (
    <Paper sx={{p: 3, borderRadius: 3, bgcolor: "rgba(255,255,255,0.04)", mb: 3}}>
      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
        <TrafficIcon sx={{color: brandColor}} />
        <Typography variant="subtitle1" fontWeight={800}>Search Traffic</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Real search clicks and impressions for {domain}, via Bookrightly's Google Search Console connection.
      </Typography>

      {error && <Alert severity="error" sx={{mb: 2}} onClose={() => setError("")}>{error}</Alert>}

      {status === "loading" && (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress size={22} /></Box>
      )}

      {status === "unverified" && (
        <Box textAlign="center" py={2}>
          <Button
            variant="outlined"
            startIcon={verifying ? <CircularProgress size={16} /> : <TrafficIcon fontSize="small" />}
            disabled={verifying}
            onClick={handleEnable}
            sx={{borderColor: brandColor, color: brandColor, fontWeight: 700}}
          >
            {verifying ? "Enabling…" : "Enable Search Traffic"}
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            One click — we verify {domain} with Google on your behalf. No Google account of your own needed.
          </Typography>
        </Box>
      )}

      {status === "pending" && (
        <Box py={1}>
          <Alert severity="info" sx={{mb: 2}}>{pendingMessage}</Alert>
          {txtRecord && (
            <>
              <CopyField label="TXT record name" value={txtRecord.name} />
              <CopyField label="TXT record value" value={txtRecord.value} />
            </>
          )}
          <Button
            fullWidth variant="contained" size="small"
            onClick={handleEnable}
            disabled={verifying}
            startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon fontSize="small" />}
            sx={{mt: 1, bgcolor: brandColor, fontWeight: 700}}
          >
            {verifying ? "Checking…" : "I've added it — verify now"}
          </Button>
        </Box>
      )}

      {status === "error" && (
        <Box textAlign="center" py={2}>
          <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={loadTraffic}>Try again</Button>
        </Box>
      )}

      {status === "verified" && traffic && (
        <>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6} sm={3}><StatBox label="Clicks" value={traffic.totals.clicks.toLocaleString()} /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="Impressions" value={traffic.totals.impressions.toLocaleString()} /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="Avg CTR" value={`${(traffic.totals.ctr * 100).toFixed(1)}%`} /></Grid>
            <Grid item xs={6} sm={3}><StatBox label="Avg position" value={traffic.totals.position.toFixed(1)} /></Grid>
          </Grid>

          {chartData && traffic.rows.length > 0 ? (
            <Box height={180}>
              <Line
                data={chartData}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {legend: {display: false}},
                  scales: {
                    x: {ticks: {maxTicksLimit: 6, font: {size: 10}}, grid: {display: false}},
                    y: {beginAtZero: true, ticks: {font: {size: 10}}},
                  },
                }}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              No search data yet for this period — check back in a few days.
            </Typography>
          )}

          <Divider sx={{my: 2}} />
          <Typography variant="caption" color="text.secondary">
            {traffic.startDate} to {traffic.endDate} · want to know what to do with this?{" "}
            <RouterLink to="/starter-pack" style={{color: brandColor, fontWeight: 700}}>
              Free Business Starter Pack
            </RouterLink>
          </Typography>
        </>
      )}
    </Paper>
  );
}
