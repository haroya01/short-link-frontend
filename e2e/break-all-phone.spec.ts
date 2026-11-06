import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";
import { CUSTOM_DOMAINS_ENABLED } from "../lib/feature-flags";

const WIDTH = 390;
const RAW_KEY = "kurl_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c";
const SECRET = "whsec_4c0ffee4c0ffee4c0ffee4c0ffee4c0ffee4c0ffee4c0ffee4c0ffee";
const LONG_URL =
  "https://hooks.example-company-automation.co.kr/services/T024BE7LD/B08ABCDEF12/Xq9LmZ3vR7tY2wN8kP5sD1fH";
const LONG_DOMAIN = "links.very-long-company-domain-example.co.kr";

async function expectInside(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = (await locator.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(WIDTH);
}

async function expectNoSideScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(WIDTH);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: WIDTH, height: 844 });
  await signIn(page);
});

test("an API key shown once fits the phone, with hide and copy on screen", async ({ page }) => {
  await mockBackend(page, {
    "GET /api/v1/2fa/status": (route) => route.fulfill({ json: { enabled: false, lastUsedAt: null } }),
    "GET /api/v1/users/me/api-keys": (route) => route.fulfill({ json: [] }),
    "POST /api/v1/users/me/api-keys": (route) =>
      route.fulfill({
        json: { id: 1, rawKey: RAW_KEY, prefix: RAW_KEY.slice(0, 12), name: null, createdAt: "2026-11-03T00:00:00Z" },
      }),
  });
  await page.goto("/ko/settings#security");
  await page.getByRole("button", { name: "발급", exact: true }).click();

  await expectInside(page.locator("code", { hasText: RAW_KEY }));
  await expectInside(page.getByRole("button", { name: "숨기기", exact: true }));
  await expectInside(page.getByRole("button", { name: "복사", exact: true }));
  await page.getByRole("button", { name: "숨기기", exact: true }).click();
  await expectInside(page.locator("code", { hasText: "•" }));
  await expectNoSideScroll(page);
});

test("the 2FA manual key wraps inside the phone", async ({ page }) => {
  await mockBackend(page, {
    "GET /api/v1/2fa/status": (route) => route.fulfill({ json: { enabled: false, lastUsedAt: null } }),
    "GET /api/v1/users/me/api-keys": (route) => route.fulfill({ json: [] }),
    "POST /api/v1/2fa/setup": (route) =>
      route.fulfill({
        json: {
          secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
          provisioningUri: "otpauth://totp/kurl:e2e?secret=JBSWY3DPEHPK3PXP&issuer=kurl",
        },
      }),
  });
  await page.goto("/ko/settings#security");
  await page.getByRole("button", { name: "켜기", exact: true }).click();
  await expectInside(page.locator("code", { hasText: "JBSWY3DPEHPK3PXP" }));
  await expectNoSideScroll(page);
});

test("custom domain DNS values truncate inside their row", async ({ page }) => {
  test.skip(!CUSTOM_DOMAINS_ENABLED, "custom domains are hidden");
  await mockBackend(page, {
    "GET /api/v1/custom-domains": (route) =>
      route.fulfill({
        json: [
          {
            id: 1,
            domain: LONG_DOMAIN,
            verificationToken: "kurl-verify-7c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d",
            verificationHost: `_kurl-verify.${LONG_DOMAIN}`,
            verified: false,
            verifiedAt: null,
            lastCheckedAt: null,
            createdAt: "2026-11-03T00:00:00Z",
            autoVerifyUntil: null,
          },
        ],
      }),
  });
  await page.goto("/ko/settings#domains");
  const cells = page.locator("button", { hasText: "kurl-verify-7c1d" });
  await expectInside(cells.first());
  await expectNoSideScroll(page);
});

test("a link's destination and webhook URLs, and a new webhook secret, fit the phone", async ({ page }) => {
  const CODE = "e2eBreak";
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/destinations`]: (route) =>
      route.fulfill({
        json: [
          { id: 1, url: LONG_URL, weight: 50, label: null, enabled: true, countryCode: null, deviceClass: null, os: null, createdAt: "2026-11-01T00:00:00Z" },
          { id: 2, url: `${LONG_URL}/b`, weight: 50, label: null, enabled: true, countryCode: null, deviceClass: null, os: null, createdAt: "2026-11-01T00:00:00Z" },
        ],
      }),
    [`GET /api/v1/links/${CODE}/webhooks`]: (route) =>
      route.fulfill({
        json: [
          {
            id: 1, url: LONG_URL, name: null, enabled: true, createdAt: "2026-11-01T00:00:00Z", lastCalledAt: null,
            lastStatusCode: null, lastError: null, includeBots: false, sampleRate: 1, batchEnabled: false, dailyQuota: null,
          },
        ],
      }),
    [`POST /api/v1/links/${CODE}/webhooks`]: (route) =>
      route.fulfill({
        json: { id: 2, url: LONG_URL, secret: SECRET, name: null, createdAt: "2026-11-03T00:00:00Z", format: "GENERIC" },
      }),
  });
  await page.goto(`/ko/stats/${CODE}#settings`);

  const listed = page.locator("code", { hasText: "hooks.example-company-automation" });
  await expect(listed).toHaveCount(3);
  for (const url of await listed.all()) {
    await expectInside(url);
    expect((await url.boundingBox())!.width).toBeGreaterThan(WIDTH / 2);
  }
  await page.getByPlaceholder("https://hooks.slack.com/services/...").fill(LONG_URL);
  await page.getByRole("button", { name: "등록", exact: true }).click();
  const issued = page.locator("div", { has: page.locator("code", { hasText: SECRET }) }).last();
  await expectInside(issued.locator("code"));
  await expectInside(issued.getByRole("button", { name: "숨기기", exact: true }));
  await expectInside(issued.getByRole("button", { name: "복사", exact: true }));
  await expectNoSideScroll(page);
});

test("the demo settings mirror keeps its URLs inside the phone", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/ko/demo#settings");
  const urls = page.locator("#stats-panel-settings code");
  await expect(urls.first()).toBeVisible();
  for (const url of await urls.all()) await expectInside(url);
  await expectNoSideScroll(page);
});
