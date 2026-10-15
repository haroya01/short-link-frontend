import { expect, test } from "@playwright/test";

/**
 * The blog moderation page's server blocks (Mastodon's admin domain blocks). There is no admin in
 * CI, so the admin endpoints are stubbed and the page is driven with the session-hint cookie and a
 * stub access token.
 */

type Row = { domain: string; severity: "LIMIT" | "SUSPEND"; reason: string | null; createdAt: string };

test.describe("blog admin server blocks", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([{ name: "kurl_has_session", value: "1", domain: "localhost", path: "/" }]);
    await context.addInitScript(() => {
      window.localStorage.setItem("short-link:access-token", "stub-admin-token");
      window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
    });
    await page.route("**/api/v1/users/me**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          email: "admin@example.com",
          username: "admin",
          role: "ADMIN",
          createdAt: new Date().toISOString(),
          twofaEnabled: false,
        }),
      }),
    );
    await page.route("**/api/v1/admin/abuse-reports**", (route) =>
      route.fulfill({ contentType: "application/json", body: "[]" }),
    );
  });

  test("limits a server, raises it to a suspension after confirming, and lifts it", async ({ page }) => {
    let rows: Row[] = [
      { domain: "old.example", severity: "LIMIT", reason: "spam", createdAt: "2026-10-01T00:00:00Z" },
    ];
    const puts: { domain: string; body: unknown }[] = [];
    await page.route("**/api/v1/admin/federation/servers**", async (route) => {
      const req = route.request();
      const domain = decodeURIComponent(new URL(req.url()).pathname.split("/").pop() ?? "");
      if (req.method() === "GET") {
        return route.fulfill({ contentType: "application/json", body: JSON.stringify(rows) });
      }
      if (req.method() === "PUT") {
        const body = req.postDataJSON() as { severity: Row["severity"]; reason?: string };
        puts.push({ domain, body });
        const saved: Row = {
          domain,
          severity: body.severity,
          reason: body.reason ?? null,
          createdAt: "2026-10-07T00:00:00Z",
        };
        rows = [saved, ...rows.filter((r) => r.domain !== domain)];
        return route.fulfill({ contentType: "application/json", body: JSON.stringify(saved) });
      }
      rows = rows.filter((r) => r.domain !== domain);
      return route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/ko/blog/admin");
    const section = page.getByTestId("server-blocks");
    await expect(section.getByRole("cell", { name: "old.example" })).toBeVisible({ timeout: 30_000 });

    await section.getByRole("textbox", { name: "서버", exact: true }).fill("spam.example");
    await section.getByRole("combobox", { name: "단계", exact: true }).selectOption("LIMIT");
    await section.getByRole("textbox", { name: "사유", exact: true }).fill("광고");
    await section.getByRole("button", { name: "차단", exact: true }).click();
    await expect(section.getByRole("cell", { name: "spam.example" })).toBeVisible();
    expect(puts.at(-1)).toEqual({ domain: "spam.example", body: { severity: "LIMIT", reason: "광고" } });

    page.once("dialog", (dialog) => dialog.dismiss());
    await section.getByRole("combobox", { name: "spam.example 차단 단계" }).selectOption("SUSPEND");
    expect(puts).toHaveLength(1);
    await expect(section.getByRole("combobox", { name: "spam.example 차단 단계" })).toHaveValue("LIMIT");

    page.once("dialog", (dialog) => dialog.accept());
    await section.getByRole("combobox", { name: "spam.example 차단 단계" }).selectOption("SUSPEND");
    await expect(section.getByRole("combobox", { name: "spam.example 차단 단계" })).toHaveValue("SUSPEND");
    expect(puts.at(-1)).toEqual({ domain: "spam.example", body: { severity: "SUSPEND", reason: "광고" } });

    page.once("dialog", (dialog) => dialog.accept());
    await section.getByRole("row", { name: /old\.example/ }).getByRole("button", { name: "해제" }).click();
    await expect(section.getByRole("cell", { name: "old.example" })).toHaveCount(0);
  });
});
