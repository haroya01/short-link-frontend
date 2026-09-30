import { beforeEach, describe, expect, it } from "vitest";
import { handOverTwoFactorChallenge, takeTwoFactorChallenge } from "@/lib/two-factor-challenge";

describe("two-factor challenge handoff", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("hands the Apple challenge to the 2FA page once", () => {
    handOverTwoFactorChallenge("apple-challenge");

    expect(takeTwoFactorChallenge()).toBe("apple-challenge");
    expect(takeTwoFactorChallenge()).toBeNull();
  });

  it("keeps the challenge out of the URL and out of localStorage", () => {
    handOverTwoFactorChallenge("apple-challenge");

    expect(window.location.href).not.toContain("apple-challenge");
    expect(JSON.stringify({ ...window.localStorage })).not.toContain("apple-challenge");
  });

  it("returns null when nothing was handed over, so the server falls back to the cookie", () => {
    expect(takeTwoFactorChallenge()).toBeNull();
  });
});
