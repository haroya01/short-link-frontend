import type { Page } from "@playwright/test";

export async function mockAnonymousShorten(page: Page) {
  let seq = 0;
  await page.route("**/api/v1/pow/challenge", (route) =>
    route.fulfill({ json: { challenge: "e2e-challenge", difficulty: 1 } }),
  );
  await page.route("**/api/v1/links", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const code = `e2eAb${String(++seq).padStart(2, "0")}`;
    return route.fulfill({
      status: 201,
      json: { shortCode: code, shortUrl: `http://localhost:3001/${code}`, claimToken: null },
    });
  });
}
