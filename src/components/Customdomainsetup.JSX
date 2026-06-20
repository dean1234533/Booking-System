import { useState, useEffect, useCallback, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

// ─── useDomainPoller Hook ──────────────────────────────────────────────────
// Polls your backend every N seconds until domain + SSL are both active.
export function useDomainPoller({ cfHostnameId, enabled, intervalMs = 10000 }) {
  const [status, setStatus] = useState({
    domainStatus: "pending",
    sslStatus: "initializing",
    isVerified: false,
    sslReady: false,
    isLive: false,
    error: null,
    attempts: 0,
  });

  const timerRef = useRef(null);
  const functions = getFunctions();
  const checkDomainStatus = httpsCallable(functions, "checkDomainStatus");

  const poll = useCallback(async () => {
    if (!cfHostnameId || !enabled) return;

    try {
      const result = await checkDomainStatus({ cfHostnameId });
      const data = result.data;

      setStatus((prev) => ({
        ...prev,
        ...data,
        error: null,
        attempts: prev.attempts + 1,
      }));

      // Stop polling once fully live
      if (data.isLive) {
        clearInterval(timerRef.current);
      }
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: err.message,
        attempts: prev.attempts + 1,
      }));
    }
  }, [cfHostnameId, enabled]);

  useEffect(() => {
    if (!enabled || !cfHostnameId) return;

    poll(); // immediate first check
    timerRef.current = setInterval(poll, intervalMs);

    return () => clearInterval(timerRef.current);
  }, [enabled, cfHostnameId, intervalMs, poll]);

  return status;
}

