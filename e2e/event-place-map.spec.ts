import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const TOKYO = { lat: 35.6812, lng: 139.7671 };
const SKY = { lat: 35.6585, lng: 139.7022 };

type FakeOptions = {
  authFails?: boolean;
  manualReady?: boolean;
  geocode?: { place_id: string; formatted_address: string } | null;
};

async function fakeGoogleMaps(page: Page, options: FakeOptions = {}) {
  await page.addInitScript((opts: FakeOptions) => {
    type Handler = (event?: unknown) => void;
    const fake = {
      map: null as null | {
        options: Record<string, unknown>;
        center: unknown;
        zoom: number;
        tap(lat: number, lng: number, placeId?: string): { stopped: boolean };
      },
      pin: { position: null as unknown, shown: false },
    };
    class FakeMap {
      listeners: Record<string, Handler[]> = {};
      center: unknown;
      zoom: number;
      constructor(
        public element: HTMLElement,
        public options: { center: unknown; zoom: number },
      ) {
        this.center = options.center;
        this.zoom = options.zoom;
        fake.map = this;
        if (opts.manualReady) return;
        setTimeout(() => (opts.authFails ? window.gm_authFailure?.() : this.emit("tilesloaded")), 30);
      }
      addListener(name: string, handler: Handler) {
        (this.listeners[name] ??= []).push(handler);
        return { remove: () => (this.listeners[name] = this.listeners[name].filter((h) => h !== handler)) };
      }
      emit(name: string, event?: unknown) {
        for (const handler of this.listeners[name] ?? []) handler(event);
      }
      panTo(position: unknown) {
        this.center = position;
      }
      setCenter(position: unknown) {
        this.center = position;
      }
      setZoom(zoom: number) {
        this.zoom = zoom;
      }
      getZoom() {
        return this.zoom;
      }
      tap(lat: number, lng: number, placeId?: string) {
        const event = { latLng: { lat: () => lat, lng: () => lng }, placeId, stopped: false, stop: () => (event.stopped = true) };
        this.emit("click", event);
        return event;
      }
    }
    class FakeMarker {
      setPosition(position: unknown) {
        fake.pin.position = position;
      }
      setMap(map: unknown) {
        fake.pin.shown = map != null;
      }
    }
    class FakeGeocoder {
      geocode() {
        return opts.geocode ? Promise.resolve({ results: [opts.geocode] }) : Promise.reject(new Error("REQUEST_DENIED"));
      }
    }
    const libraries: Record<string, Record<string, unknown>> = {
      maps: { Map: FakeMap },
      marker: { Marker: FakeMarker },
      geocoding: { Geocoder: FakeGeocoder },
    };
    (window as unknown as { __fake: typeof fake }).__fake = fake;
    window.google = { maps: { importLibrary: async (name: string) => libraries[name] } };
  }, options);
}

async function places(page: Page) {
  const unexpected: string[] = [];
  await page.route(/^https:\/\/(maps\.googleapis\.com|places\.googleapis\.com|www\.google\.com\/maps)\//, (route) => {
    unexpected.push(route.request().url());
    return route.abort();
  });
  await page.route("https://places.googleapis.com/v1/places:autocomplete", (route) =>
    route.fulfill({
      json: {
        suggestions: [
          {
            placePrediction: {
              placeId: "ChIJ-shibuya-sky",
              structuredFormat: { mainText: { text: "SHIBUYA SKY" }, secondaryText: { text: "日本、東京都渋谷区渋谷2丁目" } },
            },
          },
        ],
      },
    }),
  );
  await page.route(/^https:\/\/places\.googleapis\.com\/v1\/places\/[\w-]+\?/, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    if (id === "ChIJ-shibuya-sky") return route.fulfill({ json: { location: { latitude: SKY.lat, longitude: SKY.lng } } });
    if (id === "ChIJ-poi-hachiko")
      return route.fulfill({ json: { displayName: { text: "忠犬ハチ公像" }, formattedAddress: "日本、〒150-0043 東京都渋谷区道玄坂２丁目１" } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.route(/^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?/, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>map</title><body>map</body>" }),
  );
  return unexpected;
}

async function organizer(page: Page, saved?: Record<string, unknown>) {
  const sent: Record<string, unknown>[] = [];
  const event = {
    id: 1, slug: "e2e-1", title: "장소 모집", descriptionMd: null, coverImageUrl: null, startsAt: "2030-01-15T10:00:00Z",
    endsAt: null, timezone: "Asia/Tokyo", locationText: null, locationUrl: null, onlineUrl: null, capacity: null,
    closeAt: null, contactField: "EMAIL", questions: [], status: "OPEN", registrationCount: 0, links: [],
    createdAt: "2026-09-23T00:00:00Z", ...saved,
  };
  await signIn(page);
  await mockBackend(page, {
    "POST /api/v1/events": (route) => {
      sent.push(JSON.parse(route.request().postData() ?? "{}"));
      return route.fulfill({ json: { ...event, ...sent.at(-1) } });
    },
    "GET /api/v1/events/1": (route) => route.fulfill({ json: event }),
  });
  return sent;
}

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
    const unexpected = await places(page);
    await organizer(page);
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
    const unexpected = await places(page);
    const sent = await organizer(page);
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
    await places(page);
    await organizer(page);
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
    await places(page);
    const sent = await organizer(page);
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
    await places(page);
    await organizer(page);
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
    await places(page);
    await organizer(page, {
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
    await places(page);
    await organizer(page);
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

  for (const [viewport, anchoring] of [
    [{ width: 390, height: 844 }, true],
    [{ width: 390, height: 844 }, false],
    [{ width: 1440, height: 600 }, true],
    [{ width: 1440, height: 600 }, false],
  ] as const) {
    test(`at ${viewport.width}px ${anchoring ? "with" : "without"} the browser's scroll anchoring, the map arriving above the organizer's view leaves what they read in place`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await fakeGoogleMaps(page, { manualReady: true });
      await places(page);
      await organizer(page);
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

  test("the map opens by growing in place on the house curve", async ({ page }) => {
    await fakeGoogleMaps(page, { manualReady: true });
    await places(page);
    await organizer(page);
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
    await places(page);
    await organizer(page);
    await page.goto("/ko/events/new");
    await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __fake: { map: unknown } }).__fake.map))).toBe(true);
    await search(page).scrollIntoViewIfNeeded();
    await page.evaluate(() => (window as unknown as { __fake: { map: { emit(name: string): void } } }).__fake.map.emit("tilesloaded"));
    await expect(reveal(page)).not.toHaveAttribute("aria-hidden", "true");
    await expect(reveal(page)).toHaveCSS("transition-property", "all");
    await expect(reveal(page)).toHaveCSS("transition-duration", "0s");
  });
});
