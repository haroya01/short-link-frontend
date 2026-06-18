import { FeedCard, FeedList } from "url-shortener";

const thumb =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#059669'/><stop offset='1' stop-color='#a7f3d0'/></linearGradient></defs><rect width='160' height='120' fill='url(#g)'/></svg>",
  );

const lead = {
  id: 1,
  author: { username: "jihye", avatarUrl: null },
  slug: "thousand-true-fans",
  title: "작게, 깊게: 1,000명의 진짜 팬에 대하여",
  excerpt:
    "확장보다 연결. 조용한 웹로그가 더 멀리 가는 이유를, 6개월간의 운영 기록과 함께 정리했다.",
  ogImageUrl: null,
  languageTag: "ko",
  tags: ["에세이"],
  publishedAt: "2026-05-30T00:00:00Z",
  viewCount: 0,
  likeCount: 42,
  followReason: null,
};

const withImage = {
  ...lead,
  id: 2,
  author: { username: "minu", avatarUrl: null },
  slug: "reading-paths",
  title: "읽기의 길 — 한 문장이 속한 맥락",
  excerpt: "하이라이트를 연결로 바꾸면, 읽기는 발견이 된다.",
  ogImageUrl: thumb,
  tags: ["제품"],
  publishedAt: "2026-05-28T00:00:00Z",
  likeCount: 0,
};

export const Feed = () => (
  <div style={{ maxWidth: 640 }}>
    <FeedList>
      <FeedCard item={lead as never} locale="ko" featured featuredLabel="오늘의 글" showBookmark={false} />
      <FeedCard item={withImage as never} locale="ko" showBookmark={false} />
    </FeedList>
  </div>
);

export const SinglePost = () => (
  <div style={{ maxWidth: 640 }}>
    <FeedList>
      <FeedCard item={lead as never} locale="ko" hideAuthor showBookmark={false} />
    </FeedList>
  </div>
);
