import { describe, expect, it } from "vitest";
import { shortenPayload } from "./payload";

const base = {
  url: "https://example.com/deck",
  authenticated: true,
  customCode: "",
  expiresAt: "",
  lockOn: true,
  password: "open-sesame",
};

describe("shortenPayload", () => {
  it("sends the password when a signed-in user turned the lock on", () => {
    expect(shortenPayload(base).password).toBe("open-sesame");
  });

  it("trims the password the same way the protection editor does", () => {
    expect(shortenPayload({ ...base, password: " pw " }).password).toBe("pw");
  });

  it("drops the password when the lock is off", () => {
    expect(shortenPayload({ ...base, lockOn: false }).password).toBeUndefined();
  });

  it("drops a blank password", () => {
    expect(shortenPayload({ ...base, password: "   " }).password).toBeUndefined();
  });

  it("never sends account-only options for anonymous visitors", () => {
    const payload = shortenPayload({ ...base, authenticated: false, customCode: "myLink", expiresAt: "2026-12-01T10:00" });
    expect(payload).toEqual({ url: base.url, customCode: undefined, expiresAt: undefined, password: undefined });
  });
});
