import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for PEG (Patient Education Genius).
 *
 * Usage:
 *   pnpm test:e2e          – run all E2E tests
 *   pnpm test:e2e:ui       – open Playwright UI mode
 *   pnpm test:e2e:headed   – run tests in headed browser
 *
 * Environment:
 *   Tests run against a local Next.js dev server started automatically.
 *   Set E2E_BASE_URL to skip the dev server and test against a deployed URL.
 */

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    // ── Setup: authenticate once, reuse session across tests ──
    { name: "setup", testMatch: /global-setup\.ts/ },

    // ── Desktop Chrome ──
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },

    // ── Mobile Safari (optional, enable when ready) ──
    // {
    //   name: "mobile-safari",
    //   use: { ...devices["iPhone 14"] },
    //   dependencies: ["setup"],
    // },
  ],

  // Start the dev server automatically unless E2E_BASE_URL is set
  ...(!process.env.E2E_BASE_URL && {
    webServer: {
      command: "pnpm dev",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
