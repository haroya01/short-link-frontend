import { test, expect, type Page } from "@playwright/test";

// Mock-on lane: the session is @dohyun, and kurl:mock-following makes the follow status say he already
// follows @yuna and @kazuki. Every follow button the page ever paints is recorded from the first byte.
test.use({ viewport: { width: 390, height: 844 } });

type Seen = { text: string; hidden: boolean; pop: boolean };

async function watchFollowButtons(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("kurl:mock-following", "yuna,kazuki");
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
    const seen: Seen[] = [];
    (window as unknown as { __followSeen: Seen[] }).__followSeen = seen;
    const record = () => {
      document.querySelectorAll<HTMLElement>('[data-testid="follow-button"]').forEach((el) => {
        seen.push({
          text: (el.textContent ?? "").trim(),
          hidden: getComputedStyle(el).visibility === "hidden",
          pop: el.querySelector(".subscribe-pop") !== null,
        });
      });
    };
    new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
  });
}

const seen = (page: Page) => page.evaluate(() => (window as unknown as { __followSeen: Seen[] }).__followSeen);

for (const [surface, path] of [
  ["a post", "/ko/p/kazuki/kyoto-workation"],
  ["a note", "/ko/p/yuna/notes/10"],
] as const) {
  test(`on ${surface} by a followed author, the button never paints 팔로우 and never pops on its own`, async ({ page }) => {
    await watchFollowButtons(page);
    await page.goto(path);
    const button = page.getByTestId("follow-button").filter({ visible: true }).first();
    await expect(button).toHaveText("팔로잉", { timeout: 30_000 });
    await expect(button).toHaveAttribute("aria-pressed", "true");

    const painted = (await seen(page)).filter((s) => !s.hidden);
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.filter((s) => s.text !== "팔로잉")).toEqual([]);
    expect((await seen(page)).filter((s) => s.pop)).toEqual([]);
  });
}

test("a click still plays the pop and flips to 팔로우", async ({ page }) => {
  await watchFollowButtons(page);
  await page.goto("/ko/p/yuna/notes/10");
  const button = page.getByTestId("follow-button").filter({ visible: true }).first();
  await expect(button).toHaveText("팔로잉", { timeout: 30_000 });
  await button.click();
  await expect(button).toHaveText("팔로우");
  await expect(button.locator(".subscribe-pop")).toHaveCount(1);
});
