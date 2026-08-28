import React from "react";
import ReactDOM from "react-dom/client";
import './styles/index.css';
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Reload when a *new* SW takes control (update), but not on the very first install.
// skipWaiting+clientsClaim would otherwise cause a double-load on every fresh visit.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

// Self-heal against a known Cloudflare edge-cache anomaly: some entry documents
// (e.g. "/", "/signup") can intermittently be served stale from a PoP that still
// has a pre-fix CSP header cached, which then blocks Firebase Cloud Function
// calls (e.g. claimBookingSlug) for the rest of this page's life — CSP is fixed
// at the document response and doesn't update on client-side route changes, so
// a user can land on /signup stale and be stuck all the way through /onboarding
// with no way to recover. Detect a stale CSP once per real page load and force
// a genuine reload — a fresh network request has a good chance of landing on a
// different, correct PoP — instead of leaving the user silently stuck.
(function selfHealStaleCsp() {
  const KEY = "br_csp_selfheal_v1";
  try {
    if (sessionStorage.getItem(KEY)) return;
  } catch {
    return;
  }
  fetch(window.location.href, { cache: "no-store" })
    .then((res) => {
      const csp = res.headers.get("content-security-policy") || "";
      const fresh = csp.includes("cloudfunctions.net") || csp.includes("a.run.app");
      if (!fresh) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
      }
    })
    .catch(() => {});
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);