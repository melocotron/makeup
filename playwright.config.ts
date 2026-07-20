import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Requisitos previos:
 *   1. Base de datos levantada: `npm run db:up`
 *   2. Migraciones aplicadas:   `npm run db:migrate:deploy` (o `db:migrate` en dev)
 *   3. Seed aplicado:           `npm run db:seed`
 *
 * El webServer abajo solo arranca `next dev`; la base de datos debe estar
 * ya preparada por el operador (no asumimos Docker dentro del test).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
