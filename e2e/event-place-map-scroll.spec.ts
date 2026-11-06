import { expect, test, type Page } from "@playwright/test";
import { fakeGoogleMaps, mockPlaces, placeOrganizer } from "./helpers/fake-google-maps";

const search = (page: Page) => page.locator("#ef-panel-edit").getByRole("combobox", { name: "장소" });
const reveal = (page: Page) => page.locator("#ef-panel-edit").getByTestId("location-map-reveal");

test.use({ timezoneId: "Asia/Tokyo" });

test.describe("event place map arriving late", () => {
  for (const [viewport, anchoring] of [
    [{ width: 390, height: 844 }, true],
    [{ width: 390, height: 844 }, false],
    [{ width: 1440, height: 600 }, true],
    [{ width: 1440, height: 600 }, false],
  ] as const) {
    test(`at ${viewport.width}px ${anchoring ? "with" : "without"} the browser's scroll anchoring, the map arriving above the organizer's view leaves what they read in place`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fakeGoogleMaps(page, { manualReady: true });
      await mockPlaces(page);
      await placeOrganizer(page);
      await page.goto("/ko/events/new");
      await expect(search(page)).toBeVisible();
      await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __fake: { map: unknown } }).__fake.map))).toBe(true);

      if (!anchoring) await page.addStyleTag({ content: "html { overflow-anchor: none !important; }" });
      await reveal(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 40));
      const reading = page.locator("#ef-cap");
      const before = (await reading.boundingBox())!.y;
      expect((await reveal(page).boundingBox())!.y).toBeLessThan(0);
      expect(before).toBeGreaterThan(0);
      expect(before).toBeLessThan(viewport.height);

      await page.evaluate(() => (window as unknown as { __fake: { map: { emit(name: string): void } } }).__fake.map.emit("tilesloaded"));
      await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");
      await page.waitForTimeout(600);
      expect(Math.abs((await reading.boundingBox())!.y - before)).toBeLessThanOrEqual(1);
    });
  }
});
