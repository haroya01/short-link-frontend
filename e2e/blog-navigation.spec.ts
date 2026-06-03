import { test, expect, type Page } from "@playwright/test";

/**
 * Navigation & chrome-stability — the "lived transition" gap the payload/structure specs miss. The
 * profile-tab flicker shipped repeatedly because tests asserted what SAVED or which URL loaded, never
 * what the reader SEES *during* a navigation: does the persistent chrome stay put, is it a soft (no
 * full-reload) navigation, does the content — not the header — show the skeleton.
 *
 * Mock-ON lane (the reader/profile pages are Server Components served by the in-memory mock).
 *
 * KNOWN GAP: headless Chromium does not run cross-document (MPA) View Transitions, so a VT-crossfade
 * flicker can't be reproduced here — it has to be reasoned about / caught by visual regression. These
 * specs cover the soft-navigation model the blog now uses (BlogLink → client nav + loading.tsx).
 */
test.use({ viewport: { width: 1280, height: 900 } });

const PROFILE = "/en/p/dohyun"; // seeded mock author
const HANDLE = "@dohyun";

/**
 * Run `act` (a client navigation) then poll for ~600ms asserting `text` is present in EVERY frame.
 * This is the check that fails when the chrome is briefly replaced by a skeleton mid-transition — the
 * exact "전체요소가 깜빡" bug. A stable element that never blanks passes cleanly.
 */
async function staysPresentThrough(page: Page, act: () => Promise<void>, text: string) {
  await act();
  for (let i = 0; i < 9; i++) {
    const present = await page.evaluate((t) => document.body.innerText.includes(t), text);
    expect(present, `"${text}" must stay visible through the navigation (frame ${i})`).toBe(true);
    await page.waitForTimeout(70);
  }
}

test("tab switches keep the author header on screen the whole time (no skeleton flash)", async ({
  page,
}) => {
  await page.goto(PROFILE);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: HANDLE })).toBeVisible();

  // Public tabs a visitor always sees. The header (handle) must never blink out while the content swaps.
  for (const name of ["Series", "About", "Posts"]) {
    await staysPresentThrough(page, () => page.getByRole("link", { name, exact: true }).first().click(), HANDLE);
  }
});

test("a tab switch is a soft (client) navigation — no full reload, so the layout/header persist", async ({
  page,
}) => {
  await page.goto(PROFILE);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => ((window as Window & { __nav?: string }).__nav = "alive"));
  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await page.waitForURL(/\/p\/dohyun\/about/, { timeout: 15_000 });
  expect(
    await page.evaluate(() => (window as Window & { __nav?: string }).__nav),
    "JS context survived → soft navigation (a full reload would reset it)",
  ).toBe("alive");
});

test("the author header is the SAME DOM node before and after a tab switch (not re-mounted)", async ({
  page,
}) => {
  // The header lives in the persistent layout, so its node survives a tab switch. If it ever moves back
  // into the page, the route loading.tsx will replace it again → this marker is discarded → fail.
  await page.goto(PROFILE);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("header")].find((h) => h.textContent?.includes("@dohyun"));
    el?.setAttribute("data-persist-test", "1");
  });
  await page.getByRole("link", { name: "Series", exact: true }).first().click();
  await page.waitForURL(/\/p\/dohyun\/series/, { timeout: 15_000 });
  const kept = await page.evaluate(
    () => !!document.querySelector('header[data-persist-test="1"]')?.textContent?.includes("@dohyun"),
  );
  expect(kept, "the marked author header survived the tab switch (lives in the layout)").toBe(true);
});

test("the theme is shared across blog surfaces via cookie (feed ↔ profile ↔ post)", async ({
  page,
  context,
}) => {
  // Theme is a `.kurl.me` cookie, NOT per-origin localStorage — so the apex feed and an author
  // post/profile (different origins in prod) agree. Set only the cookie; every surface must read dark.
  await context.addCookies([{ name: "theme", value: "dark", domain: "localhost", path: "/" }]);
  for (const url of ["/en/blog", "/en/p/dohyun", "/en/p/dohyun/nextjs-14-app-router-blog"]) {
    await page.goto(url);
    expect(
      await page.evaluate(() => document.documentElement.classList.contains("dark")),
      `${url} applied the shared theme cookie`,
    ).toBe(true);
  }
});
