/**
 * Mock data for the reading-path (collections / connection graph) feature — lets the path read,
 * discovery feed, and "이 문장이 속한 길" render and interact without a backend. Gated by
 * `NEXT_PUBLIC_USE_MOCKS=1` (see {@link USE_MOCKS}); when off the real `request`/`fetch` calls run.
 *
 * Mirrors the kurl-ios MockBackend: a seeded PATH whose ordered connections quote sentences that
 * actually appear in the mock posts' bodies (so the quote deep-link lands and the source highlight
 * paints), plus a few collections, a discovery flow with a PATH-kind entry, and the
 * public-highlights-collections route.
 *
 * Lives under `modules/` so the Korean fixture copy is fine (the i18n guard only scans
 * app/components/hooks/lib).
 */
import type {
  CollectionDetail,
  CollectionSummary,
  Connection,
  ConnectionEvent,
  DiscoverFeed,
  NewCollection,
} from "@/modules/blog/api/collections";
import type { MyHighlightItem } from "@/modules/blog/api/highlights";

// Mock authors (mirror _mocks.ts AUTHORS) — only what the discovery card needs.
const CURATORS = {
  minji: { id: 2, username: "minji", bio: "1인 메이커 · 그로스", avatarUrl: "https://i.pravatar.cc/120?img=45" },
  haruka: { id: 3, username: "haruka", bio: "플랫폼 엔지니어", avatarUrl: null },
  jinhwa: { id: 4, username: "jinhwa", bio: "느리게 읽고 오래 쓰는 사람", avatarUrl: "https://i.pravatar.cc/120?img=32" },
  doha: { id: 5, username: "doha", bio: "에세이 · 거리 두기", avatarUrl: "https://i.pravatar.cc/120?img=15" },
  sol: { id: 6, username: "sol", bio: "작업실에서, 손으로", avatarUrl: null },
};

// Quotes lifted from _mocks.ts sampleBlocks — present in EVERY mock post body, so the deep-link
// scroll-to-sentence lands wherever the path step points.
const Q_PROCESS = "좋은 결정은 과정을 남긴다 — 결과만큼 이유가 중요하다.";
const Q_SIMPLE = "요약하면, 작은 서비스일수록 단순함이 이긴다.";
const Q_MEASURE = "도입 전후를 같은 부하로 비교했다.";

// A connection's flat block shape — only the fields for `blockType` matter.
function hl(id: number, quote: string, postTitle: string, username: string, slug: string, why: string): Connection {
  return { id, blockType: "HIGHLIGHT", why, title: postTitle, excerpt: null, slug, username, quote, body: null };
}
function post(id: number, title: string, excerpt: string, username: string, slug: string, why: string | null): Connection {
  return { id, blockType: "POST", why, title, excerpt, slug, username, quote: null, body: null };
}
function note(id: number, body: string, why: string | null): Connection {
  return { id, blockType: "NOTE", why, title: null, excerpt: null, slug: null, username: null, quote: null, body };
}

// The seeded reading path (PATH) — an argument walked sentence by sentence. The `why` on each step is
// the bridge from the previous sentence to this one.
const pathConnections: Connection[] = [
  hl(101, Q_PROCESS, "헥사고날 아키텍처, 작은 서비스에 과했을까", "haruka", "hexagonal-too-much",
    "결정을 글로 남기는 습관이 이 길의 출발점이었다."),
  hl(102, Q_MEASURE, "Spring Boot 트랜잭션 전파, 다시 정리", "dohyun", "spring-tx-propagation",
    "그래서 바꾸기 전에 먼저 같은 조건으로 재 봤다."),
  hl(103, Q_SIMPLE, "헥사고날 아키텍처, 작은 서비스에 과했을까", "haruka", "hexagonal-too-much",
    "측정이 내린 결론은 늘 같았다 — 단순함."),
  note(104, "여기까지가 '과정을 남긴다 → 측정한다 → 단순함이 이긴다'로 이어지는 한 흐름. 다음엔 이걸 팀에 어떻게 옮길지.", null),
];

