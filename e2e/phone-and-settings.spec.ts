import { expect, test, type Page } from "@playwright/test";
import { CUSTOM_DOMAINS_ENABLED } from "../lib/feature-flags";

// MOCK-ON: the viewer, the profile and the link library come from the in-app mocks. Settings
// sections, events and the editor's public-profile read are client calls, so page.route answers them.

const PHONE = { width: 390, height: 844 };
const LONG_DOMAIN = "links.very-long-company-domain-example.co.kr";
const TOKEN = "kurl-verify-7c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d";

const KEYS = [
  { id: 1, prefix: "kurl_live_8f2a", name: "리포트 봇", lastUsedAt: null, createdAt: "2026-09-01T00:00:00Z", revokedAt: null },
];

async function settingsApi(page: Page, overrides: Record<string, () => { status?: number; json: unknown }> = {}) {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.route("**/api/v1/**", (route) => {
    const req = route.request();
    const key = `${req.method()} ${new URL(req.url()).pathname}`;
    const own = overrides[key];
    if (own) {
      const { status, json } = own();
      return route.fulfill({ status: status ?? 200, json });
    }
    if (key === "GET /api/v1/2fa/status") return route.fulfill({ json: { enabled: false, lastUsedAt: null } });
    if (key === "GET /api/v1/users/me/api-keys") return route.fulfill({ json: KEYS });
    if (key === "GET /api/v1/custom-domains") return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { status: 404, title: "not mocked", detail: key } });
  });
}

const failure = () => ({ status: 500, json: { status: 500, title: "Internal Server Error", detail: "boom" } });

test("settings reads as one grouped list, and the language row switches the page", async ({ page }) => {
  await settingsApi(page);
  await page.goto("/ko/settings");
  for (const title of ["계정 정보", "환경설정"]) {
    await expect(page.getByRole("heading", { level: 2, name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("combobox", { name: "시간대" })).toBeVisible();
  await page.getByRole("combobox", { name: "인터페이스 언어" }).selectOption("ja");
  await expect(page).toHaveURL(/\/ja\/settings$/);
});

test("a failed API key load says so and retries, instead of claiming there are no keys", async ({ page }) => {
  let fail = true;
  await settingsApi(page, {
    "GET /api/v1/users/me/api-keys": () => (fail ? failure() : { json: KEYS }),
  });
  await page.goto("/ko/settings#security");
  const alert = page.getByRole("alert").filter({ hasText: "API 키를 불러오지 못했어요." });
  await expect(alert).toBeVisible();
  await expect(page.getByText("아직 발급된 키가 없어요.")).toHaveCount(0);
  fail = false;
  await alert.getByRole("button", { name: "다시 시도" }).click();
  await expect(page.getByText("리포트 봇")).toBeVisible();
});

test("custom domains stay out of settings, and a #domains link opens the account tab", async ({ page }) => {
  test.skip(CUSTOM_DOMAINS_ENABLED, "custom domains are switched on");
  await settingsApi(page);
  await page.goto("/ko/settings#domains");
  const tabs = page.getByRole("tablist", { name: "설정 섹션" }).getByRole("tab");
  await expect(tabs).toHaveText(["계정", "보안", "데이터"]);
  await expect(page.getByRole("tab", { name: "계정" })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/ko\/settings#account$/);
  await expect(page.getByText("커스텀 도메인", { exact: true })).toHaveCount(0);
});

test("a failed domain load says so and retries", async ({ page }) => {
  test.skip(!CUSTOM_DOMAINS_ENABLED, "custom domains are hidden");
  await settingsApi(page, { "GET /api/v1/custom-domains": failure });
  await page.goto("/ko/settings#domains");
  await expect(page.getByRole("alert").filter({ hasText: "도메인을 불러오지 못했어요." })).toBeVisible();
});

test("revoking a key asks to revoke it, with a revoke button", async ({ page }) => {
  await settingsApi(page);
  await page.goto("/ko/settings#security");
  await page.getByRole("button", { name: "폐기", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "이 키를 폐기할까요?" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "폐기", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "삭제", exact: true })).toHaveCount(0);
});

test("the account delete confirmation is as tall as its content", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await settingsApi(page);
  await page.goto("/ko/settings#data");
  await page.getByRole("button", { name: "계정 삭제", exact: true }).click();
  const box = (await page.getByRole("dialog").boundingBox())!;
  expect(box.height).toBeLessThan(360);
});

test("on a phone a DNS record stacks type, host and value, each fully readable", async ({ page }) => {
  test.skip(!CUSTOM_DOMAINS_ENABLED, "custom domains are hidden");
  await page.setViewportSize(PHONE);
  await settingsApi(page, {
    "GET /api/v1/custom-domains": () => ({
      json: [
        {
          id: 1, domain: LONG_DOMAIN, verificationToken: TOKEN, verificationHost: `_kurl-verify.${LONG_DOMAIN}`,
          verified: false, verifiedAt: null, lastCheckedAt: null, createdAt: "2026-11-03T00:00:00Z", autoVerifyUntil: null,
        },
      ],
    }),
  });
  await page.goto("/ko/settings#domains");
  const host = page.getByRole("button", { name: `호스트 _kurl-verify.${LONG_DOMAIN}` });
  const value = page.getByRole("button", { name: `값 ${TOKEN}` });
  const hostBox = (await host.boundingBox())!;
  const valueBox = (await value.boundingBox())!;
  expect(valueBox.y).toBeGreaterThanOrEqual(hostBox.y + hostBox.height - 1);
  expect(valueBox.x + valueBox.width).toBeLessThanOrEqual(PHONE.width);
  await expect(value).toContainText(TOKEN);
  const clipped = await value.evaluate((el) => [...el.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth));
  expect(clipped).toBe(false);
  await expect(page.getByText(LONG_DOMAIN, { exact: true }).first()).toBeVisible();
});

test("a public profile's email signup keeps a full-height input on a phone", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/ko/u/email-signup");
  const input = page.getByRole("textbox").first();
  const button = page.getByRole("button", { name: "등록", exact: true });
  const inputBox = (await input.boundingBox())!;
  const buttonBox = (await button.boundingBox())!;
  expect(inputBox.height).toBeGreaterThanOrEqual(40);
  expect(Math.abs(inputBox.height - buttonBox.height)).toBeLessThanOrEqual(1);
});

const DAY = 86_400_000;
const EVENT = {
  id: 1, slug: "seongsu", title: "성수 모각코 11월", descriptionMd: null, coverImageUrl: null,
  startsAt: new Date(Date.now() + 7 * DAY).toISOString(), endsAt: null, timezone: "Asia/Seoul",
  locationText: "성수 카페 2층", locationUrl: null, onlineUrl: null, capacity: 20, closeAt: null, contactField: "KAKAO",
  status: "OPEN", registrationCount: 1, createdAt: "2026-11-01T00:00:00Z",
  questions: [{ id: 1, type: "SHORT_TEXT", label: "뭐 할 거예요?", options: [], required: true }],
  links: [{ linkId: 11, shortCode: "mk11", label: "기본" }],
};
const ATTENDEE = {
  id: 1, name: "김민지", contact: "a.very.long.kakao.id.for.testing_2026", answers: { "1": "사이드 프로젝트 배포" },
  status: "CONFIRMED", channel: "단톡방", createdAt: "2026-11-02T10:00:00Z", canceledAt: null,
};

async function manage(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/events/1") return route.fulfill({ json: EVENT });
    if (path === "/api/v1/events/1/attendees") return route.fulfill({ json: [ATTENDEE] });
    if (path === "/api/v1/events/1/analytics")
      return route.fulfill({
        json: { totalClicks: 0, totalRegistrations: 1, dailyRegistrations: [], clicksByLink: [], clicksByClientApp: [], registrationsByChannel: [] },
      });
    return route.fulfill({ status: 404, json: { status: 404, title: "not mocked" } });
  });
  await page.goto("/ko/events/1");
}

