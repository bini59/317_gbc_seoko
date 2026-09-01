import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

import { cloudflare } from "@cloudflare/vite-plugin";

// CSR SPA + Cloudflare Worker(Hono API + D1). `vite dev`/`vite build` 모두
// @cloudflare/vite-plugin이 wrangler.jsonc 기준으로 worker/index.ts를 함께 번들링합니다.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      manifest: {
        id: "./",
        lang: "ko",
        name: "동인행사 체크리스트",
        short_name: "행사체크",
        description: "동인행사별 참가 서클과 통판 정보를 확인하고 방문 여부를 관리하는 체크리스트",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  base: "./",
  build: {
    outDir: "dist",
  },
});
