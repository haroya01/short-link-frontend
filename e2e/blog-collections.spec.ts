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

test("discovery feed (connections) renders the curator connection flow", async ({ page }) => {
  await page.goto("/en/blog/connections");
  // 큐레이터가 컬렉션에 이은 흐름 — 시드된 연결(컬렉션 제목 + 글)이 보인다.
  await expect(page.locator("body")).toContainText("결정을 남기는 법");
  await expect(page.locator("body")).toContainText("헥사고날 아키텍처, 작은 서비스에 과했을까");
});

test("unknown collection id is a graceful 404, not a 500 crash", async ({ page }) => {
  const res = await page.goto("/en/blog/collections/999999");
  // 없는 컬렉션 = notFound() 로 떨어져야지, 라우트가 throw 해서 500 나면 안 된다.
  expect(res?.status()).toBeLessThan(500);
});
