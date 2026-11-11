import fs from "fs";
import path from "path";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";

const ADMIN = { ...ME, role: "ADMIN" };
const CODE = "e2eEvd1";
const BLURRED = fs.readFileSync(path.join(__dirname, "fixtures/preview-blurred.jpg"));
const SHARP = fs.readFileSync(path.join(__dirname, "fixtures/preview-sharp.jpg"));

// A zone no build or CI machine runs in, so a time formatted in the server's zone cannot pass by coincidence.
// Korean AM/PM reads 오전/오후 or AM/PM depending on the browser's ICU version; both are accepted.
test.use({ timezoneId: "Asia/Kathmandu" });

const LINK_ROW = {
  shortCode: CODE,
  originalUrl: "https://prize.example/claim?token=t1",
  ownerId: 7,
  ownerEmail: "owner@example.com",
  clickCount: 3,
  humanClickCount: 3,
  passwordProtected: false,
  maxViews: null,
  viewCount: 0,
  createdAt: "2026-09-20T00:00:00Z",
  expiresAt: null,
  status: "ACTIVE",
  disabledReason: null,
  disabledAt: null,
};

const SUSPICIOUS = {
  page: {
    title: "Claim your prize today",
    description: "Enter your card number to receive the reward.",
    fetchStatus: "OK",
    fetchedAt: "2026-11-10T05:02:00Z",
    hasImage: true,
    imageWithheld: false,
  },
  destinations: [
    { host: "prize.example", kind: "ORIGINAL", weight: null, countryCode: null, deviceClass: null, os: null },
    { host: "ios.prize.example", kind: "BRANCH", weight: 3, countryCode: "KR", deviceClass: "mobile", os: "ios" },
    { host: "after.prize.example", kind: "AFTER_EXPIRY", weight: null, countryCode: null, deviceClass: null, os: null },
  ],
  history: {
    retentionDays: 180,
    urlChanges: 2,
    destinationChanges: 1,
    latest: { action: "LINK_UPDATED", at: "2026-11-09T12:14:00Z", fromHost: "safe.example", toHost: "prize.example" },
  },
  creator: {
    anonymous: false,
    userId: 7,
    joinedAt: "2026-11-01T03:00:00Z",
    status: "SUSPENDED",
    suspendedUntil: "2026-12-01T03:00:00Z",
    links: 12,
    disabledLinks: 3,
  },
  reports: {
    total: 5,
    open: 2,
    reasons: [
      { reason: "PHISHING", count: 3 },
      { reason: "SPAM", count: 1 },
      { reason: null, count: 1 },
    ],
  },
};

const CLEAN = {
  page: {
    title: "Cafe Mori",
    description: "Menu and opening hours",
    fetchStatus: "OK",
    fetchedAt: "2026-11-10T05:02:00Z",
    hasImage: true,
    imageWithheld: false,
  },
  destinations: [
    { host: "cafe.example.jp", kind: "ORIGINAL", weight: null, countryCode: null, deviceClass: null, os: null },
  ],
  history: { retentionDays: 180, urlChanges: 0, destinationChanges: 0, latest: null },
  creator: {
    anonymous: false,
    userId: 9,
    joinedAt: "2026-03-02T03:00:00Z",
    status: "ACTIVE",
    suspendedUntil: null,
    links: 4,
    disabledLinks: 0,
  },
  reports: { total: 0, open: 0, reasons: [] },
};

type Evidence = Record<string, unknown> | null | undefined;
type Preview = (clear: boolean, route: Route) => unknown;

const images: Preview = (clear, route) =>
  route.fulfill({ contentType: "image/jpeg", headers: { "Cache-Control": "no-store" }, body: clear ? SHARP : BLURRED });
const problem = (status: number, code: string, extra: object = {}): Preview => (_clear, route) =>
  route.fulfill({ status, contentType: "application/problem+json", body: JSON.stringify({ status, code, ...extra }) });

