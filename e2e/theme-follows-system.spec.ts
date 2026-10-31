import { expect, test } from "@playwright/test";
import { mockBackend } from "./helpers/mock-backend";

const isDark = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

test("kurl log follows a dark OS until the reader picks a theme; the link tool keeps its white default", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await mockBackend(page);

  await page.goto("/ko/blog");
  expect(await isDark(page)).toBe(true);

  await page.goto("/ko");
  expect(await isDark(page)).toBe(false);

  await context.addCookies([{ name: "theme", value: "light", domain: "localhost", path: "/" }]);
  await page.goto("/ko/blog");
  expect(await isDark(page)).toBe(false);
});

test("an open kurl log page follows the OS when it switches, while nothing is picked", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await mockBackend(page);
  await page.goto("/ko/blog");
  expect(await isDark(page)).toBe(false);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => isDark(page)).toBe(true);
});
