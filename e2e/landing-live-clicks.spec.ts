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
  await expect(live.locator(".count-roll")).toHaveText("클릭 1");
  await expect(page.getByTestId("result-line").first().getByTestId("click-pass")).toBeAttached();
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

test("the landing leads with the tool, then lists what a link can do in plain words, no staged example", async ({ page }) => {
  await page.goto("/ko");
  await expect(page.getByTestId("home-hero-heading")).toHaveText("단축은 한 줄");
  await expect(page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("예시", { exact: true })).toHaveCount(0);
  const headings = page.getByRole("main").getByRole("heading", { level: 2 });
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText("링크마다 할 수 있는 것");

  const list = page.getByRole("region", { name: "링크마다 할 수 있는 것" }).getByRole("listitem");
  await expect(list).toHaveCount(8);
  await expect(list.first()).toContainText("아는 사람만 열려요");
  await expect(list.first()).toContainText("비밀번호");
  await expect(page.getByRole("link", { name: /카톡에 붙였을 때 보이는 카드를 직접 정해요/ })).toHaveAttribute("href", /\/ko\/use\/kakaotalk-link-preview$/);
  await expect(page.getByRole("link", { name: /어느 전단지에서 찍었는지까지 나눠 봐요/ })).toHaveAttribute("href", /\/ko\/use\/flyer-qr-tracking$/);
});

test("shortening folds the address you typed into the short one, in place", async ({ page }) => {
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { challenge: "e2e-challenge", difficulty: 1 } }),
  );
  await page.route("**/api/v1/links", (route) =>
    route.request().method() !== "POST"
      ? route.fallback()
      : route.fulfill({ status: 201, json: { shortCode: "e2eFold2", shortUrl: "http://localhost:3001/e2eFold2", claimToken: null } }),
  );
  await page.goto("/ko");
  await page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true }).fill("https://example.com/a/very/long/path?utm_source=fold");
  await page.getByRole("button", { name: "단축하기" }).click();
  const line = page.getByTestId("result-line").first();
  await expect(line).toBeVisible({ timeout: 10_000 });
  const folding = line.locator(".result-fold-long");
  await expect(folding).toHaveAttribute("aria-hidden", "true");
  await expect(folding).toHaveText("https://example.com/a/very/long/path?utm_source=fold");
  await expect.poll(() => folding.evaluate((el) => getComputedStyle(el).opacity), { timeout: 3_000 }).toBe("0");
  await expect(line.getByRole("link", { name: /e2eFold2/ })).toBeVisible();
});
