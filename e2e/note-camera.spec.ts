import { test, expect, type Page } from "@playwright/test";

// Mock-on lane: the session is @dohyun. A phone with a camera gets a 사진 찍기 button right after 사진 추가
// that opens the camera (capture=environment); the shot goes through the same attach path and limits.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwHwQZGBgAJmQF+2Sp1QYAAAAASUVORK5CYII=";

async function cameras(page: Page, kinds: string[]) {
  await page.addInitScript((list) => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { enumerateDevices: () => Promise.resolve(list.map((kind) => ({ kind, deviceId: "", groupId: "", label: "" }))) },
    });
  }, kinds);
}

async function openComposer(page: Page) {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "노트 쓰기" });
  await composer.click({ timeout: 30_000 });
  return composer;
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("사진 찍기 sits right after 사진 추가 and its photo lands in the composer strip", async ({ page }) => {
    await cameras(page, ["audioinput", "videoinput"]);
    await openComposer(page);
    const add = page.getByRole("button", { name: "사진 추가" });
    const shoot = page.getByRole("button", { name: "사진 찍기" });
    await expect(shoot).toBeVisible();
    const [addBox, shootBox] = [await add.boundingBox(), await shoot.boundingBox()];
    expect(shootBox!.x).toBeGreaterThan(addBox!.x);
    expect(Math.abs(shootBox!.y - addBox!.y)).toBeLessThan(2);

    const input = page.getByTestId("note-camera-input");
    await expect(input).toHaveAttribute("capture", "environment");
    await expect(input).toHaveAttribute("accept", "image/*");
    const chooser = page.waitForEvent("filechooser");
    await shoot.click();
    await (await chooser).setFiles({ name: "shot.png", mimeType: "image/png", buffer: Buffer.from(PNG, "base64") });
    await expect(page.getByRole("button", { name: "대체 텍스트 추가" })).toHaveText("+ALT");
  });

  test("사진 찍기 follows the same limits as 사진 추가: off with a poll", async ({ page }) => {
    await cameras(page, ["videoinput"]);
    await openComposer(page);
    await page.getByRole("button", { name: "투표 추가" }).click();
    await expect(page.getByRole("button", { name: "사진 찍기" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "사진 추가" })).toBeDisabled();
  });

  test("a phone without a camera shows no 사진 찍기", async ({ page }) => {
    await cameras(page, ["audioinput"]);
    await openComposer(page);
    await expect(page.getByRole("button", { name: "사진 추가" })).toBeVisible();
    await expect(page.getByRole("button", { name: "사진 찍기" })).toHaveCount(0);
  });
});

test.describe("with a mouse", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a computer with a webcam shows no 사진 찍기", async ({ page }) => {
    await cameras(page, ["videoinput"]);
    await openComposer(page);
    await expect(page.getByRole("button", { name: "사진 추가" })).toBeVisible();
    await expect(page.getByRole("button", { name: "사진 찍기" })).toHaveCount(0);
  });
});
