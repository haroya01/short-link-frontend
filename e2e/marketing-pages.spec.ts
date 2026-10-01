import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/ko/about", heading: /kurl/ },
  { path: "/ko/terms", heading: /이용약관/ },
  { path: "/ko/privacy", heading: /개인정보/ },
  { path: "/ko/report", heading: /링크 신고/ },
];

test.describe("marketing & legal pages", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} renders heading and footer links`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "GitHub" })).toBeVisible();
      await expect(page.getByRole("contentinfo").getByRole("link", { name: "이용약관" })).toBeVisible();
      await expect(page.getByRole("contentinfo").getByRole("link", { name: "링크 신고" })).toHaveAttribute(
        "href",
        /\/ko\/report$/,
      );
    });
  }

  test("security.txt points reporters at the report page", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    expect(await res.text()).toContain("Contact: https://kurl.me/en/report");
  });

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
