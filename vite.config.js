import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    port: 5173, // Standard Vite port
    proxy: {
      // ✅ Redirects frontend /api calls to your backend server
      // Change 3000 to 5000 if your Node server is running on 5000
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        // Optional: rewriting the path if your backend doesn't expect "/api"
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // ✅ Keep rollupOptions clean. 
    // If you have to 'external' fs or path, you have a logic error in your /src files.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
  // ✅ Pre-bundling these helps MUI load faster in development
  optimizeDeps: {
    include: [
      "@mui/material",
      "@mui/icons-material",
      "@emotion/react",
      "@emotion/styled",
      "@stripe/stripe-js",
      "@stripe/react-stripe-js"
    ],
  },
});