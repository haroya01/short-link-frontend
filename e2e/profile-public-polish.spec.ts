import { expect, test } from "@playwright/test";

// MOCK-ON: /u/[username] is served by modules/profile/mock-profile.ts on the server.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:cookie-consent:v1", "accepted"));
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`the QR sits in the share row with copy, not fixed to a corner (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/ko/u/event-card");
    const qr = page.getByRole("button", { name: "QR 코드 열기" });
    await expect(qr).toHaveCount(1);
    const row = page.locator("div").filter({ has: page.getByRole("button", { name: "URL 복사" }) }).last();
    await expect(row.getByRole("button", { name: "QR 코드 열기" })).toHaveCount(1);
    await qr.click();
    await expect(page.getByRole("dialog", { name: "QR 코드" })).toBeVisible();
  });
}

test("the event block reads its time like the event page and keeps the place on its own line", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/u/event-card");
  const time = page.getByText("오후 7:00 – 오후 9:00 (GMT+9)", { exact: true });
  await expect(time).toBeVisible();
  const place = page.getByText("성수 카페 어니언", { exact: true });
  const timeBox = (await time.boundingBox())!;
  const placeBox = (await place.boundingBox())!;
  expect(placeBox.y).toBeGreaterThanOrEqual(timeBox.y + timeBox.height);

  await page.getByRole("button", { name: "내 캘린더에 추가" }).click();
  await expect(page.getByRole("menu").getByRole("menuitem")).toHaveCount(3);
});

test("with reduced motion the contact card stays flat under the pointer and while scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/u/event-card");
  const card = page.getByRole("button", { name: "뒤집기" }).locator("xpath=..");
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10, { steps: 5 });
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  expect(await card.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--rotate-x"))).toBe("");
});

test("an empty profile stays out of search, a filled one does not", async ({ page }) => {
  await page.goto("/ko/u/empty-card");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goto("/ko/u/event-card");
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute("content", /noindex/);
});
