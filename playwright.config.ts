import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Visual snapshots: small tolerance so font subpixel / anti-alias differences across
    // platforms (macOS dev vs Linux CI) don't flake the suite. 5% accounts for cross-OS font
    // rendering on text-dense fixtures (the Korean glyphs in CONTACT_CARD render slightly
    // differently between Apple SD Gothic and Noto). Tight enough to still catch real layout
    // shifts / color changes / missing elements.
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      // Skip the visual suite from the default project — it has its own dedicated project so
      // visual-only CI runs can target it without booting backend / DB.
      testIgnore: /visual\./,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Visual snapshots — runs against fixture pages under /visual-fixtures/, no backend
      // required. Pinned to Desktop Chrome 1280×800 + deviceScaleFactor 1 so screenshots
      // are deterministic across machines. {@code snapshotPathTemplate} drops Playwright's
      // default {@code -<platform>} suffix so the same baseline file is used on macOS dev
      // and Linux CI — combined with the 2% pixel tolerance + tightly-cropped fixture
      // regions, cross-OS font subpixel rendering stays within budget.
      name: "visual",
      testMatch: /visual\./,
      snapshotPathTemplate:
        "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
