import { test, expect } from "@playwright/test";
import ko from "../messages/ko.json";
import ja from "../messages/ja.json";
import en from "../messages/en.json";

const CATALOGS = { ko, ja, en };

for (const width of [360, 390]) {
  test.describe(`phone ${width}`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });

    for (const [lang, { compose, notes }] of Object.entries(CATALOGS)) {
      test(`${lang}: the note composer keeps every control inside the sheet`, async ({ page }) => {
        await page.goto(`/${lang}/blog/notes`);
        await page.locator('header.vt-app-header [data-compose-trigger="mobile"]').click({ timeout: 30_000 });
        await page.getByRole("dialog").getByText(compose.note, { exact: true }).first().click();
        const sheet = page.getByRole("dialog", { name: compose.noteTitle });
        const submit = sheet.getByRole("button", { name: notes.submit, exact: true });
        await expect(submit).toBeVisible();

        const panel = (await sheet.boundingBox())!;
        const button = (await submit.boundingBox())!;
        expect(button.x + button.width, "submit inside the sheet").toBeLessThanOrEqual(panel.x + panel.width);
        const visibility = (await sheet.getByRole("combobox", { name: notes.visibilityLabel }).boundingBox())!;
        expect(visibility.width, "visibility still shows its value").toBeGreaterThan(24);

        await sheet.getByRole("textbox").first().fill("long labels");
        await submit.click();
        await expect(page.getByRole("button", { name: notes.noticeConfirm })).toBeVisible();
        expect((await sheet.boundingBox())!.x, "the sheet stays put behind the notice").toBe(panel.x);
      });
    }

    for (const lang of ["ja", "en"] as const) {
      test(`${lang}: profile tabs that run past the edge fade there, and the fade follows the scroll`, async ({ page }) => {
        await page.goto(`/${lang}/p/minji`);
        const nav = page.locator("nav:has([data-tab])");
        await expect(nav).toHaveAttribute("data-edge-end", "true", { timeout: 30_000 });
        await expect(nav).not.toHaveAttribute("data-edge-start", "true");
        await nav.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
        await expect(nav).toHaveAttribute("data-edge-start", "true");
        await expect(nav).not.toHaveAttribute("data-edge-end", "true");
      });
    }
  });
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("profile tabs that fit carry no fade", async ({ page }) => {
    await page.goto("/en/p/minji");
    const nav = page.locator("nav:has([data-tab])");
    await expect(nav.locator("[data-tab]").first()).toBeVisible({ timeout: 30_000 });
    await expect(nav).not.toHaveAttribute("data-edge-end", "true");
    expect(await nav.evaluate((el) => getComputedStyle(el).maskImage)).toBe("none");
  });

  test("en: a who-to-follow reason reads in full", async ({ page }) => {
    await page.goto("/en/blog/notes");
    const reason = page.getByText(/^Followed by \d+ (person|people) you follow$/).first();
    await expect(reason).toBeVisible({ timeout: 30_000 });
    expect(await reason.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });

  test("ja: an opening bracket that starts a line sits flush with the line", async ({ page }) => {
    await page.goto("/ja/blog?q=zzqxwv");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("「zzqxwv」", { timeout: 30_000 });
    expect(await heading.evaluate((el) => getComputedStyle(el).getPropertyValue("text-spacing-trim"))).toBe("trim-start");
  });
});
