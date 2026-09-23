import { expect, test } from "@playwright/test";
import { MY_PROFILE, mockBackend, signIn } from "./helpers/mock-backend";

/**
 * Regression for the layout collapse that hits when a user has a link with a very long URL on
 * the profile editor: the left column's `1fr` track (= `minmax(auto, 1fr)`) inflated past its
 * fair share, squeezing the 320px preview pane and stretching the theme picker grid horizontally.
 * Fix is `minmax(0, 1fr)` + `min-w-0` on the wrapper.
 *
 * The check: document.documentElement.scrollWidth must not exceed clientWidth at desktop width,
 * because if the left column overflowed, the page-level scrollbar appears.
 */
const LONG_URL =
  "https://www.google.com/search?q=" +
  encodeURIComponent("도쿄 날씨") +
  "&rlz=1C9BKJA_enKR1126KR1126&oq=" +
  encodeURIComponent("도쿄 날씨") +
  "&gs_lcrp=EgZjaHJvbWUyCQgAEEUYORiABDITCAEQLhivARjHARi6AhiABBiOBTIHCAIQABiABDIHCAMQABiABDIHCAQQABiABDIHCAUQABiABDIHCAYQABiABDIHCAcQABiABDIHCAgQABiABDIHCAkQABiABNIBCDE1MTdqMGo0qAITsAIB4gMEGAEgX_EFfll-mPqhJ3M&hl=ja&sourceid=chrome-mobile&ie=UTF-8";

test.describe("profile editor layout — long URLs don't stretch the page", () => {
  test("long original URL in feed does not cause horizontal overflow", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/links/me": (route) =>
        route.fulfill({
          json: {
            items: [
              {
                shortCode: "longURL", shortUrl: "https://kurl.me/longURL", originalUrl: LONG_URL, createdAt: "2026-09-01T00:00:00Z",
                expiresAt: null, clickCount: 0, tags: [], clicksLast7d: [0, 0, 0, 0, 0, 0, 0],
              },
            ],
            hasMore: false,
            nextCursor: null,
          },
        }),
      "GET /api/v1/public/profiles/e2euser": (route) =>
        route.fulfill({
          json: {
            ...MY_PROFILE,
            entries: [
              {
                kind: "LINK", id: 1, shortCode: "longURL", shortUrl: "https://kurl.me/longURL", originalUrl: LONG_URL,
                ogTitle: null, ogImage: null, clickCount: 0, highlighted: false, content: null,
              },
            ],
            publishedPostCount: 0,
          },
        }),
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/settings/profile");
    await expect(page.locator("text=/longURL").first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const html = document.documentElement;
      return { scrollWidth: html.scrollWidth, clientWidth: html.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});
