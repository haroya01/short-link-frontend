import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const OUT = "/private/tmp/claude-501/-Users-gimdonghyeon/9bfb366b-4b1e-4657-a5cf-8e63e7f3db44/scratchpad/screens";
const browser = await chromium.launch();

async function powHeaders() {
  const crypto = await import("node:crypto");
  const res = await fetch(`${BASE}/api/v1/pow/challenge`);
  const { challenge, difficulty, enforced } = await res.json();
  if (!enforced) return {};
  const prefix = "0".repeat(difficulty);
  for (let i = 0; i < 5_000_000; i++) {
    const hash = crypto.createHash("sha256").update(`${challenge}:${i}`).digest("hex");
    if (hash.startsWith(prefix)) return { "X-Pow-Challenge": challenge, "X-Pow-Nonce": String(i) };
  }
  throw new Error("pow mining failed");
}


const authed = await browser.newContext({ baseURL: BASE });
const orgPage = await authed.newPage();
const login = await authed.request.post("/api/v1/auth/dev-login", {
  data: { email: `shot-${Date.now()}@e2e.kurl.test` },
});
const { accessToken } = await login.json();
await orgPage.addInitScript((t) => localStorage.setItem("short-link:access-token", t), accessToken);

const create = await authed.request.post("/api/v1/events", {
  headers: { Authorization: `Bearer ${accessToken}` },
  data: {
    title: "도쿄 개발자 스터디 3기 모집",
    descriptionMd:
      "## 어떤 모임인가요?\n\n매주 수요일 저녁, 시부야에서 모여 각자 진행 중인 사이드 프로젝트를 공유하고 피드백을 나눕니다.\n\n- **대상**: 주니어~시니어 개발자 누구나\n- **형식**: 발표 2팀 + 자유 네트워킹\n- **준비물**: 노트북, 공유하고 싶은 프로젝트\n\n> 처음 오시는 분 환영합니다. 편하게 오세요!\n\n### 이번 시즌 일정\n\n1. 8/5 킥오프 & 자기소개\n2. 8/12 프로젝트 쇼케이스\n3. 8/19 라이트닝 토크",
    startsAt: "2026-08-05T10:00:00Z",
    endsAt: "2026-08-05T12:00:00Z",
    timezone: "Asia/Tokyo",
    locationText: "시부야 ○○코워킹 3F 이벤트홀",
    locationUrl: "https://maps.google.com/?q=shibuya",
    capacity: 20,
    contactField: "EMAIL",
    questions: [
      { type: "SHORT_TEXT", label: "어떤 주제에 관심이 있나요?", required: false },
      { type: "SINGLE_CHOICE", label: "참여 방식", options: ["오프라인", "온라인"], required: true },
    ],
  },
});
const event = await create.json();
console.log("event:", event.id, event.slug);

for (let i = 0; i < 7; i++) {
  await authed.request.post(`/api/v1/public/events/${event.slug}/registrations`, {
    headers: await powHeaders(),
    data: {
      name: `참가자${i + 1}`,
      contact: `guest${i + 1}-${Date.now()}@ex.com`,
      answers: { [event.questions[1].id]: i % 3 === 0 ? "온라인" : "오프라인" },
    },
  });
}

const mobile = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const mPage = await mobile.newPage();
await mPage.goto(`/ko/e/${event.slug}`);
await mPage.waitForTimeout(1500);
await mPage.screenshot({ path: `${OUT}/public-mobile.png`, fullPage: true });

const desktop = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 900 } });
const dPage = await desktop.newPage();
await dPage.goto(`/ko/e/${event.slug}`);
await dPage.waitForTimeout(1500);
await dPage.screenshot({ path: `${OUT}/public-desktop.png`, fullPage: true });

await mPage.locator("#ev-name").fill("김철수");
await mPage.locator("#ev-contact").fill(`success-${Date.now()}@ex.com`);
await mPage.getByRole("radio", { name: "오프라인" }).click();
await mPage.getByRole("checkbox").check();
await mPage.locator("#register").getByRole("button", { name: "신청하기" }).click();
await mPage.waitForTimeout(2500);
await mPage.screenshot({ path: `${OUT}/public-success-mobile.png`, fullPage: true });

await orgPage.goto(`/ko/events/${event.id}`);
await orgPage.waitForTimeout(2500);
await orgPage.screenshot({ path: `${OUT}/dashboard-desktop.png`, fullPage: true });

await orgPage.goto("/ko/events/new");
await orgPage.waitForTimeout(1500);
await orgPage.screenshot({ path: `${OUT}/create-form-desktop.png`, fullPage: true });

await orgPage.setViewportSize({ width: 390, height: 844 });
await orgPage.goto(`/ko/events/${event.id}`);
await orgPage.waitForTimeout(2000);
await orgPage.screenshot({ path: `${OUT}/dashboard-mobile.png`, fullPage: true });

await orgPage.goto("/ko/events");
await orgPage.waitForTimeout(1500);
await orgPage.screenshot({ path: `${OUT}/list-mobile.png`, fullPage: true });

console.log("screens captured");
await browser.close();
