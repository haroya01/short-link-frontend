import { test, expect, type Page } from "@playwright/test";

/**
 * Default feed tab — the setting that decides which tab blog home opens on.
 *
 * Reported symptom: "blog.kurl.me always opens on the Series tab, even after changing it." Two
 * things drive that tab — the account preference (server) and a mirrored cookie the SSR render
 * reads. The picker writes the cookie optimistically and fires the account save as best-effort, so
 * this suite pins what happens when that save FAILS: the UI must not claim success, and the choice
 * must not silently revert on the next home load (FeedTabCookieSync re-reads the account pref and
 * overwrites the cookie with it).
 *
 * Fully mocked at the Playwright layer — no backend needed.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const TOKEN = "e2e-fake-token";
const NOW = "2026-05-29T00:00:00Z";
const ME = { id: 1, email: "e2e@kurl.test", role: "USER", createdAt: NOW, username: "e2euser" };
const COOKIE = "kurl_blog_default_tab";

type Backend = {
  /** What the ACCOUNT says — the source of truth the sync component re-reads. */
  accountTab: string;
  /** Set to an http status to make the save fail. */
  failSaveWith: number | null;
  saveAttempts: string[];
};

async function installMocks(page: Page, be: Backend) {
  await page.route("**/api/v1/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/users/me", (r) => r.fulfill({ json: ME }));
  // Settings page siblings — shapes matter: an array where an object is expected throws inside the
  // page and the whole route falls into its error boundary, hiding the picker under test.
  await page.route("**/api/v1/users/me/tag-prefs", (r) => r.fulfill({ json: { followed: [], hidden: [] } }));
  await page.route("**/api/v1/users/me/profile", (r) =>
    r.fulfill({ json: { username: ME.username, displayName: "e2e", bio: null, avatarUrl: null, hideFollowerCount: false } }),
  );
  await page.route("**/api/v1/notifications/blog-preferences", (r) =>
    r.fulfill({ json: { newPost: true, comment: true, reply: true, mention: true, follow: true, seriesUpdate: true } }),
  );
  await page.route("**/api/v1/notifications/unread-count", (r) => r.fulfill({ json: { count: 0 } }));
  await page.route("**/api/v1/users/me/feed-prefs", (r) =>
    r.fulfill({ json: { defaultTab: be.accountTab } }),
  );
  await page.route("**/api/v1/users/me/feed-prefs/default-tab/*", (route) => {
    const tab = route.request().url().split("/").pop() ?? "";
    be.saveAttempts.push(tab);
    if (be.failSaveWith) {
      return route.fulfill({
        status: be.failSaveWith,
        contentType: "application/json",
        body: JSON.stringify({ code: "ERROR", message: "nope" }),
      });
    }
    be.accountTab = tab;
    return route.fulfill({ json: { defaultTab: tab } });
  });
}

async function signIn(page: Page) {
  await page.context().addInitScript((t) => {
    window.localStorage.setItem("short-link:access-token", t as string);
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  }, TOKEN);
}

async function cookieValue(page: Page) {
  const all = await page.context().cookies();
  return all.find((c) => c.name === COOKIE)?.value ?? null;
}

/** Pick a tab in 설정 → 피드 → 기본 탭. Labels come from the picker rows. */
async function chooseTab(page: Page, label: RegExp) {
  const row = page.getByRole("button", { name: label }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
}

test("happy path: choosing 최신 persists to the account and the cookie", async ({ page }) => {
  const be: Backend = { accountTab: "series", failSaveWith: null, saveAttempts: [] };
  await installMocks(page, be);
  await signIn(page);

  await page.goto("/ko/blog/settings");
  await chooseTab(page, /^최신$/);

  await expect.poll(() => be.saveAttempts).toContain("recent");
  await expect.poll(() => be.accountTab).toBe("recent");
  await expect.poll(() => cookieValue(page)).toBe("recent");
});

/**
 * The reported bug shape. The account save fails. What must NOT happen: the picker claiming success
 * and the cookie briefly agreeing, because FeedTabCookieSync then overwrites the cookie with the
 * account value on the next blog-home load — which is what made the setting feel haunted ("I picked
 * 최신 and it still opens on 시리즈"). Honest behaviour: say it failed, snap the choice back to what
 * the account actually holds, and leave no phantom cookie.
 */
test("save failure is surfaced and leaves no phantom state", async ({ page }) => {
  const be: Backend = { accountTab: "series", failSaveWith: 500, saveAttempts: [] };
  await installMocks(page, be);
  await signIn(page);

  await page.goto("/ko/blog/settings");
  await chooseTab(page, /^최신$/);
  await expect.poll(() => be.saveAttempts).toContain("recent");

  // The account never accepted the change…
  expect(be.accountTab).toBe("series");
  // …the user is told so (silence here is the bug)…
  await expect(page.getByText(/저장하지 못했어요/)).toBeVisible({ timeout: 5000 });
  // …the picker snaps back to what the account really holds…
  await expect(page.getByRole("button", { name: /^시리즈$/ })).toHaveAttribute("aria-pressed", "true");
  // …and the cookie still matches the account, so the next home load can't "revert" anything.
  expect(await cookieValue(page)).toBe("series");

  await page.goto("/ko/blog");
  await page.waitForTimeout(1200); // let FeedTabCookieSync settle
  expect(await cookieValue(page)).toBe("series");
});
