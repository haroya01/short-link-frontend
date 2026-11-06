import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fakeApi = { Map: class {}, Marker: class {}, Geocoder: class {} };

async function freshLoader() {
  vi.resetModules();
  return import("./google-maps-js");
}

function provideGoogle() {
  window.google = {
    maps: {
      importLibrary: async (name: string) =>
        ({ maps: { Map: fakeApi.Map }, marker: { Marker: fakeApi.Marker }, geocoding: { Geocoder: fakeApi.Geocoder } })[name] ?? {},
    },
  };
}

beforeEach(() => {
  document.head.innerHTML = "";
  delete window.google;
  delete window.gm_authFailure;
  delete window.__kurlMapsReady;
});

afterEach(() => {
  delete window.google;
});

describe("loading the Maps JavaScript API", () => {
  it("never starts without a key", async () => {
    const { loadMapsJs } = await freshLoader();
    await expect(loadMapsJs("", "ko")).rejects.toThrow();
    expect(document.querySelector("script")).toBeNull();
  });

  it("injects one script and resolves the map classes once Google calls back", async () => {
    const { loadMapsJs, mapsJsFailed } = await freshLoader();
    const loading = loadMapsJs("key-1", "ja");
    loadMapsJs("key-1", "ja");
    const scripts = document.querySelectorAll("script");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain("key=key-1");
    expect(scripts[0].src).toContain("language=ja");
    expect(scripts[0].src).toContain("callback=__kurlMapsReady");

    provideGoogle();
    window.__kurlMapsReady?.();
    const api = await loading;
    expect(api.Map).toBe(fakeApi.Map);
    expect(api.Marker).toBe(fakeApi.Marker);
    expect(api.Geocoder).toBe(fakeApi.Geocoder);
    expect(mapsJsFailed()).toBe(false);
  });

  it("falls back for good when the script fails to load", async () => {
    const { loadMapsJs, mapsJsFailed } = await freshLoader();
    const loading = loadMapsJs("key-1", "ko");
    document.querySelector("script")?.dispatchEvent(new Event("error"));
    await expect(loading).rejects.toThrow();
    expect(mapsJsFailed()).toBe(true);
    await expect(loadMapsJs("key-1", "ko")).rejects.toThrow();
  });

  it("tells the field to fall back when Google rejects the key, as with ApiNotActivatedMapError", async () => {
    const { loadMapsJs, mapsJsFailed, onMapsJsFailure } = await freshLoader();
    provideGoogle();
    const fellBack = vi.fn();
    onMapsJsFailure(fellBack);
    await loadMapsJs("key-1", "ko");
    window.gm_authFailure?.();
    expect(fellBack).toHaveBeenCalledTimes(1);
    expect(mapsJsFailed()).toBe(true);
  });
});