const PATH: CollectionDetail = {
  id: 1,
  title: "결정을 남기는 법",
  description: "과정을 기록하고, 측정하고, 단순함으로 돌아오는 한 흐름.",
  visibility: "PUBLIC",
  kind: "PATH",
  curatorUsername: "haruka",
  connections: pathConnections,
};

const collectionConnections: Connection[] = [
  post(201, "1인 개발자의 가격 정책 실험: 무료에서 Pro까지", "전환율을 보며 무료 한도와 Pro 경계를 네 번 바꾼 기록.",
    "minji", "pricing-experiment-free-to-pro", "가격은 한 번에 못 정한다는 걸 보여주는 글."),
  hl(202, "좋은 이름은 주석을 지운다.", "리팩터링: 이름 짓기에 하루를 쓰는 이유", "dohyun", "naming-things",
    "북마크가 아니라, 왜 담았는지가 남는 게 컬렉션."),
];

const COLLECTION: CollectionDetail = {
  id: 2,
  title: "프로덕트 노트",
  description: "프로덕트를 만들며 다시 보는 글·구절·생각.",
  visibility: "PUBLIC",
  kind: "COLLECTION",
  curatorUsername: "dohyun",
  connections: collectionConnections,
};

// The viewer's own highlights (내 서재) — drawn on the mock posts above, quoting sentences that appear
// in those bodies so the `?hl=` deep-link back lands on the painted span. Newest first.
const myHighlights: MyHighlightItem[] = [
  {
    id: 401,
    quote: Q_SIMPLE,
    note: "작은 서비스에서 매번 돌아오게 되는 문장.",
    postId: 3001,
    username: "haruka",
    slug: "hexagonal-too-much",
    title: "헥사고날 아키텍처, 작은 서비스에 과했을까",
    createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: 402,
    quote: Q_MEASURE,
    note: null,
    postId: 3002,
    username: "dohyun",
    slug: "spring-tx-propagation",
    title: "Spring Boot 트랜잭션 전파, 다시 정리",
    createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
  },
  {
    id: 403,
    quote: Q_PROCESS,
    note: "결정 회고를 남길 때 다시 꺼내 읽는 구절.",
    postId: 3001,
    username: "haruka",
    slug: "hexagonal-too-much",
    title: "헥사고날 아키텍처, 작은 서비스에 과했을까",
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
];

export function mockMyHighlights(): MyHighlightItem[] {
  return [...myHighlights];
}

function toSummary(c: CollectionDetail): CollectionSummary {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    visibility: c.visibility,
    kind: c.kind,
    count: c.connections.length,
    preview: c.connections
      .slice(0, 3)
      .map((x) => x.quote ?? x.title ?? x.body ?? "")
      .filter(Boolean),
  };
}

const mockStore: CollectionDetail[] = [PATH, COLLECTION];
let mockSeq = 9000;

export function mockMineCollections(): CollectionSummary[] {
  return mockStore.map(toSummary);
}

export function mockCollectionDetail(id: number): CollectionDetail | null {
  const found = mockStore.find((c) => c.id === id);
  return found ? { ...found, connections: [...found.connections] } : null;
}

export function mockCreateCollection(payload: NewCollection): CollectionSummary {
  const created: CollectionDetail = {
    id: ++mockSeq,
    title: payload.title,
    description: payload.description?.trim() || null,
    visibility: payload.visibility,
    kind: payload.kind,
    curatorUsername: "dohyun",
    connections: [],
  };
  mockStore.unshift(created);
  return toSummary(created);
}

export function mockConnect(
  collectionId: number,
  payload: { blockType: Connection["blockType"]; refId: number; why?: string | null },
): void {
  const target = mockStore.find((c) => c.id === collectionId);
  if (!target) return;
  // Best-effort label so the new connection shows in the detail/preview (demo only).
  target.connections.push({
    id: ++mockSeq,
    blockType: payload.blockType,
    why: payload.why?.trim() || null,
    title: payload.blockType === "POST" ? "연결한 글" : payload.blockType === "HIGHLIGHT" ? "연결한 하이라이트" : null,
    excerpt: null,
    slug: null,
    username: null,
    quote: payload.blockType === "HIGHLIGHT" ? "이 문장을 길에 이었어요." : null,
    body: payload.blockType === "NOTE" ? "연결한 노트" : null,
  });
}

