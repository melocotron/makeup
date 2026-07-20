import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "playwright-report", "test-results"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/server/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test/shims/server-only.ts"),
    },
  },
});
