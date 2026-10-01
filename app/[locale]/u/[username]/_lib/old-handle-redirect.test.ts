import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { oldHandleRedirect as OldHandleRedirect } from "./old-handle-redirect";

function headers(map: Record<string, string> = {}) {
  return { get: (name: string) => map[name] ?? null };
}

const apex = headers({ host: "short-link-frontend-blond.vercel.app" });
const cardSubdomain = headers({
  host: "short-link-frontend-blond.vercel.app",
  "x-original-host": "dohyun_old.kurl.me",
});

let redirectFor: typeof OldHandleRedirect;

// lib/host.ts reads NEXT_PUBLIC_KURL_HOST once at import, so the module is loaded after stubbing it.
beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_KURL_HOST", "kurl.me");
  vi.resetModules();
  redirectFor = (await import("./old-handle-redirect")).oldHandleRedirect;
});

afterEach(() => vi.unstubAllEnvs());

describe("oldHandleRedirect", () => {
  it("stays put when the requested handle is the current one, in any case", () => {
    expect(redirectFor(apex, "dohyun", "dohyun", "ko", {})).toBeNull();
    expect(redirectFor(cardSubdomain, "DoHyun", "dohyun", "ko", {})).toBeNull();
  });

  it("keeps an apex visitor on the apex card path", () => {
    expect(redirectFor(apex, "dohyun_old", "dohyun", "ja", {})).toBe("/ja/u/dohyun");
  });

  it("sends a card-subdomain visitor to the new subdomain instead of a nested path", () => {
    expect(redirectFor(cardSubdomain, "dohyun_old", "dohyun", "ko", {})).toBe("https://dohyun.kurl.me/");
  });

  it("carries the query over so the visit keeps its UTM", () => {
    const search = { utm_source: "instagram", utm_medium: "bio", tag: ["a", "b"], ref: "x&y" };
    expect(redirectFor(apex, "dohyun_old", "dohyun", "ko", search)).toBe(
      "/ko/u/dohyun?utm_source=instagram&utm_medium=bio&tag=a&tag=b&ref=x%26y",
    );
    expect(redirectFor(cardSubdomain, "dohyun_old", "dohyun", "ko", { utm_source: "instagram" })).toBe(
      "https://dohyun.kurl.me/?utm_source=instagram",
    );
  });
});