export function mockReorderConnections(collectionId: number, connectionIds: number[]): void {
  const target = mockStore.find((c) => c.id === collectionId);
  if (!target) return;
  const byId = new Map(target.connections.map((x) => [x.id, x]));
  target.connections = connectionIds.map((id) => byId.get(id)).filter((x): x is Connection => !!x);
}

export function mockDiscoverConnections(): DiscoverFeed {
  const now = Date.now();
  const items: ConnectionEvent[] = [
    {
      id: 301,
      curator: CURATORS.haruka,
      collectionId: 1,
      collectionTitle: "결정을 남기는 법",
      collectionKind: "PATH",
      why: "측정이 내린 결론은 늘 같았다 — 단순함.",
      connectedAt: new Date(now - 2 * 3_600_000).toISOString(),
      blockType: "HIGHLIGHT",
      title: "헥사고날 아키텍처, 작은 서비스에 과했을까",
      excerpt: null,
      slug: "hexagonal-too-much",
      username: "haruka",
      quote: Q_SIMPLE,
      body: null,
    },
    {
      id: 302,
      curator: CURATORS.minji,
      collectionId: 2,
      collectionTitle: "프로덕트 노트",
      collectionKind: "COLLECTION",
      why: "가격은 한 번에 못 정한다는 걸 보여주는 글.",
      connectedAt: new Date(now - 26 * 3_600_000).toISOString(),
      blockType: "POST",
      title: "1인 개발자의 가격 정책 실험: 무료에서 Pro까지",
      excerpt: "전환율을 보며 무료 한도와 Pro 경계를 네 번 바꾼 기록.",
      slug: "pricing-experiment-free-to-pro",
      username: "minji",
      quote: null,
      body: null,
    },
  ];
  return { items, hasNext: false };
}

export function mockCollectionsContainingHighlight(_highlightId: number): CollectionSummary[] {
  // In mock mode every highlight resolves to the seeded PATH so the discovery loop is exercisable.
  return [toSummary(PATH)];
}

// ── 공개(비개인화) 연결 피드 — 비로그인 첫 화면에 흐르는 "지금 이어지는 것들" ──
// 세 실루엣이 번갈아 오게 구성(하이라이트=초록 좌측 룰 · 글=테두리 카드 · 노트=맨 종이)해서, 피드에
// 몇 칸마다 하나씩 끼워도 눈이 종류를 한 번에 읽는다. 산문은 현실적인 큐레이션 한 줄.
const PUBLIC_CONNECTIONS: ConnectionEvent[] = [
  {
    id: 501,
    curator: CURATORS.jinhwa,
    collectionId: 11,
    collectionTitle: "느린 사고",
    collectionKind: "PATH",
    why: "읽고 나서 일주일을 곱씹게 한 문단. 결정을 미루는 게 게으름이 아니라는 걸 처음 납득시킨 글.",
    connectedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    blockType: "HIGHLIGHT",
    title: "기다림의 기술",
    excerpt: null,
    slug: "the-art-of-waiting",
    username: "jinhwa",
    quote: "판단을 유보한다는 건 정보를 더 기다린다는 뜻이지, 아무것도 안 한다는 뜻이 아니다.",
    body: null,
  },
  {
    id: 502,
    curator: CURATORS.doha,
    collectionId: 12,
    collectionTitle: "경계를 긋는다는 것",
    collectionKind: "COLLECTION",
    why: "거절의 언어에 대한 세 편을 한자리에 모으는 중. 이건 그중 가장 다정한 쪽.",
    connectedAt: new Date(Date.now() - 20 * 3_600_000).toISOString(),
    blockType: "POST",
    title: "아니오,라고 말하는 연습",
    excerpt: "거절을 관계의 끝이 아니라 관계의 조건으로 다시 읽기.",
    slug: "practice-saying-no",
    username: "doha",
    quote: null,
    body: null,
  },
  {
    id: 503,
    curator: CURATORS.sol,
    collectionId: 13,
    collectionTitle: "작업실 노트",
    collectionKind: "COLLECTION",
    why: "이 문장 하나 붙여두려고 컬렉션을 새로 팠다.",
    connectedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    blockType: "NOTE",
    title: null,
    excerpt: null,
    slug: null,
    username: null,
    quote: null,
    body: "완성이 아니라 '놓아줄 수 있는 상태'를 목표로 삼기로 했다.",
  },
  {
    id: 504,
    curator: CURATORS.minji,
    collectionId: 2,
    collectionTitle: "프로덕트 노트",
    collectionKind: "COLLECTION",
    why: "가격은 한 번에 못 정한다는 걸 보여주는 글 — 나중에 나도 이 순서로 실험했다.",
    connectedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    blockType: "POST",
    title: "1인 개발자의 가격 정책 실험: 무료에서 Pro까지",
    excerpt: "전환율을 보며 무료 한도와 Pro 경계를 네 번 바꾼 기록.",
    slug: "pricing-experiment-free-to-pro",
    username: "minji",
    quote: null,
    body: null,
  },
  {
    id: 505,
    curator: CURATORS.haruka,
    collectionId: 1,
    collectionTitle: "결정을 남기는 법",
    collectionKind: "PATH",
    why: "측정이 내린 결론은 늘 같았다 — 단순함.",
    connectedAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    blockType: "HIGHLIGHT",
    title: "헥사고날 아키텍처, 작은 서비스에 과했을까",
    excerpt: null,
    slug: "hexagonal-too-much",
    username: "haruka",
    quote: Q_SIMPLE,
    body: null,
  },
  {
    id: 506,
    curator: CURATORS.jinhwa,
    collectionId: 11,
    collectionTitle: "느린 사고",
    collectionKind: "PATH",
    why: "속도를 늦추는 것과 멈추는 것은 다르다 — 이 노트가 그 차이를 붙잡아 준다.",
    connectedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    blockType: "NOTE",
    title: null,
    excerpt: null,
    slug: null,
    username: null,
    quote: null,
    body: "서두르지 않기로 했다. 대신 매일 한 줄씩만 옮겨 적는다.",
  },
];

