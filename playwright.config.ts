import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Headless Chromium advertises "HeadlessChrome", which our analytics (correctly) treats as a bot.
const REAL_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://bekusegar:bekusegar_dev@localhost:5432/bekusegar_e2e";
const env = {
  DATABASE_URL: E2E_DB,
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "admin-dev-password-1",
  STORAGE_DRIVER: "local",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], userAgent: REAL_UA, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", userAgent: devices["iPhone 13"].userAgent, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" } }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx tsx e2e/reset-db.ts && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env,
  },
});
