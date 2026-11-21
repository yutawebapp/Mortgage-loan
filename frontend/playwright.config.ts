import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "../tmp/playwright-results",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:3000", browserName: "chromium", channel: "chromium" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