export function mockPublicConnectionFeed(page = 0, size = 12): DiscoverFeed {
  const start = page * size;
  const items = PUBLIC_CONNECTIONS.slice(start, start + size);
  return { items, hasNext: start + size < PUBLIC_CONNECTIONS.length, page, size };
}

// "속함" 한 올 — 어떤 글이 어떤 공개 컬렉션에 담겼는지. 몇몇 글만 담겨 있고(없으면 줄 자체가 안 뜬다),
// 첫 컬렉션의 큐레이터/제목이 카드 한 줄로 나온다. postId 로 결정적 매핑(있는 것만).
const POST_COLLECTIONS: Record<number, CollectionSummary[]> = {
  // _mocks.ts SEEDS 의 목 글 id(= index+1) 중 몇 개만 담김 — 나머지는 [](줄 자체가 안 뜬다).
  // id 3 = hexagonal-too-much, 6 = spring-tx-propagation, 7 = killed-side-project, 9 = naming-things.
  3: [
    { id: 1, title: "결정을 남기는 법", description: null, visibility: "PUBLIC", kind: "PATH", count: 4, preview: [] },
    { id: 2, title: "프로덕트 노트", description: null, visibility: "PUBLIC", kind: "COLLECTION", count: 8, preview: [] },
    { id: 11, title: "느린 사고", description: null, visibility: "PUBLIC", kind: "PATH", count: 5, preview: [] },
  ],
  6: [
    { id: 1, title: "결정을 남기는 법", description: null, visibility: "PUBLIC", kind: "PATH", count: 4, preview: [] },
  ],
  7: [
    { id: 2, title: "프로덕트 노트", description: null, visibility: "PUBLIC", kind: "COLLECTION", count: 8, preview: [] },
    { id: 12, title: "경계를 긋는다는 것", description: null, visibility: "PUBLIC", kind: "COLLECTION", count: 3, preview: [] },
  ],
  9: [
    { id: 13, title: "작업실 노트", description: null, visibility: "PUBLIC", kind: "COLLECTION", count: 6, preview: [] },
  ],
};

export function mockPostCollections(postId: number): CollectionSummary[] {
  return POST_COLLECTIONS[postId] ?? [];
}
