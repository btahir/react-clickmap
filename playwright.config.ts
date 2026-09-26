import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  use: { baseURL: "http://localhost:4312", trace: "off" },
  reporter: "list",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "pnpm --filter @react-clickmap/docs start --port 4312",
    url: "http://localhost:4312",
    reuseExistingServer: true,
  },
});
