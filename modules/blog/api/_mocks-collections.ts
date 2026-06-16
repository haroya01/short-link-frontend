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

// Mock authors (mirror _mocks.ts AUTHORS) — only what the discovery card needs.
const CURATORS = {
  minji: { id: 2, username: "minji", bio: "1인 메이커 · 그로스", avatarUrl: "https://i.pravatar.cc/120?img=45" },
  haruka: { id: 3, username: "haruka", bio: "플랫폼 엔지니어", avatarUrl: null },
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
