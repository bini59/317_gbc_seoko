import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

// CSR SPA + Cloudflare Worker(Hono API + D1). `vite dev`/`vite build` 모두
// @cloudflare/vite-plugin이 wrangler.jsonc 기준으로 worker/index.ts를 함께 번들링합니다.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  base: "./",
  build: {
    outDir: "dist",
  },
});
