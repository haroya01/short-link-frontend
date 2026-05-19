import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * /demo page artifact + structural assertions.
 *
 * /demo renders the dashboard's {@code /stats/[code]} surface (Header + StatsCards + 5 tabs)
 * against synthetic data, so the tests here focus on the dashboard chrome — same Header, same
 * tab pills, heatmap fills with accent cells, no horizontal overflow on phones.
 *
 * Visual drift is captured as PNG artifacts under {@code test-results/demo/<viewport>/} so
 * reviewers can scrub the full page across iPhone 13 / iPhone 11 Pro Max / laptop / desktop
 * without booting the dashboard themselves.
 */

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: "iphone-13", width: 375, height: 812 },
  { name: "iphone-11-pro-max", width: 414, height: 896 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "desktop", width: 1920, height: 1080 },
];

test.describe("demo page artifacts", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — /demo full-page screenshot + tab walk`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/ko/demo", { waitUntil: "networkidle" });

      const outDir = path.join("test-results", "demo", vp.name);

      // Full-page first — one tall PNG is the most useful artifact at a glance.
      await page.screenshot({
        path: path.join(outDir, "00-full-page-overview.png"),
        fullPage: true,
        animations: "disabled",
      });

      // Walk each tab and capture a full-page PNG so reviewers can see Traffic / Sources /
      // Audience / Settings the same way they would on the real /stats/[code] page.
      for (const tab of ["traffic", "sources", "audience", "settings"] as const) {
        const button = page.getByRole("tab", { name: new RegExp(tab, "i") });
        if ((await button.count()) === 0) continue;
        await button.first().click();
        await page.waitForTimeout(200);
        await page.screenshot({
          path: path.join(outDir, `tab-${tab}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }

      // Horizontal-overflow guarantee — fail loudly if the dashboard chrome blew the phone
      // viewport. The heatmap row uses `min-w-[640px]` inside an overflow-x-auto so the page
      // itself must stay flush.
      await page.locator('[role="tab"]', { hasText: /overview|개요/i }).first().click();
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }

  /**
   * Structural assertions — these catch the exact "히트맵 비어있다" regression from earlier
   * /demo previews. Visual drift stays in the artifact PNGs above; these tests fail loudly
   * when the chart machinery is wired up wrong.
   */
  test("heatmap renders accent cells (not all empty)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    // Heatmap lives under the Overview tab on the dashboard's StatsBody, and Overview is the
    // initial tab so no click needed. Locate the heatmap by its 168 button cells.
    const cells = page.locator("button[aria-label]").filter({ hasNot: page.locator('[role="tab"]') });
    // The dashboard chrome has a Copy + QR button on the Header — they also match
    // button[aria-label], so the 168-cell expectation is "≥ 168", not exactly 168. Heatmap
    // tooltip aria-label format is `{day} {hour}시 — {count}회` (ko) / `{day} {hour}h — {count} clicks` (en),
    // so the "시 —" infix is the locale-safe needle that hits every cell on /ko/demo.
    const heatmapCells = page.locator('button[aria-label*="시 —"]');
    const total = await heatmapCells.count();
    expect(total).toBeGreaterThanOrEqual(168);
    const accentSelectors = [
      "button.bg-accent-50",
      "button.bg-accent-100",
      "button.bg-accent-300",
      "button.bg-accent-500",
      "button.bg-accent-600",
      "button.bg-accent-700",
    ];
    let accentCount = 0;
    for (const sel of accentSelectors) {
      accentCount += await page.locator(sel).count();
    }
    // ≥ 40 — enough to read as a filled grid, lenient enough that small data tweaks don't
    // flake. The actual count for the seeded distribution sits around 110+.
    expect(accentCount).toBeGreaterThanOrEqual(40);
    expect(cells.count()).resolves.toBeGreaterThan(0);
  });

  test("country table shows up under the Traffic tab", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /traffic|트래픽/i }).first().click();
    // {@code stats.section.country.title} = "국가" on ko; the dashboard's TrafficTab renders the
    // CountryTable inside a Section keyed on this exact title.
    const countrySection = page.locator('section:has-text("국가")').first();
    await countrySection.scrollIntoViewIfNeeded();
    const rows = countrySection.locator("tbody tr");
    // Demo data ships 8 countries. If the renderer or fixture drifts this fails fast.
    expect(await rows.count()).toBeGreaterThanOrEqual(5);
  });

  test("sample banner is visible above the dashboard mirror", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    await expect(page.getByText("샘플 데이터입니다", { exact: false })).toBeVisible();
  });

  test("all 5 stats tabs render (Overview / Traffic / Sources / Audience / Settings)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    for (const label of ["개요", "트래픽", "유입", "방문자", "설정"]) {
      const tab = page.getByRole("tab", { name: label });
      await expect(tab).toBeVisible();
    }
  });

  test("Audience tab renders region + city + language + bot + ASN sections (100% mirror)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "방문자" }).click();
    // Section titles in ko — pulled from messages/ko.json stats.section.*
    for (const title of ["지역", "도시", "언어", "봇 종류", "네트워크 / ASN"]) {
      const section = page.locator(`section:has-text("${title}")`).first();
      await expect(section).toBeVisible();
    }
    // Region + city must show the leading KR metro entry, not be empty.
    const regionSection = page.locator('section:has-text("지역")').first();
    await expect(regionSection).toContainText("Seoul");
    const citySection = page.locator('section:has-text("도시")').first();
    await expect(citySection).toContainText("Seoul");
  });

  test("Settings tab demo shows A/B + Webhook preview with disabled controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/demo", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "설정" }).click();

    // A/B destinations mirror — title + sample rows visible
    const destSection = page.locator('section:has-text("A/B")').first();
    await expect(destSection).toBeVisible();
    await expect(destSection).toContainText("variant-A");
    await expect(destSection).toContainText("variant-B");

    // Webhooks mirror — title + sample row visible
    const webhookSection = page.locator('section:has-text("웹훅")').first();
    await expect(webhookSection).toBeVisible();
    await expect(webhookSection).toContainText("slack-#alerts");
    await expect(webhookSection).toContainText("X-Kurl-Signature");

    // Controls disabled — the "추가" (Add) and "등록" (Register) submit buttons
    const addButton = destSection.getByRole("button", { name: "추가" });
    await expect(addButton).toBeDisabled();
    const registerButton = webhookSection.getByRole("button", { name: "등록" });
    await expect(registerButton).toBeDisabled();
  });
});
