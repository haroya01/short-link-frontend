import { ApiError, mockEmpty, mockFailure } from "@/lib/api/client";
import type {
  ImportPlatform,
  ImportPreview,
  ImportPreviewItem,
  ImportSource,
  ImportSourcePatch,
} from "@/modules/blog/api/imports";

const STORE_KEY = "kurl:mock-imports";
const HOUR = 3_600_000;

type Supported = Exclude<ImportPlatform, "NAVER">;
type Parsed = { platform: Supported; id: string; blogUrl: string };

function parse(raw: string): Parsed | "NAVER" | null {
  const text = raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^m\./i, "");
  if (/^blog\.naver\.com\//i.test(text)) return "NAVER";
  const tistory = text.match(/^([a-z0-9-]+)\.tistory\.com/i);
  if (tistory) return { platform: "TISTORY", id: tistory[1], blogUrl: `https://${tistory[1]}.tistory.com` };
  const velog = text.match(/^velog\.io\/@([A-Za-z0-9_-]+)/i);
  if (velog) return { platform: "VELOG", id: velog[1], blogUrl: `https://velog.io/@${velog[1]}` };
  const brunch = text.match(/^brunch\.co\.kr\/@([A-Za-z0-9_-]+)/i);
  if (brunch) return { platform: "BRUNCH", id: brunch[1], blogUrl: `https://brunch.co.kr/@${brunch[1]}` };
  return null;
}

const TITLES: Record<Supported, string[]> = {
  TISTORY: [
    "Spring Batch 청크 크기를 바꾸며 잰 처리 시간",
    "MySQL 인덱스가 안 타는 다섯 가지 경우",
    "Redis 캐시 만료를 흩뿌려 몰림을 막은 이야기",
    "Kotlin 코루틴으로 외부 API 병렬 호출하기",
    "테스트 컨테이너로 통합 테스트 시간 줄이기",
    "JPA N+1을 쿼리 수로 잡아내기",
    "GitHub Actions 캐시로 빌드 4분 줄이기",
    "로그 수집을 Loki로 옮긴 뒤 비용",
    "주니어 개발자의 코드 리뷰 받는 법",
  ],
  VELOG: [
    "Next.js 서버 컴포넌트에서 데이터 가져오기 정리",
    "TypeScript satisfies를 쓰는 곳",
    "React Query 캐시 키 설계",
    "Tailwind로 다크 모드 토큰 나누기",
    "Playwright로 화면 회귀 잡기",
    "웹 접근성, 포커스 링부터",
    "Vercel 배포 미리보기로 리뷰하기",
  ],
  BRUNCH: [
    "퇴사 일기 1. 마지막 출근길",
    "혼자 떠난 리스본에서 배운 것",
    "아버지의 낡은 만년필",
    "느리게 쓰는 사람의 변명",
    "서른의 이사, 버린 것과 남긴 것",
    "새벽 다섯 시의 글쓰기",
    "엄마의 김치찌개 레시피를 받아 적으며",
    "다시 시작하는 그림 일기",
  ],
};

const BLOG_TITLE: Record<Supported, (id: string) => string> = {
  TISTORY: (id) => `${id}의 개발 노트`,
  VELOG: (id) => `${id}.log`,
  BRUNCH: (id) => `${id}의 브런치`,
};

const FULL_CONTENT: Record<Supported, boolean> = { TISTORY: true, VELOG: true, BRUNCH: false };

function items(parsed: Parsed): ImportPreviewItem[] {
  const titles = TITLES[parsed.platform];
  const shown = /noposts/i.test(parsed.id) ? [] : /fewposts/i.test(parsed.id) ? titles.slice(0, 3) : titles;
  return shown.map((title, i) => ({
    title,
    url: `${parsed.blogUrl}/${100 + i}`,
    publishedAt: new Date(Date.UTC(2026, 9, 14 - i * 3, 1)).toISOString(),
    excerpt: FULL_CONTENT[parsed.platform]
      ? `${title}. 본문 전체를 그대로 옮겨 오는 글이에요.`
      : `${title}에 대해 적은 글의 앞부분이에요. 요약만 오는 플랫폼이라 이 부분까지 보여요……`,
    imageUrl: i % 3 === 0 ? `https://picsum.photos/seed/import-${parsed.platform}-${i}/320/240` : null,
  }));
}

function fail(status: number, code?: string): Promise<never> {
  return Promise.reject(new ApiError(status, { status, title: code ?? "Error", code }));
}

