import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_URL || "http://127.0.0.1:3000",
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
