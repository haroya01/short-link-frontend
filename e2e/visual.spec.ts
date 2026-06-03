import { expect, test } from "@playwright/test";

/**
 * Visual regression suite. Two flavors:
 *
 * <ol>
 *   <li><b>Static marketing / chrome pages</b> — full-page snapshot of routes that don't need
 *       the backend (home, login, about, …). Catches header/footer/typography regressions and
 *       basic theme drift.</li>
 *   <li><b>Component fixtures under {@code /__visual/<slug>}</b> — each slug renders one
 *       component variant with hardcoded mock data so the snapshot has zero runtime variation
 *       (no API, no current time, no random data). Targets the specific bug class the user has
 *       been surfacing manually for us ("끊긴", logo overflow, broken flip layout, etc.).</li>
 * </ol>
 *
 * <p>Both run in the dedicated "visual" Playwright project (see {@code playwright.config.ts}) —
 * no backend, no DB. Pinned viewport 1280×800 + deviceScaleFactor 1 for cross-machine
 * determinism.
 *
 * <p>Update baselines: {@code npx playwright test e2e/visual.spec.ts --update-snapshots}.
 * Commit the regenerated PNGs under {@code e2e/visual.spec.ts-snapshots/}.
 */

const PAGES = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "about", path: "/about" },
  { name: "pricing", path: "/pricing" },
  { name: "privacy", path: "/privacy" },
  { name: "not-found", path: "/this-path-does-not-exist-zzz" },
];

// Full-page snapshots of static marketing pages — disabled in this PR because no baselines
// exist and macOS-generated baselines diverge from Linux CI on body-text font subpixel render.
// Enable in a follow-up PR by either (a) generating baselines from a Linux container locally,
// or (b) bootstrapping baselines via a manual workflow_dispatch in CI.
test.describe.skip("visual: static pages", () => {
  for (const { name, path } of PAGES) {
    test(`${name} matches snapshot`, async ({ page }) => {
      await page.goto(path);
      const dynamic = page.locator("[data-dynamic],footer time,dl");
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        animations: "disabled",
        mask: [dynamic],
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

// Full-page pixel snapshots of every data-driven blog screen — the tier-3 appearance lock (layout,
// typography scale, spacing, color drift) that complements the deterministic blog-screens.spec.ts.
//
// SKIPPED until activated, in two one-time steps (can't be done from macOS — Linux CI only):
//   1. Build the visual lane mock-ON so these Server-Component screens render with the in-memory mock
//      — set `NEXT_PUBLIC_USE_MOCKS=1` on the build step in .github/workflows/visual.yml.
//   2. Bootstrap baselines: run the "Visual Snapshots" workflow with update_snapshots=true, download
//      the `visual-baselines-linux` artifact, commit the PNGs under e2e/visual.spec.ts-snapshots/.
// Then remove `.skip`. Dynamic regions (images, dates, counts) are masked so only structural drift
// trips the diff; text still renders subtly differently macOS↔Linux, hence Linux-only baselines.
const SCREEN_SNAPSHOTS = [
  { name: "feed-home", path: "/ko/blog" },
  { name: "feed-search", path: "/ko/blog?q=개발" },
  { name: "profile-posts", path: "/ko/p/dohyun" },
  { name: "profile-series", path: "/ko/p/dohyun/series" },
  { name: "profile-about", path: "/ko/p/dohyun/about" },
  { name: "post-reader", path: "/ko/p/dohyun/nextjs-14-app-router-blog" },
  { name: "series-detail", path: "/ko/p/dohyun/series/nextjs-deep-dive" },
] as const;

test.describe.skip("visual: blog screens (mock-on — bootstrap baselines to enable)", () => {
  for (const { name, path } of SCREEN_SNAPSHOTS) {
    test(`screen ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400); // fonts + initial paint settle
      // Mask runtime-variable regions so only layout/typography drift trips the diff.
      const dynamic = page.locator("img, time, [data-dynamic], .tabular-nums, svg");
      await expect(page).toHaveScreenshot(`screen-${name}.png`, {
        fullPage: true,
        animations: "disabled",
        mask: [dynamic],
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

const FIXTURES = [
  "contact-card-amethyst",
  "contact-card-rose-gold",
  "contact-card-emerald",
  "contact-card-midnight",
  "blog-avatars",
] as const;

test.describe("visual: component fixtures", () => {
  for (const slug of FIXTURES) {
    test(`fixture ${slug}`, async ({ page }) => {
      await page.goto(`/ko/visual-fixtures/${slug}`);
      const target = page.getByTestId("fixture");
      await target.waitFor({ state: "visible" });
      // Settle: let fonts + initial paint complete. The contact card has scroll-driven CSS
      // variables — we leave them at rest (no scroll triggered) for deterministic capture.
      await page.waitForTimeout(300);
      // Viewport-level capture (not element-level) so the screenshot dimensions are pinned to
      // 1280×800 by the playwright project config — no boundingClientRect rounding (which gave
      // 400 on macOS / 401 on Linux even with explicit w-[400px], failing toHaveScreenshot's
      // size-must-match-exactly precondition). The fixture renders centered on a white
      // background; the surrounding white pixels are stable across OSes, so the 5% tolerance
      // is effectively focused on the card area itself.
      await expect(page).toHaveScreenshot(`${slug}.png`, {
        animations: "disabled",
        fullPage: false,
      });
    });
  }
});
