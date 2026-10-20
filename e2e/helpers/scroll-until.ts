import { expect, type Locator } from "@playwright/test";

export async function scrollUntilPresent(target: Locator, timeout = 30_000) {
  await expect
    .poll(
      async () => {
        await target.page().evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return target.count();
      },
      { timeout },
    )
    .toBeGreaterThan(0);
}
