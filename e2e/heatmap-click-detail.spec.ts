import { expect, test } from "@playwright/test";

/**
 * Heatmap click → inline detail contract.
 *
 * Clicking a cell promotes its info into the legend row below the chart — day + time range,
 * click count, and share-of-total — sharing the slot with hover. Clicking the same cell again
 * (or the inline close button) clears the selection. No floating box / modal; the detail lives
 * in the chart's own legend row so the heatmap stays in view.
 */

const DESKTOP_GRID_SELECTOR = '[class*="grid-cols-[36px_repeat(24"]';
const MOBILE_GRID_SELECTOR = '[class*="grid-cols-[36px_repeat(6"]';

test.describe("heatmap click → inline detail (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("opens detail on click, closes on second click", async ({ page }) => {
    await page.goto("/ko/demo");
    await page.waitForLoadState("networkidle");

    const grid = page.locator(DESKTOP_GRID_SELECTOR).first();
    await expect(grid).toBeVisible();

    // Pick a cell with non-zero click count by scanning aria-labels for a count > 0.
    const cellHandle = await page.evaluateHandle((sel) => {
      const root = document.querySelector(sel) as HTMLElement | null;
      if (!root) return null;
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLButtonElement[];
      return (
        buttons.find((b) => {
          const m = (b.getAttribute("aria-label") ?? "").match(/—\s*(\d+)\s*회/);
          return m && Number(m[1]) > 0;
        }) ?? null
      );
    }, DESKTOP_GRID_SELECTOR);

    const cellElement = cellHandle.asElement();
    expect(cellElement).not.toBeNull();
    await cellElement!.click();

    const detail = page.getByRole("status").filter({ hasText: /클릭/ });
    await expect(detail).toBeVisible();
    await expect(detail.locator("text=클릭")).toBeVisible();

    await cellElement!.click();
    await expect(detail).toBeHidden();
  });

  test("close button hides the detail", async ({ page }) => {
    await page.goto("/ko/demo");
    await page.waitForLoadState("networkidle");

    const cellHandle = await page.evaluateHandle((sel) => {
      const root = document.querySelector(sel) as HTMLElement | null;
      if (!root) return null;
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLButtonElement[];
      return (
        buttons.find((b) => {
          const m = (b.getAttribute("aria-label") ?? "").match(/—\s*(\d+)\s*회/);
          return m && Number(m[1]) > 0;
        }) ?? null
      );
    }, DESKTOP_GRID_SELECTOR);

    const cellElement = cellHandle.asElement();
    expect(cellElement).not.toBeNull();
    await cellElement!.click();

    const detail = page.getByRole("status").filter({ hasText: /클릭/ });
    await expect(detail).toBeVisible();

    await detail.getByRole("button", { name: "닫기" }).click();
    await expect(detail).toBeHidden();
  });
});

test.describe("heatmap click → inline detail (mobile)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("mobile bucket click reveals 4h range detail", async ({ page }) => {
    await page.goto("/ko/demo");
    await page.waitForLoadState("networkidle");

    const grid = page.locator(MOBILE_GRID_SELECTOR).first();
    await expect(grid).toBeVisible();

    const cellHandle = await page.evaluateHandle((sel) => {
      const root = document.querySelector(sel) as HTMLElement | null;
      if (!root) return null;
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLButtonElement[];
      return (
        buttons.find((b) => {
          const m = (b.getAttribute("aria-label") ?? "").match(/—\s*(\d+)\s*회/);
          return m && Number(m[1]) > 0;
        }) ?? null
      );
    }, MOBILE_GRID_SELECTOR);

    const cellElement = cellHandle.asElement();
    expect(cellElement).not.toBeNull();
    await cellElement!.click();

    const detail = page.getByRole("status").filter({ hasText: /클릭/ });
    await expect(detail).toBeVisible();
    // Mobile span shows a "from–to" range, so the label includes a dash between two hours.
    await expect(detail.locator("text=/\\d{2}:00–\\d{2}:59/")).toBeVisible();
  });
});
