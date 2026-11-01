import { expect, test, type Page } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eStat";
const PEAK = 69;

function seoulDay(daysAgo: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

function stats(overrides: Record<string, unknown> = {}) {
  const base = mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;
  const dailyClicks = Array.from({ length: 30 }, (_, i) => ({
    date: seoulDay(29 - i),
    count: i === 26 ? PEAK : (i * 7) % 23,
  }));
  return { ...base, dailyClicks, ...overrides };
}

function event(name: string, data: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function openOverview(page: Page, handlers: Parameters<typeof mockBackend>[1] = {}, body = stats()) {
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/stats`]: (route) => route.fulfill({ json: body }),
    [`POST /api/v1/links/${CODE}/stream-token`]: (route) => route.fulfill({ json: { streamToken: "st-e2e" } }),
    [`GET /api/v1/links/${CODE}/stream`]: (route) =>
      route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: event("ready", { ok: true }) }),
    ...handlers,
  });
  await page.goto(`/ko/stats/${CODE}`);
  await expect(page.getByTestId("daily-chart").or(page.getByText("아직 클릭이 없어요", { exact: true }))).toBeVisible();
}

test.describe("stats overview reads as one column", () => {
  test("headed sections with no cards, no meta sentence, and the tab's own word for sources", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openOverview(page);
    const panel = page.locator("#stats-panel-overview");
    await expect(panel.locator("h2")).toHaveText(["일별 사람 클릭", "주목할 변화", "유입 경로", "디바이스", "국가"]);
    await expect(panel.locator(".rounded-2xl")).toHaveCount(0);
    await expect(page.getByText(/누적 통계/)).toHaveCount(0);
    await expect(page.getByText("레퍼러 호스트")).toHaveCount(0);
    await expect(page.getByText("실시간 클릭")).toHaveCount(0);
  });

  test("the three lists share one set of columns, so bars and numbers line up across them", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openOverview(page);
    const lists = page.locator("#stats-panel-overview [data-testid=breakdown-list]");
    await expect(lists).toHaveCount(3);
    const edges = await lists.evaluateAll((uls) =>
      uls.map((ul) => {
        const [, bar, count] = [...ul.querySelector("li")!.children].map((el) => el.getBoundingClientRect());
        return { bar: Math.round(bar.left), count: Math.round(count.right) };
      }),
    );
    expect(new Set(edges.map((e) => e.bar)).size).toBe(1);
    expect(new Set(edges.map((e) => e.count)).size).toBe(1);
  });

  test("the header names the destination once", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openOverview(page);
    await expect(page.locator("main h1")).toHaveText("blog.example.com");
    await expect(page.locator("main").getByText("blog.example.com", { exact: true })).toHaveCount(1);
  });
});

test.describe("daily human clicks are bars", () => {
  test("one bar per day, the peak labelled on its own bar, and the range switch keeps them still", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openOverview(page);
    const chart = page.getByTestId("daily-chart");
    await expect(chart.locator("[data-count]")).toHaveCount(30);
    await expect(chart.locator("svg")).toHaveCount(0);
    await expect(page.getByText("피크")).toHaveCount(0);
    const label = page.getByTestId("daily-chart-label");
    await expect(label).toContainText(String(PEAK));

    const peakBar = chart.locator(`[data-count="${PEAK}"] > span`);
    const [bar, tag] = [(await peakBar.boundingBox())!, (await label.boundingBox())!];
    expect(tag.y + tag.height).toBeLessThanOrEqual(bar.y);
    expect(tag.x).toBeLessThanOrEqual(bar.x + bar.width);
    expect(tag.x + tag.width).toBeGreaterThanOrEqual(bar.x);

    await expect(chart.locator(".bar-grow-y")).toHaveCount(0, { timeout: 5_000 });
    await page.getByRole("button", { name: "7일", exact: true }).click();
    await expect(chart.locator("[data-count]")).toHaveCount(7);
    await page.getByRole("button", { name: "30일", exact: true }).click();
    await expect(chart.locator("[data-count]")).toHaveCount(30);
    await expect(chart.locator(".bar-grow-y")).toHaveCount(0);
  });

  test("hovering a bar moves the one label to that day", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openOverview(page);
    const chart = page.getByTestId("daily-chart");
    const first = (await chart.locator("[data-count]").first().boundingBox())!;
    await page.mouse.move(first.x + first.width / 2, first.y + first.height - 4);
    await expect(page.getByTestId("daily-chart-label")).toHaveCount(1);
    await expect(page.getByTestId("daily-chart-label")).not.toContainText(String(PEAK));
    await page.mouse.move(0, 0);
    await expect(page.getByTestId("daily-chart-label")).toContainText(String(PEAK));
  });
});

test("a click that lands while the owner looks opens one 지금 line over the stream token, silent before it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const streams: string[] = [];
  await openOverview(page, {
    [`GET /api/v1/links/${CODE}/stream`]: (route) => {
      streams.push(route.request().url());
      const body =
        streams.length === 1
          ? event("ready", { ok: true })
          : event("ready", { ok: true }) +
            event("click", { occurredAt: "2026-11-01T09:00:00Z", countryCode: "KR", deviceClass: "iOS", channel: "kakao", bot: false });
      return route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body });
    },
  });
  await expect.poll(() => streams.length).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  const live = page.getByTestId("live-clicks");
  await expect(live).toHaveCount(0);
  await expect(page.getByText("기다리", { exact: false })).toHaveCount(0);

  await expect(live).toContainText("지금", { timeout: 10_000 });
  await expect(live).toContainText("클릭 1");
  await expect(live).toContainText("KR · iOS · kakao");
  expect(streams[0]).toContain("streamToken=st-e2e");
  expect(streams.every((url) => !url.includes("claimToken"))).toBe(true);
});

test("a link with no clicks says so in one line and keeps listening", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const first = event("click", { occurredAt: "2026-11-01T09:00:00Z", countryCode: "JP", deviceClass: "Android", channel: "x", bot: false });
  await openOverview(
    page,
    {
      [`GET /api/v1/links/${CODE}/stream`]: (route) =>
        route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: event("ready", { ok: true }) + first }),
    },
    stats({ totalClicks: 0, humanClicks: 0, uniqueClicks: 0, botClicks: 0 }),
  );
  await expect(page.getByText("아직 클릭이 없어요", { exact: true })).toBeVisible();
  await expect(page.getByText(/공유하면/)).toHaveCount(0);
  await expect(page.getByText("사람 클릭", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("daily-chart")).toHaveCount(0);
  await expect(page.getByTestId("live-clicks")).toContainText("JP · Android · x", { timeout: 10_000 });
});

test.describe("on a phone", () => {
  test("copy is a normal button beside ⋯, not a full-width bar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOverview(page);
    const copy = page.getByRole("button", { name: "복사", exact: true }).filter({ visible: true });
    const more = page.getByRole("button", { name: "작업 더 보기" }).filter({ visible: true });
    const [c, m] = [(await copy.boundingBox())!, (await more.boundingBox())!];
    expect(c.width).toBeLessThan(120);
    expect(Math.abs(c.y - m.y)).toBeLessThan(2);
  });

  test("source, device and country names are never cut short to make room for a bar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOverview(page);
    const names = page.locator("#stats-panel-overview [data-testid=breakdown-name]");
    await expect(names.first()).toBeVisible();
    const cut = await names.evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.textContent),
    );
    expect(cut).toEqual([]);
    await expect(names).toContainText(["instagram.com"]);
  });
});
