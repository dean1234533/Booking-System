import React from "react";
import ReactDOM from "react-dom/client";
import './styles/index.css';
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Microsoft Clarity — session recordings/heatmaps. Same reasoning as the
// SourceForge badge in Footer.jsx: this app's CSP has no 'unsafe-inline' on
// script-src, so Clarity's own snippet (a literal inline <script> body)
// would need its own sha256 hash added there. Reproducing the same effect
// from here instead — a 'self'-origin script (already allowed) creating the
// actual <script src="https://www.clarity.ms/tag/..."> tag — only needs
// that external src's origin allowlisted, not a content hash for this
// exact snippet. The window.clarity queueing shim is preserved so any
// clarity(...) call made before the real script finishes loading still
// queues correctly instead of erroring.
(function (c, l, a, r, i, t, y) {
  c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
  t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "ydk8wxti4d");

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

  // The browser only checks whether sw-v3.js has changed on a fresh
  // navigation — an installed PWA that's just left open (never closed and
  // reopened, no full page reload) never triggers that check on its own, so
  // it can sit on a stale build indefinitely even though the new service
  // worker (skipWaiting + clientsClaim above) would activate and reload
  // immediately once the browser actually looks. Prompt that check
  // ourselves: once on load, then whenever the app regains focus after
  // being backgrounded (switching back in from another app is the most
  // common "reopen" moment on mobile) and on a slow background interval as
  // a fallback for a session left open and foregrounded the whole time.
  navigator.serviceWorker.ready.then((registration) => {
    registration.update().catch(() => {});
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registration.update().catch(() => {});
    });
    setInterval(() => registration.update().catch(() => {}), 5 * 60 * 1000);
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