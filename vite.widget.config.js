import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Separate build for the embeddable booking widget (src/widget/) — a
// customer pastes <script src="https://bookrightly.co.uk/widget.js"
// data-shop="..."> into their own external site, so this has to build to a
// single, dependency-free, IIFE-format file (no ES module imports the host
// page would need to resolve, no chunk splitting to fetch separately).
// Deliberately excludes MUI/react-router — see src/widget/App.jsx.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "public",
    emptyOutDir: false,
    // Rebuilding widget.js during dev via `vite build --watch` would race
    // with the main app's own asset writes into public/ — only ever build
    // this as an explicit, separate step (see package.json's deploy script).
    rollupOptions: {
      input: "src/widget/main.jsx",
      output: {
        format: "iife",
        entryFileNames: "widget.js",
        // No separate chunks or CSS file — everything (including the CSS,
        // via the ?inline import in main.jsx) ships inside this one file.
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
  },
});
