import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eStat";

function event(name: string, data: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function openWhen(page: Page, handlers: Parameters<typeof mockBackend>[1] = {}) {
  await signIn(page);
  await mockBackend(page, {
    [`POST /api/v1/links/${CODE}/stream-token`]: (route) => route.fulfill({ json: { streamToken: "st-e2e" } }),
    [`GET /api/v1/links/${CODE}/stream`]: (route) =>
      route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: event("ready", { ok: true }) }),
    ...handlers,
  });
  await page.goto(`/ko/stats/${CODE}#when`);
  await expect(page.locator("#stats-panel-when")).toBeVisible();
  await expect(page.locator("main h1")).toHaveText("blog.example.com");
}

function accentOf(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "bg-accent-600";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
}

async function accented(page: Page, scope: string, green: string) {
  return page.locator(scope).evaluate(
    (root, color) =>
      [...root.querySelectorAll<HTMLElement>("*")]
        .filter((el) => el.offsetParent !== null && getComputedStyle(el).backgroundColor === color)
        .map((el) => el.getAttribute("aria-label") ?? el.parentElement?.getAttribute("data-count") ?? el.tagName),
    green,
  );
}

test.describe("클릭 추이 reads like the overview", () => {
  test("the hour chart is bars with exactly one accent bar, the busiest hour, labelled on its bar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWhen(page);
    const chart = page.getByTestId("hour-chart");
    await expect(chart.locator("[data-count]")).toHaveCount(24);
    await expect(chart.locator("svg")).toHaveCount(0);
    const green = await accentOf(page);
    const counts = await chart.locator("[data-count]").evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-count"))));
    const peak = String(Math.max(...counts));
    await expect.poll(() => accented(page, '[data-testid="hour-chart"]', green)).toEqual([peak]);
    await expect(page.getByTestId("hour-chart-label")).toContainText(peak);

    const quiet = chart.locator("[data-count]").nth(counts.findIndex((c) => c > 0 && String(c) !== peak));
    const box = (await quiet.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
    await expect.poll(() => accented(page, '[data-testid="hour-chart"]', green)).toEqual([await quiet.getAttribute("data-count")]);
  });

  test("the heatmap is a neutral ramp with exactly one accent cell that follows the pointer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWhen(page);
    const green = await accentOf(page);
    const cells = page.getByTestId("heatmap-hours").locator("button");
    await expect(cells).toHaveCount(168);
    await expect.poll(() => accented(page, '[data-testid="heatmap"]', green)).toHaveLength(1);
    const hottest = await accented(page, '[data-testid="heatmap"]', green);
    await expect(page.getByTestId("heatmap-detail").filter({ visible: true })).toBeVisible();

    const index = await cells.evaluateAll((buttons) =>
      buttons.findIndex((b) => !b.hasAttribute("data-active") && !/ 0회$/.test(b.getAttribute("aria-label") ?? "")),
    );
    const other = cells.nth(index);
    await other.hover();
    const label = await other.getAttribute("aria-label");
    expect([label]).not.toEqual(hottest);
    await expect.poll(() => accented(page, '[data-testid="heatmap"]', green)).toEqual([label]);
  });

  test("no card, no status chip and no sentence waits for a click; the first click opens one 지금 list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const streams: string[] = [];
    await openWhen(page, {
      [`GET /api/v1/links/${CODE}/stream`]: (route) => {
        streams.push(route.request().url());
        const body =
          streams.length === 1
            ? event("ready", { ok: true })
            : event("ready", { ok: true }) +
              event("click", { occurredAt: "2026-11-02T09:00:00Z", countryCode: "KR", deviceClass: "iOS", channel: "kakao", bot: false });
        return route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body });
      },
    });
    const panel = page.locator("#stats-panel-when");
    await expect.poll(() => streams.length).toBeGreaterThan(0);
    await page.waitForTimeout(400);
    await expect(page.getByTestId("live-feed")).toHaveCount(0);
    await expect(panel.getByText(/실시간 클릭|라이브|연결 끊김|연결 중|이 화면을 연 이후/)).toHaveCount(0);
    await expect(panel.locator(".rounded-2xl")).toHaveCount(0);

    const feed = page.getByTestId("live-feed");
    await expect(feed).toBeVisible({ timeout: 10_000 });
    await expect(feed.getByRole("heading", { name: "지금" })).toBeVisible();
    await expect(feed.locator("li").first()).toContainText("KR · iOS · kakao");
    expect(streams[0]).toContain("streamToken=st-e2e");
  });

  test("facts only: no explanatory lines under the headings, the timezone once where hours are shown", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openWhen(page);
    const panel = page.locator("#stats-panel-when");
    await expect(panel.locator("h2, h3")).toHaveText(["일별 사람 클릭", "시간대", "요일 × 시간"]);
    await expect(panel.getByText(/진할수록|0~23시 분포|최근 30일 사람 클릭|히트맵/)).toHaveCount(0);
    await expect(panel.getByText("Asia/Seoul", { exact: true })).toHaveCount(1);
  });

  test("the demo tab has no frozen example feed", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ko/demo#when");
    await expect(page.getByTestId("hour-chart")).toBeVisible();
    await expect(page.locator("#stats-panel-when").getByText("예시", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("live-feed")).toHaveCount(0);
  });

  test("in dark mode the empty and lowest heatmap steps still stand off the page", async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await context.addCookies([{ name: "kurl_theme", value: "dark", domain: "localhost", path: "/" }]);
    await page.emulateMedia({ colorScheme: "dark" });
    await openWhen(page);
    const colors = await page.getByTestId("heatmap-hours").evaluate((grid) => {
      const page = getComputedStyle(document.body).backgroundColor;
      const steps = [...new Set([...grid.querySelectorAll("button")].map((b) => getComputedStyle(b).backgroundColor))];
      return { page, steps };
    });
    expect(colors.steps.length).toBeGreaterThanOrEqual(4);
    expect(colors.steps).not.toContain(colors.page);
  });
});
