import { expect, test } from "@playwright/test";

// mock-on 레인: 목 명함의 마지막 링크(team-notes)는 비밀번호 링크다. 서버(#796)처럼 목적지·미리보기
// 이미지 없이, 소유자 제목도 없이 온다.
test("비밀번호 링크는 자물쇠와 단축 URL로, 목적지 없이 보인다", async ({ page }) => {
  await page.goto("/ko/u/dohyun");
  const locked = page.getByRole("link", { name: /비밀번호가 필요한 링크/ });
  await expect(locked).toBeVisible();
  await expect(locked.getByRole("img", { name: "비밀번호가 필요한 링크" })).toBeVisible();
  await expect(locked).toHaveText("kurl.me/team-notes");
  await expect(locked).toHaveAttribute("href", "https://kurl.me/team-notes?src=profile-dohyun");
  await expect(locked.locator("img")).toHaveCount(0);

  const email = page.getByRole("link", { name: /^이메일/ });
  await expect(page.locator("li > ul").filter({ has: locked }).filter({ has: email })).toHaveCount(1);
});
