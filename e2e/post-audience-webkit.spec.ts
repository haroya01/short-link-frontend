import http from "node:http";
import { test, expect, type Page } from "@playwright/test";

const PORT = Number(process.env.E2E_API_PORT ?? 0);
const ALLOWED_HEADERS = "authorization, content-type, x-request-id, x-pow-challenge, x-pow-nonce, x-post-key, x-post-grant";

type Seen = { method: string; path: string; query: URLSearchParams; headers: http.IncomingHttpHeaders };

test.skip(!PORT, "runs against a build whose NEXT_PUBLIC_API_BASE is http://127.0.0.1:$E2E_API_PORT");

let server: http.Server;
const seen: Seen[] = [];

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    seen.push({ method: req.method ?? "", path: url.pathname, query: url.searchParams, headers: req.headers });
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
      res.writeHead(200);
      res.end();
      return;
    }
    res.writeHead(url.pathname.endsWith("/view") ? 202 : 404, { "Content-Type": "application/json" });
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test.beforeEach(async ({ page }) => {
  seen.length = 0;
  await page.addInitScript(() => {
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
    window.localStorage.setItem("kurl:mock-signed-out", "1");
  });
});

const viewOf = (slug: string) => `/api/v1/public/profiles/hana/posts/${slug}/view`;
const beacon = (slug: string) => seen.find((r) => r.method === "POST" && r.path === viewOf(slug));
const preflight = (slug: string) => seen.find((r) => r.method === "OPTIONS" && r.path === viewOf(slug));

async function waitForBeacon(slug: string) {
  await expect.poll(() => Boolean(beacon(slug)), { timeout: 15_000 }).toBe(true);
}

async function openKeyed(page: Page) {
  await page.goto("/ko/p/hana/link-only-draft?k=mock-unlisted-key");
  await expect(page.locator(".prose-post")).toContainText("소프트 줄바꿈 첫 줄", { timeout: 30_000 });
}

test("a keyed link-only post's view beacon carries the key across origins, through the preflight", async ({ page }) => {
  await openKeyed(page);
  await waitForBeacon("link-only-draft");
  expect(preflight("link-only-draft")?.headers["access-control-request-headers"]).toContain("x-post-key");
  expect(beacon("link-only-draft")?.headers["x-post-key"]).toBe("mock-unlisted-key");
  const referer = beacon("link-only-draft")?.headers.referer ?? "";
  expect(referer).not.toContain("mock-unlisted-key");
  expect(referer).not.toContain("link-only-draft");
});

test("the next post's beacon reports the link-only post it came from without its key", async ({ page }) => {
  await openKeyed(page);
  await waitForBeacon("link-only-draft");
  await page.evaluate(() => window.location.assign("/ko/p/hana/open-letter"));
  await waitForBeacon("open-letter");
  const ref = beacon("open-letter")?.query.get("ref") ?? "";
  expect(ref).toContain("/ko/p/hana/link-only-draft");
  expect(ref).not.toContain("mock-unlisted-key");
  expect(beacon("open-letter")?.headers["x-post-key"]).toBeUndefined();
});

test("an unlocked password post's beacon carries the grant from sessionStorage, through the preflight", async ({ page }) => {
  await page.goto("/ko/p/hana/locked-diary");
  const gate = page.getByTestId("post-gate");
  await gate.getByLabel("비밀번호", { exact: true }).fill("kurl-open");
  await gate.getByRole("button", { name: "열기" }).click();
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 15_000 });
  await waitForBeacon("locked-diary");
  const stored = await page.evaluate(() =>
    Object.entries(window.sessionStorage).find(([key]) => key.startsWith("kurl:post-grant:")),
  );
  expect(stored).toBeTruthy();
  const grant = JSON.parse(stored![1]).grant;
  expect(preflight("locked-diary")?.headers["access-control-request-headers"]).toContain("x-post-grant");
  expect(beacon("locked-diary")?.headers["x-post-grant"]).toBe(grant);

  await page.reload();
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("post-gate")).toHaveCount(0);
});