function fakeServer(evidence: Evidence, preview: Preview = images) {
  const calls = { preview: [] as string[], authorized: [] as boolean[], detail: 0, excluded: [] as number[][] };
  const stats = mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;
  const click = {
    id: 501,
    excluded: false,
    click: {
      clickedAt: "2026-11-10T00:15:00Z",
      country: "KR",
      region: "Seoul",
      regionCode: "KR-11",
      city: "Seoul",
      device: "mobile",
      os: "iOS",
      browser: "Safari",
      referrer: null,
      referrerHost: null,
      channel: "direct",
      language: "ko",
      bot: false,
      botName: null,
      ipMasked: "203.0.113.*",
    },
  };
  const base = `/api/v1/admin/links/${CODE}`;
  const handlers: Record<string, (route: Route) => unknown> = {
    [`GET ${base}`]: (route) => {
      calls.detail++;
      return route.fulfill({
        json: { meta: LINK_ROW, stats: { ...stats, timezone: "Asia/Seoul" }, ...(evidence === undefined ? {} : { evidence }) },
      });
    },
    "GET /api/v1/admin/blocked-domains": (route) => route.fulfill({ json: [] }),
    [`GET ${base}/clicks`]: (route) => route.fulfill({ json: { items: [click], nextCursor: null } }),
    [`POST ${base}/clicks/exclude`]: (route) => {
      calls.excluded.push((route.request().postDataJSON() as { clickIds: number[] }).clickIds);
      return route.fulfill({ json: { shortCode: CODE, changed: 1 } });
    },
    [`GET ${base}/preview-image`]: (route) => {
      const clear = new URL(route.request().url()).searchParams.get("clear");
      calls.preview.push(String(clear));
      calls.authorized.push(route.request().headers()["authorization"] === "Bearer e2e-token");
      return preview(clear === "true", route);
    },
  };
  return { handlers, calls };
}

async function open(page: Page, server: ReturnType<typeof fakeServer>) {
  await signIn(page);
  await page.context().addCookies([{ name: "kurl_has_session", value: "1", domain: "localhost", path: "/" }]);
  await mockBackend(page, server.handlers, ADMIN);
  await page.goto(`/ko/admin/links/${CODE}`);
  await expect(page.getByRole("heading", { name: "링크 상세", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /클릭 선택$/ }).first()).toBeVisible();
}

const card = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "판단 근거", exact: true }) });
const group = (page: Page, label: string): Locator =>
  card(page)
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) })
    .locator("dd");
const preview = (page: Page) => page.getByTestId("evidence-preview");
const sharpRequests = (server: ReturnType<typeof fakeServer>) => server.calls.preview.filter((c) => c === "true").length;

