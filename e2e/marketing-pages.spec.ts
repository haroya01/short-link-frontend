import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/about", heading: /kurl/ },
  { path: "/pricing", heading: /요금제/ },
  { path: "/terms", heading: /이용약관/ },
  { path: "/privacy", heading: /개인정보/ },
];

test.describe("marketing & legal pages", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} renders heading and footer links`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
      await expect(page.getByRole("link", { name: "이용약관" })).toBeVisible();
    });
  }

  test("robots.txt is reachable", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Sitemap:");
  });

  test("sitemap.xml lists locale-prefixed paths", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/en");
    expect(body).toContain("/ko");
    expect(body).toContain("/ja");
  });
});
