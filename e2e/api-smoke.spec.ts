import { expect, test } from "@playwright/test";

import { powHeaders } from "./helpers/pow";

test.describe("backend API smoke tests via Next.js proxy", () => {
  test("anonymous shorten returns 201 with shortCode and shortUrl", async ({ request }) => {
    // Anonymous shorten requires a proof-of-work token (POW_REQUIRED otherwise).
    const res = await request.post("/api/v1/links", {
      data: { url: "https://example.com/api-smoke" },
      headers: { ...(await powHeaders(request)) },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.shortCode).toMatch(/^[0-9A-Za-z]{7}$/);
    expect(body.shortUrl).toContain(`/${body.shortCode}`);
  });

  test("anonymous shorten without proof-of-work is rejected with POW_REQUIRED", async ({
    request,
  }) => {
    const res = await request.post("/api/v1/links", {
      data: { url: "https://example.com/no-pow" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("POW_REQUIRED");
  });

  test("rejects malformed URL with 400", async ({ request }) => {
    const res = await request.post("/api/v1/links", {
      data: { url: "not-a-url" },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects missing URL with 400", async ({ request }) => {
    const res = await request.post("/api/v1/links", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("/api/v1/links/me requires auth -> 401", async ({ request }) => {
    const res = await request.get("/api/v1/links/me");
    expect(res.status()).toBe(401);
  });

  test("stats endpoint requires auth -> 401", async ({ request }) => {
    const res = await request.get("/api/v1/links/abc1234/stats");
    expect(res.status()).toBe(401);
  });

  test("invalid custom code rejected with VALIDATION_FAILED", async ({ request }) => {
    const res = await request.post("/api/v1/links", {
      data: { url: "https://example.com", customCode: "has-dash" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
  });
});
