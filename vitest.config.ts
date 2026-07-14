import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // 파일별 // @vitest-environment 주석으로 jsdom 오버라이드 (UI 테스트)
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
