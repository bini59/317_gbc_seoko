import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CSR SPA build. Output goes to dist/ (deploy this folder to Cloudflare Pages).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
  },
});
