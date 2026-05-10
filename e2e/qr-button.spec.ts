import { expect, test } from "@playwright/test";

/**
 * Regression coverage for the QR modal layout. The qrcode library used to write inline width/height
 * styles onto the canvas that overrode our Tailwind sizing classes — the canvas would render at its
 * intrinsic 512px and burst out of the modal. This spec opens the modal from the anonymous shorten
 * flow (no auth needed) and asserts the canvas stays inside its wrapper.
 */
test.describe("QR modal layout", () => {
  test("canvas stays inside its wrapper", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/your-very-long-url/).fill("https://example.com/qr-layout-test");
    await page.getByRole("button", { name: "단축하기" }).click();

    // Wait for the result card so the QR button is in the DOM. The button shows only the icon
    // on small viewports, so target by accessible name "QR" (added in qr-button.tsx).
    const qrButton = page.getByRole("button", { name: "QR" }).first();
    await expect(qrButton).toBeVisible({ timeout: 10000 });
    await qrButton.click();

    // The dialog opens immediately; canvas paints once qrcode resolves.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const canvas = dialog.locator("canvas");
    await expect(canvas).toBeVisible();

    // Give qrcode a beat to paint + the inline-style cleanup we added to fire.
    await page.waitForFunction(() => {
      const c = document.querySelector('[role="dialog"] canvas') as HTMLCanvasElement | null;
      return Boolean(c && c.getBoundingClientRect().width > 0);
    });

    const canvasBox = await canvas.boundingBox();
    const dialogBox = await dialog.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();
    if (!canvasBox || !dialogBox) return;

    // The dialog itself is `max-w-sm` (~384px) and the canvas wrapper is `h-64 w-64` (256px) with
    // p-2 padding. A pre-fix canvas painted at 512px and overflowed both — assert the canvas
    // doesn't exceed the dialog horizontally.
    expect(canvasBox.width).toBeLessThanOrEqual(dialogBox.width);
    expect(canvasBox.height).toBeLessThanOrEqual(dialogBox.height);
    // Tighter check: the canvas should fit inside the 256px wrapper (allow a few px slack).
    expect(canvasBox.width).toBeLessThanOrEqual(280);
  });
});
