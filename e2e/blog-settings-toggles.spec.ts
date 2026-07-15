import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";

/**
 * Regression for the settings-page switches rendering with the knob detached from its pill: the
 * knob was positioned `absolute` + `translate-x` with no `left` anchor, so it fell back to its
 * static position — which the button's UA `text-align: center` puts mid-pill. Off looked on
 * (knob hugging the right edge) and on pushed the knob fully outside the pill. None of the
 * DOM-state assertions could see this (aria-checked was always correct), so this spec checks the
 * rendered geometry instead: the knob must sit inside the pill, on the side aria-checked says.
 */

/** The knob must be inside the pill and on the aria-checked side (1px tolerance for rounding). */
async function expectKnobMatchesState(switchEl: Locator) {
  const pill = await switchEl.boundingBox();
  const knob = await switchEl.locator("span").boundingBox();
  if (!pill || !knob) throw new Error("switch or knob not rendered");

  expect(knob.x).toBeGreaterThanOrEqual(pill.x - 1);
  expect(knob.x + knob.width).toBeLessThanOrEqual(pill.x + pill.width + 1);

  const on = (await switchEl.getAttribute("aria-checked")) === "true";
  const knobCenter = knob.x + knob.width / 2;
  const pillCenter = pill.x + pill.width / 2;
  if (on) {
    expect(knobCenter).toBeGreaterThan(pillCenter);
  } else {
    expect(knobCenter).toBeLessThan(pillCenter);
  }
}

test.describe("blog settings — toggle switches", () => {
  test("every switch knob sits inside its pill on the correct side", async ({ page, context }) => {
    const email = uniqueEmail("blog-settings-toggles");
    await signInAs(page, context, email);
    await page.goto("/ko/blog/settings");

    // Both async sections (per-type notification prefs, follower-count privacy) load their state
    // before rendering a switch, so wait for one representative of each.
    await expect(page.getByRole("switch", { name: "좋아요" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("switch", { name: "팔로워 수 숨기기" })).toBeVisible({
      timeout: 10000,
    });

    const switches = await page.getByRole("switch").all();
    expect(switches.length).toBeGreaterThanOrEqual(10); // 9 notification types + follower count
    for (const el of switches) {
      await expectKnobMatchesState(el);
    }
  });

  test("hide-follower-count flips, persists across reload, and the knob follows", async ({
    page,
    context,
  }) => {
    const email = uniqueEmail("blog-settings-hide");
    await signInAs(page, context, email);
    await page.goto("/ko/blog/settings");

    const hide = page.getByRole("switch", { name: "팔로워 수 숨기기" });
    await expect(hide).toBeVisible({ timeout: 10000 });
    await expect(hide).toHaveAttribute("aria-checked", "false");

    await hide.click();
    await expect(hide).toHaveAttribute("aria-checked", "true");
    await expect(hide).toBeEnabled(); // PATCH settled (busy state released)
    // The knob animates (transition-transform), so poll until the geometry settles.
    await expect(async () => expectKnobMatchesState(hide)).toPass({ timeout: 3000 });

    // The flag lives on the account, not the client — a reload must come back checked.
    await page.reload();
    await expect(hide).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expectKnobMatchesState(hide);
  });
});
