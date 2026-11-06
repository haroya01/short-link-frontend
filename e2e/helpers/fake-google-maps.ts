import type { Page } from "@playwright/test";
import { mockBackend, signIn } from "./mock-backend";

export const TOKYO = { lat: 35.6812, lng: 139.7671 };
export const SKY = { lat: 35.6585, lng: 139.7022 };

export type FakeOptions = {
  authFails?: boolean;
  manualReady?: boolean;
  geocode?: { place_id: string; formatted_address: string } | null;
};

export async function fakeGoogleMaps(page: Page, options: FakeOptions = {}) {
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

export async function mockPlaces(page: Page) {
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

export async function placeOrganizer(page: Page, saved?: Record<string, unknown>) {
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
