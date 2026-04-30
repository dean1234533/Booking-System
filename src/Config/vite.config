import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({ jsxRuntime: "automatic" })],
  optimizeDeps: {
    include: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/x-date-pickers",
      "@emotion/react",
      "@emotion/styled",
    ],
  },
  resolve: {
    alias: {
      "@mui/styled-engine": "@mui/styled-engine",
    },
  },
});