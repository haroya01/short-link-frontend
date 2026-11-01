import { expect, test } from "@playwright/test";

const CODE = "e2eLive1";

function event(name: string, data: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

test("a link made without signing in shows its own clicks as they land", async ({ page }) => {
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { challenge: "e2e-challenge", difficulty: 1 } }),
  );
  await page.route("**/api/v1/links", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 201,
      json: { shortCode: CODE, shortUrl: `http://localhost:3001/${CODE}`, claimToken: "claim-e2e" },
    });
  });
  const streams: string[] = [];
  await page.route(`**/api/v1/links/${CODE}/stream**`, (route) => {
    streams.push(route.request().url());
    const body =
      streams.length === 1
        ? event("ready", { ok: true }) +
          event("click", { occurredAt: "2026-11-01T09:00:00Z", countryCode: "US", deviceClass: "Bot", channel: "direct", bot: true }) +
          event("click", { occurredAt: "2026-11-01T09:00:02Z", countryCode: "KR", deviceClass: "iOS", channel: "instagram", bot: false })
        : event("ready", { ok: true });
    return route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body });
  });

  await page.goto("/ko");
  await page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true }).fill("https://example.com/live");
  await page.getByRole("button", { name: "단축하기" }).click();

  const live = page.getByTestId("live-clicks");
  await expect(live).toContainText("클릭 1", { timeout: 10_000 });
  await expect(live).toContainText("봇 1");
  await expect(live).toContainText("KR · iOS · instagram");
  expect(streams[0]).toContain("claimToken=claim-e2e");
  expect(streams[0]).not.toContain("streamToken");
});

test("the heading's line folds a long address into a short one once, then gives way to the real answer", async ({ page }) => {
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { challenge: "e2e-challenge", difficulty: 1 } }),
  );
  await page.route("**/api/v1/links", (route) =>
    route.request().method() !== "POST"
      ? route.fallback()
      : route.fulfill({ status: 201, json: { shortCode: "e2eFold1", shortUrl: "http://localhost:3001/e2eFold1", claimToken: null } }),
  );
  await page.goto("/ko");
  const demo = page.getByTestId("fold-demo");
  await expect(demo).toHaveAttribute("aria-hidden", "true");
  await expect(demo).toContainText("kurl.me/");
  const runs = await demo.evaluate((el) =>
    el.getAnimations({ subtree: true }).map((a) => (a.effect as KeyframeEffect).getTiming().iterations),
  );
  expect(runs.length).toBeGreaterThan(0);
  expect(runs.every((n) => n === 1)).toBe(true);

  await page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true }).fill("https://example.com/fold");
  await page.getByRole("button", { name: "단축하기" }).click();
  await expect(page.getByTestId("result-line").first()).toBeVisible({ timeout: 10_000 });
  await expect(demo).toHaveCount(0);
});

test("with reduced motion the fold is already done: the short address and its line, nothing moving", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await page.goto("/ko");
  const demo = page.getByTestId("fold-demo");
  await expect(demo).toBeAttached();
  const state = await demo.evaluate((el) => ({
    moving: el.getAnimations({ subtree: true }).length,
    long: getComputedStyle(el.querySelector(".fold-long")!).opacity,
    short: getComputedStyle(el.querySelector(".fold-short")!).opacity,
    line: getComputedStyle(el.querySelector(".fold-line")!).transform,
  }));
  expect(state).toEqual({ moving: 0, long: "0", short: "1", line: "matrix(1, 0, 0, 1, 0, 0)" });
  await context.close();
});

test("the landing is the tool alone: one line of heading, the field, no staged example", async ({ page }) => {
  await page.goto("/ko");
  await expect(page.getByTestId("home-hero-heading")).toHaveText("단축은 한 줄");
  await expect(page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("예시", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(0);
});
