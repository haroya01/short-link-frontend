import { DiscoveryCard, DiscoveryGrid, DiscoveryCell } from "url-shortener";

const coverImg =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#059669'/><stop offset='1' stop-color='#a7f3d0'/></linearGradient></defs><rect width='320' height='180' fill='url(#g)'/></svg>",
  );

const coverImg2 =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g2' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1d4ed8'/><stop offset='1' stop-color='#93c5fd'/></linearGradient></defs><rect width='320' height='180' fill='url(#g2)'/></svg>",
  );

const coverImg3 =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs><linearGradient id='g3' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#7c3aed'/><stop offset='1' stop-color='#ddd6fe'/></linearGradient></defs><rect width='320' height='180' fill='url(#g3)'/></svg>",
  );

// Canonical cover-variant post (has ogImageUrl)
const postCover = {
  id: 1,
  author: { username: "jihye", avatarUrl: null },
  slug: "reading-paths-2026",
  title: "읽기의 길 — 한 문장이 속한 맥락",
  excerpt: "하이라이트를 연결로 바꾸면, 읽기는 발견이 된다.",
  ogImageUrl: coverImg,
  languageTag: "ko",
  tags: ["에세이"],
  publishedAt: "2026-06-01T00:00:00Z",
  viewCount: 840,
  likeCount: 57,
  followReason: null,
};

// Text-variant post (no ogImageUrl, has excerpt)
const postText = {
  id: 2,
  author: { username: "minu", avatarUrl: null },
  slug: "thousand-true-fans",
  title: "작게, 깊게: 1,000명의 진짜 팬에 대하여",
  excerpt:
    "확장보다 연결. 조용한 웹로그가 더 멀리 가는 이유를, 6개월간의 운영 기록과 함께 정리했다. 수치보다 깊이를 선택한 근거를 솔직하게 풀어낸다.",
  ogImageUrl: null,
  languageTag: "ko",
  tags: ["제품"],
  publishedAt: "2026-05-28T00:00:00Z",
  viewCount: 1200,
  likeCount: 42,
  followReason: null,
};

// Featured cover post
const postFeatured = {
  id: 3,
  author: { username: "areum", avatarUrl: null },
  slug: "why-we-write",
  title: "왜 우리는 쓰는가 — 글쓰기의 사회적 의미",
  excerpt: null,
  ogImageUrl: coverImg2,
  languageTag: "ko",
  tags: ["글쓰기"],
  publishedAt: "2026-06-10T00:00:00Z",
  viewCount: 2300,
  likeCount: 128,
  followReason: null,
};

// Post with followReason (TOPIC)
const postTopic = {
  id: 4,
  author: { username: "soyeon", avatarUrl: null },
  slug: "design-system-korean-type",
  title: "한국어 타이포그래피와 디자인 시스템의 충돌",
  excerpt:
    "영어 기준으로 설계된 폰트 스케일이 한글 가독성을 어떻게 망치는지, 그리고 우리가 택한 해법.",
  ogImageUrl: coverImg3,
  languageTag: "ko",
  tags: ["디자인"],
  publishedAt: "2026-06-05T00:00:00Z",
  viewCount: 560,
  likeCount: 31,
  followReason: { kind: "TOPIC", tag: "디자인" },
};

// Text-only, no excerpt (minimal card)
const postMinimal = {
  id: 5,
  author: { username: "junho", avatarUrl: null },
  slug: "short-links-in-posts",
  title: "글 속의 링크가 살아있을 때",
  excerpt: null,
  ogImageUrl: null,
  languageTag: "ko",
  tags: ["kurl"],
  publishedAt: "2026-06-15T00:00:00Z",
  viewCount: 190,
  likeCount: 0,
  followReason: null,
};

/** Canonical grid: 3 cards in DiscoveryGrid (cover + text + cover) */
export const Grid = () => (
  <div style={{ maxWidth: 960, padding: "0 16px" }}>
    <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
      DiscoveryGrid — 3-column masonry
    </div>
    <DiscoveryGrid>
      <DiscoveryCell entranceDelay={0}>
        <DiscoveryCard item={postFeatured as never} locale="ko" featured eager />
      </DiscoveryCell>
      <DiscoveryCell entranceDelay={80}>
        <DiscoveryCard item={postText as never} locale="ko" />
      </DiscoveryCell>
      <DiscoveryCell entranceDelay={160}>
        <DiscoveryCard item={postCover as never} locale="ko" eager />
      </DiscoveryCell>
    </DiscoveryGrid>
  </div>
);

/** Single card — text variant with excerpt */
export const SingleText = () => (
  <div style={{ maxWidth: 380, padding: "0 16px" }}>
    <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
      Single — text variant (no image)
    </div>
    <DiscoveryCard item={postText as never} locale="ko" />
  </div>
);

/** Single card — cover variant */
export const SingleCover = () => (
  <div style={{ maxWidth: 380, padding: "0 16px" }}>
    <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
      Single — cover variant (ogImageUrl)
    </div>
    <DiscoveryCard item={postCover as never} locale="ko" />
  </div>
);

/** Full grid: 5 cards including featured, topic-reason, and minimal text */
export const GridFull = () => (
  <div style={{ maxWidth: 960, padding: "0 16px" }}>
    <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
      DiscoveryGrid — 5-card mix (featured · cover · text · topic-reason · no-excerpt)
    </div>
    <DiscoveryGrid>
      <DiscoveryCell entranceDelay={0}>
        <DiscoveryCard item={postFeatured as never} locale="ko" featured eager />
      </DiscoveryCell>
      <DiscoveryCell entranceDelay={60}>
        <DiscoveryCard item={postTopic as never} locale="ko" />
      </DiscoveryCell>
      <DiscoveryCell entranceDelay={120}>
        <DiscoveryCard item={postText as never} locale="ko" />
      </DiscoveryCell>
      <DiscoveryCell entranceDelay={180}>
        <DiscoveryCard item={postCover as never} locale="ko" />
      </DiscoveryCell>
      <DiscoveryCell entranceDelay={240}>
        <DiscoveryCard item={postMinimal as never} locale="ko" />
      </DiscoveryCell>
    </DiscoveryGrid>
  </div>
);
