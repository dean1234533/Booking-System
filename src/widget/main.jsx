import React from "react";
import ReactDOM from "react-dom/client";
import WidgetApp from "./App.jsx";
import QueueApp from "./QueueApp.jsx";
// ?inline gets the compiled CSS as a plain string at build time, so it can
// be injected straight into the shadow root — the whole widget ships as one
// script with nothing else for the embedding site to load or reference.
import widgetCss from "./widget.css?inline";

// Must run synchronously at the top of the script — document.currentScript
// is only valid for the duration of the initial script execution (including
// for `async` scripts, but not after any await/setTimeout/etc.), so this has
// to be captured before anything else runs.
const thisScript = document.currentScript;
const shopId = thisScript?.getAttribute("data-shop");
// "booking" (default) or "queue" — every customer-facing dashboard tool gets
// its own mode here rather than its own separate script, so a business only
// ever needs one script tag per tool, all sharing this same loader/mount
// infrastructure (Shadow DOM isolation, CORS, build pipeline).
const mode = thisScript?.getAttribute("data-mode") || "booking";
const WIDGET_APPS = { booking: WidgetApp, queue: QueueApp };

function mount() {
  if (!shopId) {
    console.error("[Bookrightly widget] Missing data-shop attribute on the <script> tag.");
    return;
  }
  const App = WIDGET_APPS[mode];
  if (!App) {
    console.error(`[Bookrightly widget] Unknown data-mode "${mode}" — expected "booking" or "queue".`);
    return;
  }

  // Mode-specific default id so a business can embed both the booking and
  // queue widgets on the same page without one's auto-created div colliding
  // with the other's. A site owner can still place their own
  // <div id="bookrightly-widget-booking"> (or -queue) by hand if they want
  // to control exactly where it lands.
  const hostId = `bookrightly-widget-${mode}`;
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    thisScript.insertAdjacentElement("afterend", host);
  }

  // Shadow DOM keeps the host page's CSS from leaking in (a WordPress theme's
  // global styles) and keeps this widget's own styles from leaking out —
  // no iframe needed, and nothing here touches frame/CSP security headers.
  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = widgetCss;
  shadowRoot.appendChild(style);

  const mountPoint = document.createElement("div");
  shadowRoot.appendChild(mountPoint);

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <App shopId={shopId} />
    </React.StrictMode>
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
