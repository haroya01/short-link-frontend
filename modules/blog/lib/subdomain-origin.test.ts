import { describe, expect, it } from "vitest";
import { subdomainOrigin } from "./subdomain-origin";

/** A header reader stub backed by a plain map. */
function headers(map: Record<string, string>) {
  return { get: (name: string) => map[name] ?? null };
}

describe("subdomainOrigin", () => {
  it("prefers the middleware-forwarded x-original-host", () => {
    const req = headers({ "x-original-host": "dohyeon.kurl.me", host: "kurl.me" });
    expect(subdomainOrigin(req, "dohyeon")).toBe("https://dohyeon.kurl.me");
  });

  it("falls back to the plain host when x-original-host is absent", () => {
    const req = headers({ host: "dohyeon.kurl.me" });
    expect(subdomainOrigin(req, "dohyeon")).toBe("https://dohyeon.kurl.me");
  });

  it("strips a port from the host", () => {
    const req = headers({ host: "localhost:3001" });
    expect(subdomainOrigin(req, "dohyeon")).toBe("https://localhost");
  });

  it("falls back to the username subdomain when no host header is present", () => {
    const req = headers({});
    expect(subdomainOrigin(req, "dohyeon")).toBe("https://dohyeon.kurl.me");
  });
});
