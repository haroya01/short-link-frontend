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
      // Skip the no-backend fixture suites (visual snapshots + fixture-level a11y) from the
      // default project — they have their own dedicated "visual" project so the no-backend CI
      // workflow can run them without booting Spring + DB.
      testIgnore: /(visual|a11y-fixtures)\./,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // No-backend fixture project — runs both visual snapshots ({@code visual.spec.ts}) and
      // component-level a11y ({@code a11y-fixtures.spec.ts}) against the static fixture pages
      // under {@code /visual-fixtures/}. Pinned to Desktop Chrome 1280×800 +
      // deviceScaleFactor 1 so screenshots are deterministic across machines.
      // {@code snapshotPathTemplate} drops Playwright's default {@code -<platform>} suffix so
      // the same baseline file is used on macOS dev and Linux CI.
      name: "visual",
      testMatch: /(visual|a11y-fixtures)\./,
      snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
