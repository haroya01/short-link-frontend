import { expect, test } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";
import { createLink } from "./helpers/links";

/**
 * Regression for the layout collapse that hits when a user has a link with a very long URL on
 * the profile editor: the left column's `1fr` track (= `minmax(auto, 1fr)`) inflated past its
 * fair share, squeezing the 320px preview pane and stretching the theme picker grid horizontally.
 * Fix is `minmax(0, 1fr)` + `min-w-0` on the wrapper.
 *
 * The check: document.documentElement.scrollWidth must not exceed clientWidth at desktop width,
 * because if the left column overflowed, the page-level scrollbar appears.
 */
test.describe("profile/edit layout — long URLs don't stretch the page", () => {
  test("long original URL in feed does not cause horizontal overflow", async ({
    page,
    context,
  }) => {
    const email = uniqueEmail("profile-edit-overflow");
    const token = await signInAs(page, context, email);

    // Claim a username so the editor renders the full layout (otherwise it short-circuits to
    // the claim flow which doesn't include the preview pane).
    const username = `t${Date.now().toString(36).slice(-12)}`;
    const claim = await context.request.put("/api/v1/users/me/profile", {
      data: { username },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(claim.ok()).toBe(true);

    // Pathological case the user reported: a Google search URL with a 500+ char query string.
    const longUrl =
      "https://www.google.com/search?q=" +
      encodeURIComponent("도쿄 날씨") +
      "&rlz=1C9BKJA_enKR1126KR1126&oq=" +
      encodeURIComponent("도쿄 날씨") +
      "&gs_lcrp=EgZjaHJvbWUyCQgAEEUYORiABDITCAEQLhivARjHARi6AhiABBiOBTIHCAIQABiABDIHCAMQABiABDIHCAQQABiABDIHCAUQABiABDIHCAYQABiABDIHCAcQABiABDIHCAgQABiABDIHCAkQABiABNIBCDE1MTdqMGo0qAITsAIB4gMEGAEgX_EFfll-mPqhJ3M&hl=ja&sourceid=chrome-mobile&ie=UTF-8";

    const created = await createLink(context.request, longUrl, token);

    // Toggle the link onto the profile feed via API — the editor lists unfeatured links in a
    // disclosure too, but the failure mode shows up whether it's featured or not.
    const toggle = await context.request.put(
      `/api/v1/links/${created.shortCode}/profile`,
      {
        data: { show: true },
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(toggle.ok()).toBe(true);

    // Sized so `lg:` breakpoint kicks in (grid splits into 2 columns) — that's the layout that
    // had the bug; the 1-column stack on smaller widths was never broken.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko/profile/edit");

    // Wait for the feed to render so we're measuring the populated layout, not the loading state.
    await expect(page.locator(`text=/${created.shortCode}`)).toBeVisible();

    const overflow = await page.evaluate(() => {
      const html = document.documentElement;
      return { scrollWidth: html.scrollWidth, clientWidth: html.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });
});
