import { describe, expect, it } from "vitest";
import { newSessionToken } from "./google-places";

describe("newSessionToken", () => {
  it("returns a non-empty string", () => {
    const token = newSessionToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns a different token on each call (collision essentially impossible)", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      tokens.add(newSessionToken());
    }
    expect(tokens.size).toBe(50);
  });

  it("returns a UUID v4 shape when crypto.randomUUID is available (modern browsers + jsdom)", () => {
    // jsdom 22+ exposes crypto.randomUUID — we should get a UUID-shaped token.
    const token = newSessionToken();
    if (typeof globalThis.crypto?.randomUUID === "function") {
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } else {
      // Fallback path — just check it's URL-safe-ish.
      expect(token).toMatch(/^[a-z0-9]+$/);
    }
  });
});
