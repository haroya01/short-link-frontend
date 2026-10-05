import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_BASE", "https://api.test");
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "");
  return (await import("./fetch-profile")).fetchProfile;
}

function respond(status: number, body: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchProfile", () => {
  it("is null only when the backend says the profile doesn't exist", async () => {
    const fetchProfile = await load();
    respond(404);
    await expect(fetchProfile("nobody")).resolves.toBeNull();
  });

  it("throws when the backend is failing, so a real page isn't answered with a 404", async () => {
    const fetchProfile = await load();
    respond(503);
    await expect(fetchProfile("someone")).rejects.toThrow("503");
  });

  it("returns the profile the backend found", async () => {
    const fetchProfile = await load();
    respond(200, { username: "someone", entries: [] });
    await expect(fetchProfile("someone")).resolves.toMatchObject({ username: "someone" });
  });
});
