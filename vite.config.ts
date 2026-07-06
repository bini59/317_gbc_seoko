import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

// CSR SPA build. Output goes to dist/ (deploy this folder to Cloudflare Pages).
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  base: "./",
  build: {
    outDir: "dist",
  },
});