import { test, expect, type Page } from "@playwright/test";

// Mock-on lane: the blog write canvas. Typing "#" (and "# ", which makes a heading) and then deleting it must
// leave the caret where it was, so the next character lands on the same line.
async function canvas(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
  await page.goto("/ko/blog/write/new");
  const body = page.locator(".ProseMirror").first();
  await expect(body).toBeVisible({ timeout: 30_000 });
  await body.click();
  return body;
}

// ProseMirror reads an arrow-key move from the next selectionchange, so a script waits for it as a person would.
async function arrow(page: Page, key: "ArrowLeft" | "ArrowRight") {
  await page.keyboard.press(key);
  await page.waitForTimeout(150);
}

const blocks = (page: Page) =>
  page.locator(".ProseMirror").first().evaluate((el) => Array.from(el.children, (child) => `${child.tagName}:${child.textContent}`));

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`at ${viewport.width}px`, () => {
    test.use({ viewport });

    test("a heading made from '# ' on a new line and deleted keeps the caret on that line", async ({ page }) => {
      await canvas(page);
      await page.keyboard.type("첫 줄");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.keyboard.type("# ");
      expect((await blocks(page))[1]).toBe("H1:");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("x");
      expect((await blocks(page)).slice(0, 2)).toEqual(["P:첫 줄", "P:x"]);
    });

    test("a '#' typed and deleted mid-text, at a line start, or after a line break leaves the caret in place", async ({ page }) => {
      await canvas(page);
      await page.keyboard.type("가나다");
      await arrow(page, "ArrowLeft");
      await page.keyboard.type("#");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("x");
      await arrow(page, "ArrowRight");
      await page.keyboard.press("Enter");
      await page.keyboard.type("#");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("y");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.keyboard.type("#");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("z");
      expect((await blocks(page)).slice(0, 2)).toEqual(["P:가나x다y", "P:z"]);
    });
  });
}