// ─── CopyButton ────────────────────────────────────────────────────────────
function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} style={styles.copyBtn}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ─── StatusBadge ───────────────────────────────────────────────────────────
function StatusBadge({ label, status }) {
  const colors = {
    active: { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
    pending: { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
    initializing: { bg: "#e0f2fe", text: "#0369a1", dot: "#0ea5e9" },
    pending_validation: { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
    pending_issuance: { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
    error: { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  };

  const c = colors[status] || colors.pending;

  return (
    <span style={{ ...styles.badge, backgroundColor: c.bg, color: c.text }}>
      <span style={{ ...styles.badgeDot, backgroundColor: c.dot }} />
      {label}: {status}
    </span>
  );
}

// ─── DNSRecordRow ──────────────────────────────────────────────────────────
function DNSRecordRow({ record }) {
  return (
    <div style={styles.recordRow}>
      <span style={styles.recordType(record.type)}>{record.type}</span>
      <div style={styles.recordFields}>
        <div style={styles.fieldGroup}>
          <span style={styles.fieldLabel}>Name</span>
          <div style={styles.fieldValue}>
            <code style={styles.code}>{record.name}</code>
            <CopyButton value={record.name} />
          </div>
        </div>
        <div style={styles.fieldGroup}>
          <span style={styles.fieldLabel}>Value</span>
          <div style={styles.fieldValue}>
            <code style={styles.code}>{record.value}</code>
            <CopyButton value={record.value} />
          </div>
        </div>
        <div style={styles.fieldGroup}>
          <span style={styles.fieldLabel}>TTL</span>
          <span style={{ fontSize: 13, color: "#64748b" }}>{record.ttl}</span>
        </div>
      </div>
      <p style={styles.recordDesc}>{record.description}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CustomDomainSetup() {
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [setupData, setSetupData] = useState(null); // { cfHostnameId, domain, dnsRecords }
  const [step, setStep] = useState(1); // 1=enter domain, 2=add DNS, 3=live
  const [submitError, setSubmitError] = useState(null);

  const functions = getFunctions();
  const addCustomDomain = httpsCallable(functions, "addCustomDomain");

  // Only poll once user has submitted their domain
  const pollStatus = useDomainPoller({
    cfHostnameId: setupData?.cfHostnameId,
    enabled: step === 2,
    intervalMs: 12000,
  });

  // Move to step 3 once live
  useEffect(() => {
    if (pollStatus.isLive && step === 2) setStep(3);
  }, [pollStatus.isLive, step]);

  const handleSubmit = async () => {
    if (!domain.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await addCustomDomain({ domain: domain.trim() });
      setSetupData(result.data);
      setStep(2);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <h2 style={styles.title}>Custom Domain Setup</h2>
          <p style={styles.subtitle}>Connect your own domain to your site</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div style={styles.steps}>
        {["Enter Domain", "Add DNS Records", "Live"].map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} style={styles.stepItem}>
              <div style={styles.stepCircle(isActive, isDone)}>
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span style={styles.stepLabel(isActive)}>{label}</span>
              {i < 2 && <div style={styles.stepLine(isDone)} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Enter Domain ── */}
      {step === 1 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Your Custom Domain</h3>
          <p style={styles.cardDesc}>
            Enter the domain you want to connect. Make sure you have access to your domain's DNS settings.
          </p>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="client-site.com"
              style={styles.input}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !domain.trim()}
              style={styles.primaryBtn(submitting || !domain.trim())}
            >
              {submitting ? "Connecting…" : "Connect Domain"}
            </button>
          </div>
          {submitError && <p style={styles.errorText}>{submitError}</p>}
        </div>
      )}

      {/* ── Step 2: Add DNS Records ── */}
      {step === 2 && setupData && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardTitleRow}>
              <h3 style={styles.cardTitle}>Add These DNS Records</h3>
              <div style={styles.pollingBadge}>
                <span style={styles.pulsingDot} />
                Checking every 12s
              </div>
            </div>
            <p style={styles.cardDesc}>
              Log into your domain registrar (GoDaddy, Namecheap, etc.) and add both records below. DNS changes can take up to 48 hours, but usually propagate within minutes.
            </p>

            <div style={styles.recordsList}>
              {setupData.dnsRecords.map((record, i) => (
                <DNSRecordRow key={i} record={record} />
              ))}
            </div>
          </div>

          {/* Live Status Panel */}
          <div style={styles.statusPanel}>
            <h4 style={styles.statusTitle}>Verification Status</h4>
            <div style={styles.statusBadges}>
              <StatusBadge label="Domain" status={pollStatus.domainStatus} />
              <StatusBadge label="SSL" status={pollStatus.sslStatus} />
            </div>
            <p style={styles.statusHint}>
              Checked {pollStatus.attempts} time{pollStatus.attempts !== 1 ? "s" : ""}.
              {pollStatus.error && <span style={{ color: "#ef4444" }}> Error: {pollStatus.error}</span>}
            </p>

            {/* SSL explanation */}
            <div style={styles.sslInfo}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span style={styles.sslInfoText}>
                SSL certificate is automatically provisioned by Cloudflare once your domain verification is confirmed. No manual steps needed.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Live! ── */}
      {step === 3 && (
        <div style={styles.successCard}>
          <div style={styles.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={styles.successTitle}>Your Domain is Live! 🎉</h3>
          <p style={styles.successDesc}>
            <strong>{setupData?.domain}</strong> is now connected, verified, and secured with HTTPS.
          </p>
          <a
            href={`https://${setupData?.domain}`}
            target="_blank"
            rel="noreferrer"
            style={styles.visitBtn}
          >
            Visit Your Site →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    maxWidth: 680,
    margin: "0 auto",
    padding: "24px 16px",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  subtitle: { margin: "2px 0 0", fontSize: 14, color: "#64748b" },

  steps: {
    display: "flex",
    alignItems: "center",
    marginBottom: 28,
    gap: 0,
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  stepCircle: (active, done) => ({
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    background: done ? "#22c55e" : active ? "#2563eb" : "#e2e8f0",
    color: done || active ? "white" : "#94a3b8",
    transition: "all 0.3s",
  }),
  stepLabel: (active) => ({
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? "#0f172a" : "#94a3b8",
    whiteSpace: "nowrap",
  }),
  stepLine: (done) => ({
    flex: 1,
    height: 2,
    background: done ? "#22c55e" : "#e2e8f0",
    margin: "0 8px",
    transition: "background 0.3s",
  }),

  card: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "24px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 8,
  },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 700 },
  cardDesc: { margin: "4px 0 20px", fontSize: 14, color: "#64748b", lineHeight: 1.6 },

  inputRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: 200,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
    fontFamily: "monospace",
    color: "#0f172a",
  },
  primaryBtn: (disabled) => ({
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: disabled ? "#e2e8f0" : "#2563eb",
    color: disabled ? "#94a3b8" : "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s",
  }),
  errorText: { margin: "10px 0 0", fontSize: 13, color: "#ef4444" },

  recordsList: { display: "flex", flexDirection: "column", gap: 12 },
  recordRow: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px",
  },
  recordType: (type) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    marginBottom: 10,
    background: type === "CNAME" ? "#dbeafe" : "#f3e8ff",
    color: type === "CNAME" ? "#1d4ed8" : "#7c3aed",
  }),
  recordFields: { display: "flex", flexDirection: "column", gap: 8 },
  fieldGroup: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    width: 40,
    flexShrink: 0,
  },
  fieldValue: { display: "flex", alignItems: "center", gap: 6, flex: 1 },
  code: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#0f172a",
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: "2px 8px",
    wordBreak: "break-all",
  },
  copyBtn: {
    border: "none",
    background: "white",
    borderRadius: 6,
    padding: "4px 6px",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    border: "1px solid #e2e8f0",
  },
  recordDesc: { margin: "10px 0 0", fontSize: 12, color: "#94a3b8" },

  pollingBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#0369a1",
    background: "#e0f2fe",
    padding: "4px 10px",
    borderRadius: 20,
    fontWeight: 500,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#0ea5e9",
    display: "inline-block",
    animation: "pulse 1.5s infinite",
  },

  statusPanel: {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  statusTitle: { margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" },
  statusBadges: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  badgeDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  statusHint: { margin: "0 0 14px", fontSize: 12, color: "#94a3b8" },
  sslInfo: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "#e0f2fe",
    borderRadius: 10,
    padding: "12px 14px",
  },
  sslInfoText: { fontSize: 13, color: "#0369a1", lineHeight: 1.5 },

  successCard: {
    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
    border: "1px solid #bbf7d0",
    borderRadius: 20,
    padding: "40px 24px",
    textAlign: "center",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
  },
  successTitle: { margin: "0 0 10px", fontSize: 22, fontWeight: 700, color: "#15803d" },
  successDesc: { margin: "0 0 24px", fontSize: 15, color: "#166534", lineHeight: 1.6 },
  visitBtn: {
    display: "inline-block",
    padding: "12px 28px",
    background: "#22c55e",
    color: "white",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none",
    boxShadow: "0 4px 14px rgba(34,197,94,0.35)",
  },
};