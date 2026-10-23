import { test, expect, type Locator } from "@playwright/test";
import { openHome } from "./helpers/home";

// Mock-on lane at phone width: @yuna's note 10 is a single-choice poll and note 21 a multiple-choice one,
// neither voted by the @dohyun session. Before a vote every option is its own outlined button (surface
// radius, 8px apart, as the app's #392); the results stay one box of rows with fill bars.
test.use({ viewport: { width: 390, height: 844 } });

async function shapes(options: Locator) {
  return options.evaluateAll((els) =>
    els.map((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        height: box.height,
        border: parseFloat(style.borderTopWidth),
        radius: parseFloat(style.borderTopLeftRadius),
      };
    }),
  );
}

function expectSeparateButtons(rows: Awaited<ReturnType<typeof shapes>>) {
  expect(rows.length).toBeGreaterThan(1);
  rows.forEach((row, i) => {
    expect(row.border, `option ${i} outline`).toBe(1);
    expect(row.radius, `option ${i} radius`).toBe(20);
    expect(row.height, `option ${i} height`).toBeGreaterThanOrEqual(44);
    if (i > 0) expect(Math.round(row.top - rows[i - 1].bottom), `gap before option ${i}`).toBe(8);
  });
}

test("a single-choice poll offers each option as its own button that votes when pressed", async ({ page }) => {
  await openHome(page, "/ko/blog/notes");
  const poll = page.locator('[data-note-poll="10"]');
  await expect(poll.getByRole("button", { name: "국밥" })).toBeVisible({ timeout: 30_000 });
  const options = poll.getByRole("button", { name: /^(국밥|파스타|샐러드)$/ });
  expectSeparateButtons(await shapes(options));
  await expect(poll.getByRole("checkbox")).toHaveCount(0);
  await expect(poll.getByText("누르면 바로 투표돼요. 되돌릴 수 없어요.")).toHaveClass(/sr-only/);

  await poll.getByRole("button", { name: "국밥" }).click();
  const results = poll.locator("[data-poll-result]");
  await expect(results).toHaveCount(3);
  const rows = await shapes(results);
  for (let i = 1; i < rows.length; i++) expect(Math.round(rows[i].top - rows[i - 1].bottom)).toBe(0);
  const box = results.first().locator("xpath=..");
  expect(parseFloat(await box.evaluate((el) => getComputedStyle(el).borderTopWidth))).toBeGreaterThan(0);
});

test("a multiple-choice poll marks each picked option, then 투표 sends them", async ({ page }) => {
  await openHome(page, "/ko/blog/notes");
  const poll = page.locator('[data-note-poll="21"]');
  const options = poll.getByRole("checkbox");
  await expect(options).toHaveCount(3, { timeout: 30_000 });
  expectSeparateButtons(await shapes(options));

  const vote = poll.getByRole("button", { name: "투표", exact: true });
  await expect(vote).toBeDisabled();
  const testing = poll.getByRole("checkbox", { name: "테스트 더블" });
  await testing.click();
  await expect(testing).toHaveAttribute("aria-checked", "true");
  await expect(testing.locator("[data-poll-mark]")).toBeVisible();
  await poll.getByRole("checkbox", { name: "배포" }).click();
  await vote.click();
  await expect(poll.locator("[data-poll-result]")).toHaveCount(3);
  await expect(poll.locator('[data-poll-result="1"]').getByLabel("내 선택")).toBeVisible();
  await expect(poll.locator('[data-poll-result="2"]').getByLabel("내 선택")).toBeVisible();
  await expect(poll).toContainText("5명 참여");
});
