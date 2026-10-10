import { expect, type Locator, type Page } from "@playwright/test";

export function toastBy(page: Page, text: string | RegExp): Locator {
  return page.getByTestId("toast").filter({ hasText: text }).last();
}

// elementFromPoint skips pointer-events:none, so the target must take pointer events.
export async function expectOnTop(locator: Locator, options?: { timeout?: number }) {
  await expect(locator).toBeVisible(options);
  await expect
    .poll(
      () =>
        locator.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return top !== null && el.contains(top);
        }),
      { message: "covered by another layer", timeout: options?.timeout },
    )
    .toBe(true);
}
