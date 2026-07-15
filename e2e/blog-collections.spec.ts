import { test, expect } from "@playwright/test";

/**
 * 연결 그래프 — 컬렉션 · 패스(reading path) · 발견(큐레이터 연결 흐름). 리더 하이라이트에서 자란
 * 새 표면이라 e2e 공백이었다(라우트·데이터·뷰가 함께 깨져도 잡히지 않던 자리).
 *
 * mock-ON 레인 — 이 페이지들은 서버 컴포넌트라 in-memory mock(_mocks-collections.ts)이 결정적으로
 * 시드한다: PATH id1 "결정을 남기는 법", COLLECTION id2 "프로덕트 노트", 발견 흐름(큐레이터 연결).
 * navigate + assert 로 충분히 깨짐을 잡는다(렌더 안 됨 / 데이터 미연결 / 빈 상태 오작동 / 500).
 */
test.use({ viewport: { width: 1280, height: 900 } });

test("reading path (PATH) renders its title and ordered connections", async ({ page }) => {
  await page.goto("/en/blog/collections/1");
  await expect(page.locator("body")).toContainText("결정을 남기는 법"); // 패스 제목
  // 순서 있는 연결(스텝)이 실제로 그려진다 — 연결된 글 제목 하나로 확인(빈 패스가 아님).
  await expect(page.locator("body")).toContainText("Spring Boot 트랜잭션 전파, 다시 정리");
});

test("collection renders its title and a connected highlight quote", async ({ page }) => {
  await page.goto("/en/blog/collections/2");
  await expect(page.locator("body")).toContainText("프로덕트 노트");
  await expect(page.locator("body")).toContainText("좋은 이름은 주석을 지운다.");
});

test("discovery (connections) opens on entrances, and preserves the recent timeline in a tab", async ({
  page,
}) => {
  await page.goto("/en/blog/connections");

  // 기본 = 입구 모음. 열린 길(PATH)이 입구 행으로 뜬다 — 시드된 컬렉션 제목으로 확인.
  await expect(page.getByRole("tab", { name: /Entrances/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("body")).toContainText("결정을 남기는 법"); // 입구(길) 제목
  // 입구는 활동 로그가 아니다 — 시간순 카드의 히어로(큐레이터 why/블록)는 기본 화면에 없다.
  await expect(page.locator("body")).not.toContainText("헥사고날 아키텍처, 작은 서비스에 과했을까");

  // 칭찬받은 시간순 타임라인은 삭제되지 않고 "최근" 탭으로 보존된다 — 회귀 없음.
  await page.getByRole("tab", { name: /Recent/ }).click();
  await expect(page.locator("body")).toContainText("헥사고날 아키텍처, 작은 서비스에 과했을까");
});

test("unknown collection id is a graceful 404, not a 500 crash", async ({ page }) => {
  const res = await page.goto("/en/blog/collections/999999");
  // 없는 컬렉션 = notFound() 로 떨어져야지, 라우트가 throw 해서 500 나면 안 된다.
  expect(res?.status()).toBeLessThan(500);
});

test("my collections page lists the viewer's own collections, private included", async ({ page }) => {
  // 목 모드는 시드 토큰으로 로그인 상태 → 내 컬렉션(비공개 포함)이 나열된다. 시드된 두 컬렉션 제목 +
  // 길(PATH) 표식으로 실제로 목록이 그려졌는지 확인(빈/에러 상태가 아님).
  await page.goto("/en/blog/collections");
  await expect(page.getByRole("heading", { name: "My collections" })).toBeVisible();
  await expect(page.getByRole("link", { name: /결정을 남기는 법/ })).toBeVisible(); // 시드 PATH
  await expect(page.getByRole("link", { name: /프로덕트 노트/ })).toBeVisible(); // 시드 COLLECTION
  // 행을 누르면 그 컬렉션 상세로 — blogPath 는 dev(호스트 미설정)에서 /blog-preview 로 떨어지므로
  // 접두사와 무관하게 컬렉션 2 상세 경로로 갔는지만 본다.
  await page.getByRole("link", { name: /프로덕트 노트/ }).click();
  await expect(page).toHaveURL(/\/collections\/2$/);
});

test("connect sheet marks a collection the post is already in, and offers to unlink", async ({
  page,
}) => {
  // 시드: POST id 3(haruka/hexagonal-too-much)은 이미 COLLECTION "프로덕트 노트"에 연결돼 있다.
  // 그 글에서 연결 시트를 열면 그 컬렉션 행이 "담김" 배지 + "해제"로 뜨고, 체크 사각이 아니다.
  await page.goto("/en/p/haruka/hexagonal-too-much");
  // 연결 버튼(아이콘 + "Collection" 라벨) — 액션열에 둘(상·하단) 있으니 첫 번째를 연다.
  await page.getByRole("button", { name: /collection/i }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  // 이미 담긴 컬렉션 = "Added" 배지 + "Remove"(해제) 버튼.
  await expect(sheet).toContainText("Added");
  await expect(sheet.getByRole("button", { name: "Remove" })).toBeVisible();
});

test("tapping the checkbox square itself picks the row in the connect sheet", async ({ page }) => {
  // 회귀: 체크 사각이 픽 버튼 밖 장식 span 이던 시절엔 사각을 직접 탭해도 아무 일도 없었다.
  // 이제 행 전체(라벨+사각)가 한 버튼이라, 사각 좌표를 찍어 눌러도 선택돼야 한다.
  await page.goto("/en/p/haruka/hexagonal-too-much");
  await page.getByRole("button", { name: /collection/i }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  const row = sheet.getByRole("checkbox").first();
  await expect(row).toHaveAttribute("aria-checked", "false");
  const box = await row.boundingBox();
  if (!box) throw new Error("checkbox row not rendered");
  // 사각은 행 오른쪽 끝(px-3 안쪽의 20px 정사각) — 그 중심 좌표를 정확히 찍는다.
  await page.mouse.click(box.x + box.width - 22, box.y + box.height / 2);
  await expect(row).toHaveAttribute("aria-checked", "true");
  // 선택이 생기면 하단 CTA 가 "Next" 로 살아난다.
  await expect(sheet.getByRole("button", { name: "Next" })).toBeEnabled();
});
