import { expect, test } from "@playwright/test";

// Short codes redirect from the backend host directly (kurl.me/{code}), not through the Next proxy,
// so hit BACKEND_URL rather than the frontend baseURL the other specs use.
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

// Regression: a tracked link (?src=…) or UTM link used to 401 instead of redirecting — the security
// matcher's regex is evaluated against the URL *including* the query string, so a query-less anchor
// dropped it to anyRequest().authenticated(). These guard that a query string never breaks redirects.
test.describe("short-code redirect tolerates tracking query strings", () => {
  test("redirects bare, ?src, and ?utm without 401", async ({ request }) => {
    const target = "https://example.com/redirect-qs-regression";
    const created = await request.post("/api/v1/links", { data: { url: target } });
    expect(created.status()).toBe(201);
    const { shortCode } = await created.json();

    for (const path of [
      `/${shortCode}`,
      `/${shortCode}?src=kakao`,
      `/${shortCode}?utm_source=newsletter&utm_medium=email`,
    ]) {
      const res = await request.get(`${BACKEND}${path}`, { maxRedirects: 0 });
      expect(res.status(), `GET ${path} must 302, not 401`).toBe(302);
      expect(res.headers()["location"]).toContain("example.com/redirect-qs-regression");
    }
  });
});
