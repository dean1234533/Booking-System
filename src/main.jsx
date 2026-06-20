import React from "react";
import ReactDOM from "react-dom/client";
import './styles/index.css';
import App from "./App.jsx";

// When a newly-deployed service worker takes control, reload once so the latest
// build shows immediately instead of waiting for a manual refresh.
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);