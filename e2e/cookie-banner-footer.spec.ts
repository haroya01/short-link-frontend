import { test, expect } from "@playwright/test";

/**
 * The cookie banner must never sit on top of the footer links. It's a fixed bar at the viewport
 * bottom and the footer's link row is the last thing on the page, so without reserved space the two
 * land in the same band and 서비스 소개 · 요금제 · 이용약관 · 개인정보처리방침 · GitHub become
 * unclickable — reported, and previously true on every sm+ viewport because the desktop branch of
 * the reserve rule was `padding-bottom: 0`.
 *
 * Asserted by hit-testing rather than by reading CSS: what matters is whether a real click reaches
 * the link, not which rule produced the spacing.
 */
test.describe("cookie banner vs footer", () => {
  for (const width of [1440, 2560]) {
    test(`footer links stay clickable while the banner is up (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/ko");

      // The banner is server-rendered for a first-time visitor; make sure we're in that state.
      await expect(page.locator("[data-cc-banner]")).toBeVisible({ timeout: 15_000 });

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600); // settle sticky/scroll-driven chrome

      const blocked = await page.evaluate(() => {
        const links = [...document.querySelectorAll("footer a")];
        return links
          .map((a) => {
            const r = a.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return null; // not rendered at this width
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return top === a || a.contains(top) ? null : (a.textContent ?? "").trim();
          })
          .filter(Boolean);
      });

      expect(blocked, `covered footer links: ${blocked.join(", ")}`).toEqual([]);
    });
  }

  /**
   * The QR campaigns page floats a "QR 만들기" CTA in the same bottom-right corner as the banner.
   * With a fixed offset it covered the banner's 확인 button outright — the consent bar could not be
   * dismissed on that page at all. The CTA now rides --fab-bottom, which lifts with the banner.
   */
  test("the QR page's floating CTA never covers the banner's own buttons", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ko/qr-campaigns");
    const banner = page.locator("[data-cc-banner]");
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500); // the CTA fades in on a delay

    const blocked = await page.evaluate(() => {
      const bar = document.querySelector("[data-cc-banner]");
      return [...(bar?.querySelectorAll("button, a") ?? [])]
        .map((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return null;
          const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return top === el || el.contains(top) ? null : (el.textContent ?? "").trim();
        })
        .filter(Boolean);
    });

    expect(blocked, `covered banner controls: ${blocked.join(", ")}`).toEqual([]);
  });
});