test("on a phone each attendee is a block with contact, channel, status and answers in view", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await manage(page);
  const main = page.getByRole("main");
  await expect(main.locator("table")).toBeHidden();
  const row = main.getByRole("listitem").filter({ hasText: "김민지" });
  await expect(row).toBeVisible();
  for (const text of [ATTENDEE.contact, "단톡방", "확정", "뭐 할 거예요?", "사이드 프로젝트 배포"]) await expect(row).toContainText(text);
  const box = (await row.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("on a desktop the attendees stay a table", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await manage(page);
  await expect(page.getByRole("main").locator("table")).toContainText("단톡방");
});

test("the profile editor lists five of my other links and offers the rest in one tap", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.route("**/api/v1/public/profiles/**", (route) =>
    route.fulfill({
      json: { username: "dohyun", bio: null, theme: null, avatarUrl: null, bannerUrl: null, socials: [], entries: [], publishedPostCount: 0, hideFollowerCount: false },
    }),
  );
  await page.goto("/ko/settings/profile");
  const list = page.locator("details").filter({ hasText: "다른 내 링크에서 추가" }).locator("ul");
  await expect(list.getByRole("button", { name: "추가", exact: true })).toHaveCount(5);
  const more = list.getByRole("button", { name: /개 더 보기$/ });
  await more.click();
  await expect(more).toHaveCount(0);
  expect(await list.getByRole("button", { name: "추가", exact: true }).count()).toBeGreaterThan(5);
});

test("block menu items carry an icon and a name, without a plus sign", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.route("**/api/v1/public/profiles/**", (route) => route.fulfill({ status: 404, json: {} }));
  await page.goto("/ko/settings/profile");
  await page.getByRole("main").getByRole("button", { name: "추가", exact: true }).and(page.locator("[aria-haspopup=menu]")).click();
  const items = page.getByRole("menu").getByRole("menuitem");
  await expect(items.first()).toHaveText("텍스트");
  for (const text of await items.allTextContents()) expect(text.trim().startsWith("+")).toBe(false);
});
