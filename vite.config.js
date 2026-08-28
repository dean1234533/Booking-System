import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      // Renamed from sw.js after Cloudflare got a pre-fix copy of that exact
      // URL stuck in edge cache indefinitely (a purged/bypassed cache still
      // doesn't evict what's already stored) — every browser's update-check
      // kept comparing against that same frozen response, so no fix could
      // ever reach anyone. A URL Cloudflare has never cached is guaranteed a
      // clean fetch. Also inline the registration script (below) instead of
      // vite-plugin-pwa's default separate registerSW.js file, since that
      // file hit the exact same stuck-cache problem — index.html itself is
      // already reliably no-store, so inlining removes the risk entirely.
      filename: "sw-v3.js",
      injectRegister: "inline",
      registerType: "autoUpdate",
      injectManifest: {
        // Deliberately excludes html: precaching index.html lets Workbox's
        // precache route (registered first, matches by exact URL) win over
        // sw.js's own NavigationRoute(NetworkFirst) for every document
        // request — freezing returning visitors onto whatever HTML/CSP/
        // headers existed at their last service-worker install, silently,
        // forever, regardless of how many times the site is redeployed.
        // The NavigationRoute already in sw.js is solely responsible for
        // documents; this only precaches genuinely static, content-hashed
        // assets where CacheFirst-via-precache is actually correct.
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2,jpg,jpeg}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ["images/**"],
      manifest: {
        name: "Bookrightly",
        short_name: "Bookrightly",
        description: "Bookings, payments and your whole working day — connected in one clear place.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F5F3ED",
        theme_color: "#2563EB",
        icons: [
          {
            src: "/images/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/images/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/images/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            url: "/dashboard",
            description: "Open your dashboard",
          },
          {
            name: "Bookings",
            url: "/dashboard",
            description: "View upcoming bookings",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@emotion/react", "@emotion/styled"],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "@mui/material",
      "@mui/icons-material",
      "@emotion/react",
      "@emotion/styled",
      "@stripe/stripe-js",
      "@stripe/react-stripe-js",
    ],
  },
});
