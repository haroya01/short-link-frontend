import { expect, test } from "@playwright/test";

import { createLink } from "./helpers/links";

// The shorten form no longer carries a dedicated UTM builder — visitors put utm_* params on the
// URL themselves before shortening. What still matters, and what these specs guard, is that the
// backend redirect carries the destination's query string through verbatim so attribution isn't
// lost. Short codes redirect from the backend host directly, not the Next proxy, so hit BACKEND.
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080";

test.describe("UTM params survive the shorten → redirect round trip", () => {
  test("utm params on the destination URL are preserved on redirect", async ({ request }) => {
    const target =
      "https://example.com/utm-test?utm_source=newsletter&utm_medium=email&utm_campaign=e2e-test";
    // Anonymous shorten goes through the PoW handshake (see helpers/links + helpers/pow).
    const { shortCode } = await createLink(request, target);

    const res = await request.get(`${BACKEND}/${shortCode}`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const location = res.headers()["location"];
    expect(location).toContain("utm_source=newsletter");
    expect(location).toContain("utm_medium=email");
    expect(location).toContain("utm_campaign=e2e-test");
  });

  test("a destination without utm params redirects without any utm_", async ({ request }) => {
    const { shortCode } = await createLink(request, "https://example.com/utm-empty");

    const res = await request.get(`${BACKEND}/${shortCode}`, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).not.toContain("utm_");
  });
});