function later<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const SEED: ImportSource[] = [
  {
    id: 7,
    platform: "VELOG",
    blogUrl: "https://velog.io/@dohyun",
    blogTitle: "dohyun.log",
    status: "SYNCING",
    verificationCode: null,
    fullContent: true,
    importedCount: 18,
    lastSyncedAt: new Date(Date.now() - 2 * HOUR).toISOString(),
    lastError: null,
    announceNewPosts: true,
    showInDiscover: true,
    progress: null,
  },
  {
    id: 8,
    platform: "BRUNCH",
    blogUrl: "https://brunch.co.kr/@dohyun-daily",
    blogTitle: "도현의 일상 기록",
    status: "ERROR",
    verificationCode: null,
    fullContent: false,
    importedCount: 42,
    lastSyncedAt: new Date(Date.now() - 72 * HOUR).toISOString(),
    lastError: "IMPORT_SOURCE_UNREACHABLE",
    announceNewPosts: true,
    showInDiscover: false,
    progress: null,
  },
];

function load(): ImportSource[] {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as ImportSource[];
  } catch {
    return [...SEED];
  }
  return [...SEED];
}

function save(list: ImportSource[]): void {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    return;
  }
}

function find(id: number): ImportSource | undefined {
  return load().find((s) => s.id === id);
}

function put(next: ImportSource): ImportSource {
  save(load().map((s) => (s.id === next.id ? next : s)));
  return next;
}

export function mockPreview(url: string): Promise<ImportPreview> {
  const parsed = parse(url);
  if (parsed === "NAVER") return fail(403, "IMPORT_ROBOTS_DISALLOWED");
  if (!parsed) return fail(400, "IMPORT_UNSUPPORTED_SOURCE");
  if (/notfound/i.test(url)) return fail(404, "IMPORT_FEED_NOT_FOUND");
  if (/offline/i.test(url)) return fail(502, "IMPORT_SOURCE_UNREACHABLE");
  if (/busy/i.test(url)) return fail(429);
  return later({
    platform: parsed.platform,
    blogUrl: parsed.blogUrl,
    blogTitle: BLOG_TITLE[parsed.platform](parsed.id),
    fullContent: FULL_CONTENT[parsed.platform] && !/partial/i.test(parsed.id),
    items: items(parsed),
  });
}

export function mockCreateSource(url: string): Promise<ImportSource> {
  const parsed = parse(url);
  if (parsed === "NAVER") return fail(403, "IMPORT_ROBOTS_DISALLOWED");
  if (!parsed) return fail(400, "IMPORT_UNSUPPORTED_SOURCE");
  if (/taken/i.test(url)) return fail(409, "IMPORT_SOURCE_TAKEN");
  const list = load();
  const source: ImportSource = {
    id: Math.max(100, ...list.map((s) => s.id)) + 1,
    platform: parsed.platform,
    blogUrl: parsed.blogUrl,
    blogTitle: BLOG_TITLE[parsed.platform](parsed.id),
    status: "PENDING_VERIFICATION",
    verificationCode: `kurl-${parsed.platform.slice(0, 2)}${(list.length + 3).toString(36).toUpperCase()}F`,
    fullContent: FULL_CONTENT[parsed.platform],
    importedCount: 0,
    lastSyncedAt: null,
    lastError: null,
    announceNewPosts: true,
    showInDiscover: true,
    progress: null,
  };
  save([...list, source]);
  return later(source);
}

export function mockVerifySource(id: number): Promise<ImportSource> {
  const source = find(id);
  if (!source) return fail(404);
  if (/nocode/i.test(source.blogUrl)) return fail(422, "IMPORT_VERIFICATION_CODE_MISSING");
  const total = source.platform === "NAVER" ? 0 : TITLES[source.platform].length;
  return later(put({ ...source, status: "IMPORTING", verificationCode: null, progress: { total, done: 0, failed: 0 } }));
}

export function mockGetSource(id: number): Promise<ImportSource> {
  const source = find(id);
  if (!source) return fail(404);
  if (source.status !== "IMPORTING" || !source.progress) return Promise.resolve(source);
  const { total } = source.progress;
  const done = Math.min(total, source.progress.done + Math.ceil(total / 3));
  const failed = done >= total && source.platform === "BRUNCH" ? 1 : 0;
  const finished = done >= total;
  return Promise.resolve(
    put({
      ...source,
      status: finished ? "SYNCING" : "IMPORTING",
      importedCount: done - failed,
      lastSyncedAt: finished ? new Date().toISOString() : source.lastSyncedAt,
      progress: { total, done, failed },
    }),
  );
}

export function mockListSources(): Promise<ImportSource[]> {
  if (mockEmpty("importSources")) return Promise.resolve([]);
  return mockFailure("importSources") ?? Promise.resolve(load().filter((s) => s.status !== "DISCONNECTED"));
}

export function mockUpdateSource(id: number, patch: ImportSourcePatch): Promise<ImportSource> {
  const source = find(id);
  if (!source) return fail(404);
  return Promise.resolve(put({ ...source, ...patch }));
}

export function mockDeleteSource(id: number, _keepPosts: boolean): Promise<void> {
  save(load().filter((s) => s.id !== id));
  return Promise.resolve();
}
