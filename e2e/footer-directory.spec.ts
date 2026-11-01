import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

test("a visitor's footer links every use-case page, the guide and the company pages", async ({ page }) => {
  await page.goto("/ko");
  const footer = page.getByTestId("footer-directory");
  await expect(footer).toBeVisible();
  await expect(footer.getByRole("heading", { name: "쓰임새" })).toBeVisible();
  const uses = footer.locator('a[href*="/use/"]');
  await expect(uses).toHaveCount(8);
  for (const slug of [
    "free-url-shortener",
    "bitly-alternative",
    "link-in-bio",
    "instagram-profile-link",
    "kakaotalk-link-preview",
    "poster-qr-code",
    "flyer-qr-tracking",
    "qr-campaign-analytics",
  ]) {
    await expect(footer.locator(`a[href$="/ko/use/${slug}"]`)).toHaveCount(1);
  }
  await expect(footer.getByRole("link", { name: "숏링크 안내서" })).toHaveAttribute("href", /\/ko\/learn$/);
  await expect(footer.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", /\/ko\/terms$/);
});

test("the server HTML already carries the directory, so crawlers find the pages", async ({ request }) => {
  const html = await (await request.get("/ko")).text();
  expect(html).toContain('data-testid="footer-directory"');
  expect(html.match(/\/ko\/use\/[a-z-]+"/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
});

test("the product card in structured data names kurl.me and lists what a link can do", async ({ request }) => {
  const html = await (await request.get("/ko")).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const app = blocks.flatMap((b) => b["@graph"] ?? [b]).find((node) => node["@type"] === "SoftwareApplication");
  expect(app.alternateName).toBe("kurl.me");
  expect(app.featureList).toHaveLength(8);
  expect(app.featureList[0]).toBe("아는 사람만 열려요");
  expect(app.sameAs.every((url: string) => url.startsWith("https://apps.apple.com/app/id"))).toBe(true);
});

test("signed in, the app keeps the one-line footer", async ({ page }) => {
  await signIn(page);
  await mockBackend(page);
  await page.goto("/ko/more");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.getByTestId("footer-directory")).toHaveCount(0);
  await expect(page.locator("footer.site-footer").getByRole("link", { name: "이용약관" })).toBeVisible();
});
