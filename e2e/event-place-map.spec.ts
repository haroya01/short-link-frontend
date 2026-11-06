import { expect, test, type Page } from "@playwright/test";
import { SKY, TOKYO, fakeGoogleMaps, mockPlaces, placeOrganizer } from "./helpers/fake-google-maps";

const mapBox = (page: Page) => page.locator("#ef-panel-edit").getByTestId("location-map");
const reveal = (page: Page) => page.locator("#ef-panel-edit").getByTestId("location-map-reveal");
const search = (page: Page) => page.locator("#ef-panel-edit").getByRole("combobox", { name: "장소" });
const nameField = (page: Page) => page.locator("#ef-panel-edit").getByLabel("장소 이름");
const fakeState = (page: Page) =>
  page.evaluate(() => {
    const fake = (window as unknown as { __fake: { map: { center: unknown; zoom: number; options: Record<string, unknown> }; pin: unknown } }).__fake;
    return { center: fake.map?.center, zoom: fake.map?.zoom, options: fake.map?.options, pin: fake.pin };
  });

test.use({ timezoneId: "Asia/Tokyo" });

test.describe("event place, map first", () => {
  test("the map is open before anything is typed, on the time zone's city, and the link inputs stay out of the way", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fakeGoogleMaps(page);
    const unexpected = await mockPlaces(page);
    await placeOrganizer(page);
    await page.goto("/ko/events/new");

    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");
    await expect(reveal(page)).toHaveCSS("opacity", "1");
    await expect.poll(async () => (await fakeState(page)).center).toEqual(TOKYO);
    const state = await fakeState(page);
    expect(state.options).toMatchObject({ gestureHandling: "cooperative", clickableIcons: true });
    const box = (await mapBox(page).boundingBox())!;
    expect(Math.round((box.width / box.height) * 100) / 100).toBeCloseTo(4 / 3, 1);
    await expect(page.getByRole("button", { name: "링크로 넣기" })).toHaveCount(0);
    await expect(page.locator("#ef-locurl")).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });

  test("a search pick moves the map, drops a pin, and publishes the place link the event page reads", async ({ page }) => {
    await fakeGoogleMaps(page);
    const unexpected = await mockPlaces(page);
    const sent = await placeOrganizer(page);
    await page.goto("/ko/events/new");
    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");
    await page.locator("#ef-title").fill("장소 모집");

    await search(page).fill("渋谷");
    await expect(page.getByRole("listbox", { name: "장소" }).getByRole("option")).toHaveCount(1);
    await search(page).press("Enter");

    await expect(nameField(page)).toHaveValue("SHIBUYA SKY");
    await expect(search(page)).toHaveValue("");
    await expect(page.getByText("日本、東京都渋谷区渋谷2丁目")).toBeVisible();
    await expect.poll(async () => (await fakeState(page)).pin).toEqual({ position: SKY, shown: true });

    await expect(page.getByTestId("event-preview").locator('iframe[src*="/maps/embed/v1/place"]')).toHaveAttribute(
      "src",
      /q=place_id:ChIJ-shibuya-sky/,
    );

    await nameField(page).fill("SHIBUYA SKY, 46층");
    await expect.poll(async () => (await fakeState(page)).pin).toEqual({ position: SKY, shown: true });

    await page.getByRole("button", { name: "발행하기" }).click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({
      locationText: "SHIBUYA SKY, 46층",
      locationUrl: "https://www.google.com/maps/search/?api=1&query=SHIBUYA%20SKY&query_place_id=ChIJ-shibuya-sky",
    });
    expect(unexpected).toEqual([]);
  });

  test("tapping a place on the map fills its name and address and keeps Google's own info window shut", async ({ page }) => {
    await fakeGoogleMaps(page);
    await mockPlaces(page);
    await placeOrganizer(page);
    await page.goto("/ko/events/new");
    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");

    const stopped = await page.evaluate(() =>
      (window as unknown as { __fake: { map: { tap(a: number, b: number, c?: string): { stopped: boolean } } } }).__fake.map
        .tap(35.659, 139.7006, "ChIJ-poi-hachiko").stopped,
    );
    expect(stopped).toBe(true);
    await expect(nameField(page)).toHaveValue("忠犬ハチ公像");
    await expect(page.getByText("日本、〒150-0043 東京都渋谷区道玄坂２丁目１")).toBeVisible();
    await expect.poll(async () => (await fakeState(page)).pin).toEqual({ position: { lat: 35.659, lng: 139.7006 }, shown: true });

    await page.locator("#ef-panel-edit").getByRole("button", { name: "장소 지우기" }).click();
    await expect(nameField(page)).toHaveCount(0);
    await expect.poll(async () => ((await fakeState(page)).pin as { shown: boolean }).shown).toBe(false);
  });

  test("tapping a blank spot names it after the geocoded address", async ({ page }) => {
    await fakeGoogleMaps(page, { geocode: { place_id: "ChIJ-spot", formatted_address: "日本、東京都渋谷区神南1丁目" } });
    await mockPlaces(page);
    const sent = await placeOrganizer(page);
    await page.goto("/ko/events/new");
    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");
    await page.locator("#ef-title").fill("장소 모집");

    await page.evaluate(() =>
      (window as unknown as { __fake: { map: { tap(a: number, b: number): unknown } } }).__fake.map.tap(35.663, 139.699),
    );
    await expect(nameField(page)).toHaveValue("日本、東京都渋谷区神南1丁目");
    await page.getByRole("button", { name: "발행하기" }).click();
    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({ locationUrl: expect.stringContaining("query_place_id=ChIJ-spot") });
  });

  test("a blank spot the geocoder can't read leaves no pin and says so", async ({ page }) => {
    await fakeGoogleMaps(page, { geocode: null });
    await mockPlaces(page);
    await placeOrganizer(page);
    await page.goto("/ko/events/new");
    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");

    await page.evaluate(() =>
      (window as unknown as { __fake: { map: { tap(a: number, b: number): unknown } } }).__fake.map.tap(35.663, 139.699),
    );
    await expect(page.getByText("이 자리의 주소를 찾지 못했어요")).toBeVisible();
    await expect(nameField(page)).toHaveCount(0);
    await expect.poll(async () => ((await fakeState(page)).pin as { shown: boolean }).shown).toBe(false);
  });

  test("reopening an event puts the pin back on its saved place", async ({ page }) => {
    await fakeGoogleMaps(page);
    await mockPlaces(page);
    await placeOrganizer(page, {
      locationText: "SHIBUYA SKY, 46층",
      locationUrl: "https://www.google.com/maps/search/?api=1&query=SHIBUYA%20SKY&query_place_id=ChIJ-shibuya-sky",
    });
    await page.goto("/ko/events/1/edit");
    await expect(nameField(page)).toHaveValue("SHIBUYA SKY, 46층");
    await expect.poll(async () => (await fakeState(page)).pin).toEqual({ position: SKY, shown: true });
    expect((await fakeState(page)).center).toEqual(SKY);
  });

  test("when Google refuses the key the search-first flow stays, embed map and link button included", async ({ page }) => {
    await fakeGoogleMaps(page, { authFails: true });
    await mockPlaces(page);
    await placeOrganizer(page);
    await page.goto("/ko/events/new");

    await expect(mapBox(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "링크로 넣기" })).toBeVisible();
    await search(page).fill("渋谷");
    await expect(page.getByRole("listbox", { name: "장소" }).getByRole("option")).toHaveCount(1);
    await search(page).press("Enter");
    await expect(search(page)).toHaveValue("SHIBUYA SKY");
    await expect(page.locator('#ef-panel-edit iframe[src*="/maps/embed/v1/place"]')).toBeVisible();
    await expect(nameField(page)).toHaveCount(0);
  });

  test("the map opens by growing in place on the house curve", async ({ page }) => {
    await fakeGoogleMaps(page, { manualReady: true });
    await mockPlaces(page);
    await placeOrganizer(page);
    await page.goto("/ko/events/new");
    await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __fake: { map: unknown } }).__fake.map))).toBe(true);
    await search(page).scrollIntoViewIfNeeded();

    const opening = reveal(page);
    await expect(opening).toHaveCSS("grid-template-rows", "0px");
    await page.evaluate(() => (window as unknown as { __fake: { map: { emit(name: string): void } } }).__fake.map.emit("tilesloaded"));
    await expect(opening).toHaveCSS("transition-property", /grid-template-rows/);
    await expect(opening).toHaveCSS("transition-timing-function", "cubic-bezier(0.16, 1, 0.3, 1)");
    await expect(opening).toHaveCSS("opacity", "1");

  });

  test("with reduced motion the map opens at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fakeGoogleMaps(page, { manualReady: true });
    await mockPlaces(page);
    await placeOrganizer(page);
    await page.goto("/ko/events/new");
    await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __fake: { map: unknown } }).__fake.map))).toBe(true);
    await search(page).scrollIntoViewIfNeeded();
    await page.evaluate(() => (window as unknown as { __fake: { map: { emit(name: string): void } } }).__fake.map.emit("tilesloaded"));
    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");
    await expect(reveal(page)).toHaveCSS("transition-property", "all");
    await expect(reveal(page)).toHaveCSS("transition-duration", "0s");
  });
});
