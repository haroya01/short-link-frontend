import { expect, test, type Page } from "@playwright/test";

// mock-on 레인: 목 빌드는 @dohyun 으로 로그인해 시작하고, kurl:mock-signed-out 을 심으면 처음 온 방문자가 된다.
const SIGNED_IN: [path: string, tab: string][] = [
  ["/ko/dashboard", "링크"],
  ["/ko/campaigns", "QR 캠페인"],
  ["/ko/events", "모집"],
  ["/ko/analytics", "분석"],
  ["/ko/more", "더보기"],
  ["/ko/settings", "더보기"],
];

const SIGNED_OUT: [path: string, desktopTab: string, phoneTab: string][] = [
  ["/ko/qr-campaigns", "QR 캠페인", "QR 캠페인"],
  ["/ko/events", "모집", "모집"],
  ["/ko/showcase", "프로필 예시", "프로필"],
];

const signOut = (page: Page) =>
  page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));

const headerCurrent = (page: Page) => page.locator("header nav:visible a[aria-current='page']");
const tabBarCurrent = (page: Page) => page.locator("nav.vt-bottom-nav a[aria-current='page']");

test.describe("server HTML of a directly opened page marks its tab", () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, tab] of SIGNED_IN) {
    test(`${path} → ${tab}`, async ({ page }) => {
      await page.goto(path);
      const marked = await page.locator("header a[aria-current='page']").allTextContents();
      expect(marked.length).toBeGreaterThan(0);
      expect(new Set(marked.map((s) => s.trim()))).toEqual(new Set([tab]));
    });
  }

  for (const [path, , phoneTab] of SIGNED_OUT) {
    test(`${path} → ${phoneTab} in the tab bar`, async ({ page }) => {
      await page.goto(path);
      await expect(tabBarCurrent(page)).toHaveText([phoneTab]);
    });
  }
});

test.describe("a directly opened page keeps its tab lit after hydration", () => {
  for (const [path, tab] of SIGNED_IN) {
    test(`desktop ${path} → ${tab}`, async ({ page }) => {
      await page.goto(path);
      await expect(headerCurrent(page)).toHaveText([tab]);
    });

    test(`phone ${path} → ${tab}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await expect(tabBarCurrent(page)).toHaveText([tab]);
    });
  }

  for (const [path, desktopTab, phoneTab] of SIGNED_OUT) {
    test(`signed out desktop ${path} → ${desktopTab}`, async ({ page }) => {
      await signOut(page);
      await page.goto(path);
      await expect(headerCurrent(page)).toHaveText([desktopTab]);
    });

    test(`signed out phone ${path} → ${phoneTab}`, async ({ page }) => {
      await signOut(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await expect(tabBarCurrent(page)).toHaveText([phoneTab]);
    });
  }
});
