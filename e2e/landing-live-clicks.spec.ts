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

test("the landing is the tool alone: one line of heading, the field, no staged example", async ({ page }) => {
  await page.goto("/ko");
  await expect(page.getByTestId("home-hero-heading")).toHaveText("단축은 한 줄");
  await expect(page.getByPlaceholder("긴 주소 붙여넣기").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("예시", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(0);
});
