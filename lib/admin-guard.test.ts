import { afterEach, describe, expect, it, vi } from "vitest";

// notFound() throws a sentinel Next uses to render the 404 boundary; we assert that throw.
const NOT_FOUND = new Error("NEXT_NOT_FOUND");
const notFound = vi.fn(() => {
  throw NOT_FOUND;
});

let cookieJar = new Map<string, string>();
const cookies = vi.fn(() => ({
  get: (name: string) =>
    cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
}));

vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("next/headers", () => ({ cookies: () => cookies() }));

import { guardAdminServer } from "./admin-guard";

afterEach(() => {
  cookieJar = new Map();
  notFound.mockClear();
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
});

describe("guardAdminServer", () => {
  it("hard-404s an anonymous visitor (no session cookie)", () => {
    expect(() => guardAdminServer()).toThrow(NOT_FOUND);
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("lets a signed-in visitor through (session cookie present)", () => {
    cookieJar.set("kurl_has_session", "1");
    expect(() => guardAdminServer()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("treats a non-'1' session cookie value as anonymous", () => {
    cookieJar.set("kurl_has_session", "");
    expect(() => guardAdminServer()).toThrow(NOT_FOUND);
  });

  it("does not gate in mock mode — the client guard governs there", () => {
    process.env.NEXT_PUBLIC_USE_MOCKS = "1";
    expect(() => guardAdminServer()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });
});
