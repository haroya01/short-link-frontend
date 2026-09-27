import { describe, expect, it } from "vitest";
import robots from "./robots";
import { routing } from "@/i18n/routing";

// robots paths match URL prefixes, with * spanning slashes (unlike route-segment wildcards).
function isBlocked(path: string): boolean {
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;
  const disallow = rule.disallow ?? [];
  return (Array.isArray(disallow) ? disallow : [disallow]).some((pattern) =>
    new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}`).test(path),
  );
}

describe("public content crawl access", () => {
  it.each(["write-better", "analytics-guide", "login-with-oauth", "admin", "settings", "webhooks"])(
    "allows public posts and tags named %s",
    (slug) => {
      expect(isBlocked(`/@writer/${slug}`)).toBe(false);
      expect(isBlocked(`/tags/${slug}`)).toBe(false);
      for (const locale of routing.locales) {
        expect(isBlocked(`/${locale}/@writer/${slug}`)).toBe(false);
        expect(isBlocked(`/${locale}/tags/${slug}`)).toBe(false);
      }
    },
  );

  it("still blocks workspace routes and API requests", () => {
    expect(isBlocked("/api/v1/users/me")).toBe(true);
    for (const prefix of ["", ...routing.locales.map((locale) => `/${locale}`)]) {
      for (const route of ["/write/new", "/analytics", "/login", "/stats/abc", "/dashboard"]) {
        expect(isBlocked(`${prefix}${route}`)).toBe(true);
      }
    }
    expect(isBlocked("/ko/blog/write/new")).toBe(true);
    expect(isBlocked("/en/links/dashboard")).toBe(true);
  });
});
