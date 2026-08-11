import React from "react";
import ReactDOM from "react-dom/client";
import './styles/index.css';
import App from "./App.jsx";

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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);