test.describe("admin evidence card", () => {
  test("a suspicious link shows what the server gathered, in the order an operator reads it", async ({ page }) => {
    await open(page, fakeServer(SUSPICIOUS));

    const headings = await page.locator("main section h3").allTextContents();
    expect(headings.slice(0, 3)).toEqual(["링크 상세", "판단 근거", "악용 대응"]);
    expect(headings.at(-1)).toBe("클릭 기록");
    await expect(card(page).locator("dl > div > dt")).toHaveText([
      "목적지가 밝힌 내용",
      "미리보기 이미지",
      "보내는 곳",
      "목적지 변경",
      "만든 계정",
      "신고",
    ]);

    await expect(group(page, "목적지가 밝힌 내용")).toContainText("Claim your prize today");
    await expect(group(page, "목적지가 밝힌 내용")).toContainText("Enter your card number to receive the reward.");
    await expect(group(page, "목적지가 밝힌 내용")).toContainText(/2026\. 11\. 10\. (오전|AM) 10:47에 가져옴/);

    const destinations = card(page).getByTestId("evidence-destination");
    await expect(destinations).toHaveCount(3);
    await expect(destinations.nth(0)).toHaveText("prize.example기본");
    await expect(destinations.nth(1)).toHaveText("ios.prize.example분배 · 대한민국 · 모바일 · iOS · 가중치 3");
    await expect(destinations.nth(2)).toHaveText("after.prize.example만료 후");

    await expect(group(page, "목적지 변경")).toContainText("최근 180일 · 기본 주소 2번 · 분배 목적지 1번");
    await expect(card(page).getByTestId("evidence-latest-change")).toHaveText("기본 주소safe.example→prize.example");
    await expect(group(page, "목적지 변경")).toContainText(/마지막 변경 2026\. 11\. 9\. (오후|PM) 5:59/);

    await expect(group(page, "만든 계정").getByText("2026. 12. 1.까지 정지", { exact: true })).toBeVisible();
    await expect(group(page, "만든 계정")).toContainText(/2026\. 11\. 1\. 가입 · 링크 12개 · 꺼진 링크 3개$/);

    await expect(group(page, "신고")).toContainText("처리 전 2건 · 전체 5건");
    await expect(card(page).getByTestId("evidence-report-reasons")).toHaveText("피싱·사기 3 · 스팸·광고 1 · 사유 없음 1");
  });

  test("a clean link reads short, with no zeros to wade through", async ({ page }) => {
    await open(page, fakeServer(CLEAN));

    await expect(card(page).getByTestId("evidence-destination")).toHaveText(["cafe.example.jp"]);
    await expect(group(page, "목적지 변경")).toHaveText("최근 180일 동안 바뀐 적 없어요");
    await expect(group(page, "만든 계정").getByText("활성", { exact: true })).toBeVisible();
    await expect(group(page, "만든 계정")).toContainText(/2026\. 3\. 2\. 가입 · 링크 4개$/);
    await expect(group(page, "신고")).toHaveText("없어요");
    await expect(card(page)).not.toContainText(/(^|[^\d])0(건|번|개)/);
    await expect(card(page).getByRole("button", { name: "전체 보기" })).toHaveCount(0);
    await expect(preview(page)).toHaveAttribute("data-view", "blurred");
  });

  test("the blurred image loads by itself, and the sharp one only after the control that says it is recorded", async ({
    page,
  }) => {
    const server = fakeServer(SUSPICIOUS);
    await open(page, server);

    await expect(preview(page)).toHaveAttribute("data-view", "blurred");
    await expect(preview(page).locator("img")).toHaveCount(1);
    expect(server.calls.preview.length).toBeGreaterThan(0);
    expect(sharpRequests(server)).toBe(0);
    expect(server.calls.authorized.every(Boolean)).toBe(true);
    const control = group(page, "미리보기 이미지");
    await expect(control.getByRole("button", { name: "선명하게 보기", exact: true })).toBeVisible();
    await expect(control.getByText("보면 기록이 남아요", { exact: true })).toBeVisible();

    await control.getByRole("button", { name: "선명하게 보기", exact: true }).click();

    await expect(preview(page)).toHaveAttribute("data-view", "sharp");
    await expect(preview(page).getByAltText("선명한 미리보기 이미지")).toBeVisible();
    await expect(control.getByText("본 기록이 남았어요", { exact: true })).toBeVisible();
    expect(sharpRequests(server)).toBe(1);
    const sources = await preview(page).locator("img").evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
    expect(sources).toHaveLength(2);
    expect(sources.every((src) => src.startsWith("blob:"))).toBe(true);
    const drawn = await preview(page).locator("img").evaluateAll((els) => els.map((el) => (el as HTMLImageElement).naturalWidth));
    expect(drawn).toEqual([320, 320]);

    const before = server.calls.preview.length;
    await control.getByRole("button", { name: "다시 가리기", exact: true }).click();
    await expect(preview(page)).toHaveAttribute("data-view", "blurred");
    await expect(preview(page).locator("img")).toHaveCount(1);
    await expect(control.getByText("보면 기록이 남아요", { exact: true })).toBeVisible();
    expect(server.calls.preview).toHaveLength(before);

    await control.getByRole("button", { name: "선명하게 보기", exact: true }).click();
    await expect(preview(page)).toHaveAttribute("data-view", "sharp");
    expect(sharpRequests(server)).toBe(2);
  });

  test("a withheld image is never requested and the card says why", async ({ page }) => {
    const server = fakeServer({
      ...SUSPICIOUS,
      page: { ...SUSPICIOUS.page, imageWithheld: true },
      reports: { total: 1, open: 1, reasons: [{ reason: "SEXUAL", count: 1 }] },
    });
    await open(page, server);

    await expect(group(page, "미리보기 이미지")).toHaveText("성적인 콘텐츠 신고가 있는 링크라 이미지를 불러오지 않아요");
    await expect(card(page).getByTestId("evidence-report-reasons")).toHaveText("성적인 콘텐츠 1");
    await expect(card(page).locator("img")).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "선명하게 보기" })).toHaveCount(0);
    expect(server.calls.preview).toEqual([]);
  });

  test("a link without an image says so without asking the server", async ({ page }) => {
    const server = fakeServer({ ...CLEAN, page: { ...CLEAN.page, hasImage: false } });
    await open(page, server);

    await expect(group(page, "미리보기 이미지")).toHaveText("이미지가 없어요");
    await expect(card(page).locator("img")).toHaveCount(0);
    expect(server.calls.preview).toEqual([]);
  });

  for (const [reason, line] of [
    ["NO_IMAGE", "이미지가 없어요"],
    ["FETCH_REFUSED", "서버가 이미지를 받아 오지 못했어요"],
    ["TOO_MANY_PIXELS", "이미지가 너무 커서 줄이지 못했어요"],
    ["UNDECODABLE", "읽을 수 없는 이미지 파일이에요"],
  ] as const) {
    test(`an image the server cannot give (${reason}) is a line of text, not a broken picture`, async ({ page }) => {
      const server = fakeServer(SUSPICIOUS, problem(404, "LINK_PREVIEW_UNAVAILABLE", { reason }));
      await open(page, server);

      await expect(group(page, "미리보기 이미지")).toHaveText(line);
      await expect(card(page).locator("img")).toHaveCount(0);
      await expect(card(page).getByRole("button")).toHaveCount(0);
      expect(sharpRequests(server)).toBe(0);
    });
  }

  test("a sexual content report that lands after the page loaded withholds the image on the next request", async ({
    page,
  }) => {
    const server = fakeServer(SUSPICIOUS, (clear, route) =>
      clear ? problem(451, "LINK_PREVIEW_WITHHELD")(clear, route) : images(clear, route),
    );
    await open(page, server);
    await expect(preview(page)).toHaveAttribute("data-view", "blurred");

    await group(page, "미리보기 이미지").getByRole("button", { name: "선명하게 보기", exact: true }).click();

    await expect(group(page, "미리보기 이미지")).toHaveText("성적인 콘텐츠 신고가 있는 링크라 이미지를 불러오지 않아요");
    await expect(card(page).locator("img")).toHaveCount(0);
  });

  test("a failed image request offers a retry, and bytes that are not a picture never show as one", async ({ page }) => {
    let mode: "error" | "garbage" | "ok" = "error";
    const server = fakeServer(SUSPICIOUS, (clear, route) => {
      if (mode === "error") return route.fulfill({ status: 500, json: { status: 500 } });
      if (mode === "garbage") return route.fulfill({ contentType: "image/jpeg", body: "not a jpeg" });
      return images(clear, route);
    });
    await open(page, server);
    const block = group(page, "미리보기 이미지");

    await expect(block).toContainText("이미지를 불러오지 못했어요");
    await expect(card(page).locator("img")).toHaveCount(0);

    mode = "garbage";
    await block.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(block).toContainText("이미지를 불러오지 못했어요");
    await expect(card(page).locator("img")).toHaveCount(0);

    mode = "ok";
    await block.getByRole("button", { name: "다시 시도", exact: true }).click();
    await expect(preview(page)).toHaveAttribute("data-view", "blurred");
  });

  test("nothing in the card is a link, the page's own markup stays text, and the browser never contacts the destination", async ({
    page,
  }) => {
    const title = `<img src="https://prize.example/x.png" onerror="alert(1)">Free <b>gift</b>`;
    const description = `<script>alert(2)</script> Go to <a href="https://prize.example/claim">prize.example/claim</a> or https://prize.example/claim now`;
    const requested: string[] = [];
    const dialogs: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await open(page, fakeServer({ ...SUSPICIOUS, page: { ...SUSPICIOUS.page, title, description } }));
    await expect(preview(page)).toHaveAttribute("data-view", "blurred");

    await expect(card(page).getByTestId("evidence-page-title")).toHaveText(title);
    await expect(card(page).getByTestId("evidence-page-description")).toHaveText(description);
    await expect(card(page).getByTestId("evidence-page-title").locator("*")).toHaveCount(0);
    await expect(card(page).getByTestId("evidence-page-description").locator("*")).toHaveCount(0);
    await expect(card(page).locator("a")).toHaveCount(0);
    await expect(card(page).locator("script, iframe, b")).toHaveCount(0);
    await expect(card(page).getByTestId("evidence-destination").first()).toHaveText("prize.example기본");

    await group(page, "미리보기 이미지").getByRole("button", { name: "선명하게 보기", exact: true }).click();
    await expect(preview(page)).toHaveAttribute("data-view", "sharp");

    expect(dialogs).toEqual([]);
    expect(requested.filter((url) => /prize\.example|safe\.example/.test(new URL(url).hostname))).toEqual([]);
    expect(await page.locator(`a[href*="prize.example"], img[src*="prize.example"]`).count()).toBe(0);
  });

  test("long page text is clamped and can be read in full", async ({ page }) => {
    const description = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} of a very long description.`).join(" ");
    await open(page, fakeServer({ ...SUSPICIOUS, page: { ...SUSPICIOUS.page, description } }));
    const text = card(page).getByTestId("evidence-page-description");
    const block = group(page, "목적지가 밝힌 내용");

    const clampedHeight = await text.evaluate((el) => el.clientHeight);
    expect(await text.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const more = block.getByRole("button", { name: "전체 보기", exact: true });
    await expect(more).toHaveAttribute("aria-expanded", "false");

    await more.click();

    await expect(block.getByRole("button", { name: "접기", exact: true })).toHaveAttribute("aria-expanded", "true");
    expect(await text.evaluate((el) => el.clientHeight)).toBeGreaterThan(clampedHeight * 2);
    expect(await text.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await expect(text).toHaveText(description);
  });

  for (const [fetchStatus, fetchedAt, lines] of [
    ["PENDING", null, ["아직 가져오지 않았어요"]],
    ["RETRYABLE", "2026-11-10T05:02:00Z", ["가져오지 못해 다시 시도하는 중이에요", /마지막 시도 2026\. 11\. 10\. (오전|AM) 10:47/]],
    ["ERROR", "2026-11-10T05:02:00Z", ["가져오지 못했어요", /마지막 시도 2026\. 11\. 10\. (오전|AM) 10:47/]],
  ] as const) {
    test(`a page that was not fetched (${fetchStatus}) says so instead of looking empty`, async ({ page }) => {
      const server = fakeServer({
        ...CLEAN,
        page: { title: null, description: null, fetchStatus, fetchedAt, hasImage: false, imageWithheld: false },
      });
      await open(page, server);

      for (const line of lines) await expect(group(page, "목적지가 밝힌 내용")).toContainText(line);
      await expect(group(page, "목적지가 밝힌 내용")).not.toContainText("가져옴");
    });
  }

  test("a fetched page with no title or description, made without an account, says both plainly", async ({ page }) => {
    const server = fakeServer({
      ...CLEAN,
      page: { ...CLEAN.page, title: null, description: "  " },
      creator: { anonymous: true, userId: null, joinedAt: null, status: null, suspendedUntil: null, links: null, disabledLinks: null },
    });
    await open(page, server);

    await expect(group(page, "목적지가 밝힌 내용")).toContainText("제목과 설명이 없는 페이지예요");
    await expect(group(page, "만든 계정")).toHaveText("로그인 없이 만든 링크예요");
  });

  for (const [what, evidence] of [
    ["no evidence field", undefined],
    ["a null evidence", null],
  ] as const) {
    test(`a response with ${what} still renders the rest of the screen`, async ({ page }) => {
      const server = fakeServer(evidence);
      await open(page, server);

      await expect(page.getByRole("heading", { name: "판단 근거", exact: true })).toHaveCount(0);
      expect(await page.locator("main section h3").allTextContents()).toEqual(
        expect.arrayContaining(["링크 상세", "악용 대응", "클릭 기록"]),
      );
      expect(server.calls.preview).toEqual([]);
    });
  }

  test("re-reading the summary after a click is excluded keeps the sharp image and asks for nothing new", async ({
    page,
  }) => {
    const server = fakeServer(SUSPICIOUS);
    await open(page, server);
    await group(page, "미리보기 이미지").getByRole("button", { name: "선명하게 보기", exact: true }).click();
    await expect(preview(page)).toHaveAttribute("data-view", "sharp");
    const previews = server.calls.preview.length;
    const details = server.calls.detail;

    await page.getByRole("checkbox", { name: /클릭 선택$/ }).first().check();
    await page.getByTestId("click-selection-bar").getByRole("button", { name: "제외", exact: true }).click();

    await expect.poll(() => server.calls.detail).toBeGreaterThan(details);
    expect(server.calls.excluded).toEqual([[501]]);
    await expect(preview(page)).toHaveAttribute("data-view", "sharp");
    expect(server.calls.preview).toHaveLength(previews);
  });
});

test.describe("admin evidence card on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("groups stack in reading order and long hosts or titles never push the page sideways", async ({ page }) => {
    const host = `${"very-long-subdomain-label-".repeat(4)}prize.example`;
    const server = fakeServer({
      ...SUSPICIOUS,
      page: { ...SUSPICIOUS.page, title: "A".repeat(180) },
      destinations: [{ ...SUSPICIOUS.destinations[0], host }, ...SUSPICIOUS.destinations.slice(1)],
    });
    await open(page, server);
    await expect(preview(page)).toHaveAttribute("data-view", "blurred");

    const tops = await card(page)
      .locator("dl > div")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(tops).toHaveLength(6);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(6);
    await expect(card(page).getByTestId("evidence-destination").first()).toContainText(host);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(0);
  });
});
