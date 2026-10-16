import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FETCH_TIMEOUT_MS } from "@/lib/api/fetch-timeout";

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

async function load({ mocks = false } = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://api.test");
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", mocks ? "1" : "");
  return (await import("./fetch-profile")).fetchProfile;
}

function backend(answer: (init: RequestInit | undefined, url: string) => Promise<Response>) {
  const fetch = vi.fn((url: string, init?: RequestInit) => answer(init, url));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("fetchProfile", () => {
  it("returns the profile the backend found", async () => {
    const fetchProfile = await load();
    backend(async () => new Response(JSON.stringify({ username: "alice", entries: [] })));
    await expect(fetchProfile("alice")).resolves.toMatchObject({
      ok: true,
      data: { username: "alice" },
    });
  });

  it("reports a missing profile only when the backend answers 404", async () => {
    const fetchProfile = await load();
    backend(async () => new Response(null, { status: 404 }));
    await expect(fetchProfile("nobody")).resolves.toEqual({ ok: false, status: 404 });
  });

  it("treats a 5xx as an outage rather than a missing profile", async () => {
    const fetchProfile = await load();
    backend(async () => new Response(null, { status: 503 }));
    await expect(fetchProfile("alice")).resolves.toEqual({
      ok: false,
      status: "error",
      cause: "HTTP 503",
    });
  });

  it("treats an unreachable backend as an outage", async () => {
    const fetchProfile = await load();
    const refused = new TypeError("fetch failed");
    backend(async () => {
      throw refused;
    });
    await expect(fetchProfile("alice")).resolves.toEqual({
      ok: false,
      status: "error",
      cause: refused,
    });
  });

  it("gives up on a hung backend at the shared deadline and reports an outage", async () => {
    const fetchProfile = await load();
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    const deadline = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => timeout(10));
    backend(
      (init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
        }),
    );
    await expect(fetchProfile("alice")).resolves.toMatchObject({ ok: false, status: "error" });
    expect(deadline).toHaveBeenCalledWith(DEFAULT_FETCH_TIMEOUT_MS);
  });

  it("answers a repeat lookup right after a failure without calling the backend again", async () => {
    const fetchProfile = await load();
    const fetch = backend(async () => new Response(null, { status: 503 }));
    const first = await fetchProfile("alice");
    await expect(fetchProfile("alice")).resolves.toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks the backend again once the failure is a second old", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetchProfile = await load();
    const fetch = backend(async () => new Response(null, { status: 503 }));
    await fetchProfile("alice");
    vi.setSystemTime(Date.now() + 1_000);
    await fetchProfile("alice");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not hold on to a profile or a 404", async () => {
    const fetchProfile = await load();
    const fetch = backend(async (_init, url) =>
      url.endsWith("/nobody")
        ? new Response(null, { status: 404 })
        : new Response(JSON.stringify({ username: "alice", entries: [] })),
    );
    for (const handle of ["nobody", "nobody", "alice", "alice"]) await fetchProfile(handle);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("maps the mock's missing handle to a 404 without touching the network", async () => {
    const fetchProfile = await load({ mocks: true });
    const fetch = backend(async () => new Response(null, { status: 503 }));
    await expect(fetchProfile("missing_card")).resolves.toEqual({ ok: false, status: 404 });
    await expect(fetchProfile("dohyun")).resolves.toMatchObject({
      ok: true,
      data: { username: "dohyun" },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
