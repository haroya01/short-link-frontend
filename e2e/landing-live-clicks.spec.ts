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

test("with reduced motion the fold and the three scenes are already done, nothing moving", async ({ browser }) => {
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
  const scenes = await page.locator("[data-reveal]").evaluateAll((els) =>
    els.map((el) => ({
      moving: el.getAnimations({ subtree: true }).length,
      hidden: [...el.querySelectorAll(".scene-in, .scene-roll")].filter((piece) => getComputedStyle(piece).opacity !== "1").length,
      undrawn: [...el.querySelectorAll(".scene-draw")].filter((path) => getComputedStyle(path).strokeDashoffset !== "0px").length,
      line: [...el.querySelectorAll(".scene-line")].map((line) => getComputedStyle(line).transform),
    })),
  );
  expect(scenes).toEqual([
    { moving: 0, hidden: 0, undrawn: 0, line: ["none"] },
    { moving: 0, hidden: 0, undrawn: 0, line: [] },
    { moving: 0, hidden: 0, undrawn: 0, line: ["none"] },
  ]);
  await context.close();
});

test("the landing leads with the tool, then says what a link can do in three lines, each acted out once", async ({ page }) => {
  await page.goto("/ko");
  await expect(page.getByTestId("home-hero-heading")).toHaveText("단축은 한 줄");
  await expect(page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("예시", { exact: true })).toHaveCount(0);
  const headings = page.getByRole("main").getByRole("heading", { level: 2 });
  await expect(headings).toHaveCount(1);
  await expect(headings).toHaveText("링크마다 할 수 있는 것");

  const region = page.getByRole("region", { name: "링크마다 할 수 있는 것" });
  await expect(region.getByRole("heading", { level: 3 })).toHaveText([
    "누가, 언제 열지 정해요",
    "어디로, 어떻게 보낼지 정해요",
    "누가 눌렀는지 봐요",
  ]);
  const groups = region.getByTestId("ability-group");
  await expect(groups).toHaveCount(3);
  await expect(groups.first()).toContainText("비밀번호 · 나라 차단 · 예약 공개 · 만료");
  await expect(groups.nth(1)).toContainText("A/B · 나라와 기기별 페이지 · 앱 밖에서 열기 · 미리보기 카드");
  await expect(region.getByRole("link")).toHaveCount(0);

  const scene = groups.last().locator("[data-reveal]");
  await expect(scene).toHaveAttribute("aria-hidden", "true");
  await expect(scene).toHaveAttribute("data-reveal", "off");
  await expect.poll(() => scene.locator(".scene-in").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-reveal", "on");
  await expect
    .poll(() => scene.evaluate((el) => el.getAnimations({ subtree: true }).map((a) => a.playState)), { timeout: 4_000 })
    .toEqual(Array(6).fill("finished"));
  await expect(scene).toContainText("클릭 2");
  await expect(scene.locator(".scene-in").first()).toHaveCSS("opacity", "1");
  await expect(scene.getByTestId("scene-strike")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await expect(scene.getByTestId("scene-strike").locator("..")).toHaveText("US · Bot · direct");
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
