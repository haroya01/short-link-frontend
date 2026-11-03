import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));

async function load({ mocks = false } = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://api.test");
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", mocks ? "1" : "");
  return (await import("./load-event")).loadEvent;
}

function backend(answer: () => Promise<Response>) {
  const fetch = vi.fn(answer);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("loadEvent", () => {
  it("returns the event the backend found", async () => {
    const loadEvent = await load();
    backend(async () => new Response(JSON.stringify({ slug: "rust", title: "Rust 모각코" })));
    await expect(loadEvent("rust")).resolves.toMatchObject({ ok: true, event: { slug: "rust" } });
  });

  it("reports a missing event only when the backend answers 404", async () => {
    const loadEvent = await load();
    backend(async () => new Response(null, { status: 404 }));
    await expect(loadEvent("nope")).resolves.toEqual({ ok: false, status: 404 });
  });

  it("treats a 5xx as an outage rather than a missing event", async () => {
    const loadEvent = await load();
    backend(async () => new Response(null, { status: 502 }));
    await expect(loadEvent("rust")).resolves.toEqual({ ok: false, status: "error", cause: "HTTP 502" });
  });

  it("treats an unreachable backend as an outage", async () => {
    const loadEvent = await load();
    const refused = new TypeError("fetch failed");
    backend(async () => {
      throw refused;
    });
    await expect(loadEvent("rust")).resolves.toEqual({ ok: false, status: "error", cause: refused });
  });

  it("serves the mock events without a backend in mock mode", async () => {
    const loadEvent = await load({ mocks: true });
    const fetch = backend(async () => new Response(null, { status: 500 }));
    await expect(loadEvent("mock-open")).resolves.toMatchObject({ ok: true, event: { slug: "mock-open" } });
    await expect(loadEvent("no-such-mock")).resolves.toEqual({ ok: false, status: 404 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
