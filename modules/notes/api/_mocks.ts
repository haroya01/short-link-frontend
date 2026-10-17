import { ApiError } from "@/lib/api/client";
import type { PublicFeedItem, PublicFeedView } from "@/modules/blog/api/public-posts";
import { MOCK_ALL_ITEMS, MOCK_BLOCKS_VIEWER, MOCK_SERIES_NOTES, mockNoteSeries } from "@/modules/blog/api/_mocks";
import type {
  FederationSettings,
  Note,
  NoteAuthor,
  NoteDraft,
  NoteEdit,
  NoteFeed,
  NoteHistory,
  MutedUser,
  MuteStatus,
  NoteFilter,
  NoteFilterDraft,
  NoteListSummary,
  NotePoll,
  NoteReplyPolicy,
  NoteThread,
  PostQuotes,
  ProfileMediaFeed,
  ProfileRepliesFeed,
  RemoteAccount,
  ScheduledNote,
  TrendingNoteLink,
  TrendingNoteTag,
} from "./notes";
import type { RemoteAccountSearchBody, RemoteDomainListBody, RemoteResolveBody } from "./federation-search";
import type { RemoteAccountsBody, RemoteMutesBody } from "./remote-safety";
import type { RemoteTrendingBody, TrendingNote } from "./remote-trending";

const ME = { id: 1, username: "dohyun", avatarUrl: "https://i.pravatar.cc/120?img=12" };
const YUNA = { id: 15, username: "yuna", avatarUrl: "https://i.pravatar.cc/120?img=20" };
const HARUKA = { id: 3, username: "haruka", avatarUrl: "https://i.pravatar.cc/120?img=32", displayName: "하루카" };
const MINA = {
  id: -9800,
  username: "mina@mastodon.social",
  avatarUrl: null,
  displayName: "Mina",
  remoteId: 9800,
  url: "https://mastodon.social/@mina",
};
const HARUTO = {
  id: -9801,
  username: "haruto@misskey.io",
  avatarUrl: null,
  displayName: "Haruto",
  remoteId: 9801,
  url: "https://misskey.io/@haruto",
};
const NORA = {
  id: -9806,
  username: "nora@blog.example",
  avatarUrl: null,
  displayName: "Nora",
  remoteId: 9806,
  url: "https://blog.example/author/nora",
};
const TOMAS = {
  id: -9807,
  username: "tomas@lemmy.example",
  avatarUrl: null,
  displayName: "Tomas",
  remoteId: 9807,
  url: "https://lemmy.example/u/tomas",
};
const TRAILCAM = {
  id: -9808,
  username: "trailcam@pt.example",
  avatarUrl: null,
  displayName: "Trail Camera",
  remoteId: 9808,
  url: "https://pt.example/a/trailcam",
};

function note(partial: Partial<Note> & Pick<Note, "id" | "body" | "author">): Note {
  return {
    createdAt: "2026-10-05T09:00:00Z",
    editedAt: null,
    likeCount: 0,
    likedByMe: false,
    media: [],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    repostCount: 0,
    repostedByMe: false,
    quotedNote: null,
    linkPreview: null,
    replyPolicy: "everyone",
    ...partial,
  };
}

let notes: Note[] = [
  note({
    id: 6,
    body: "이 사진들 보고 나도 오늘 걸었다.",
    author: ME,
    createdAt: "2026-10-05T11:30:00Z",
    repostCount: 1,
    quotedNote: {
      id: 5,
      body: "산책하다 찍은 것들. 길이 다 다르게 생겼다.",
      createdAt: "2026-10-05T10:30:00Z",
      author: YUNA,
      media: [
        { url: "https://picsum.photos/seed/kurl-walk-1/600/800", altText: "골목 끝에 선 가로등", contentType: "image/jpeg", width: 600, height: 800 },
      ],
    },
  }),
  note({
    id: 3,
    body: "오늘 쓴 글의 씨앗: 단축 링크가 사라지면 글도 같이 끊긴다 https://kurl.me/about",
    author: YUNA,
    createdAt: "2026-10-05T11:00:00Z",
    replyCount: 1,
    repostedByMe: true,
    linkPreview: {
      url: "https://kurl.me/about",
      title: "kurl — 짧은 링크와 글이 오래 사는 곳",
      description: "링크를 줄이고, 글을 쓰고, 그 사이를 엮는다.",
      image: "https://picsum.photos/seed/kurl-about/960/502",
    },
  }),
  note({
    id: 10,
    body: "회고 끝나고 점심 어디서 먹을까요?",
    author: YUNA,
    createdAt: "2026-10-05T10:45:00Z",
    poll: {
      expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      expired: false,
      multiple: false,
      votesCount: 9,
      votersCount: 9,
      options: [
        { title: "국밥", votesCount: 5 },
        { title: "파스타", votesCount: 3 },
        { title: "샐러드", votesCount: 1 },
      ],
      voted: false,
      ownVotes: [],
    },
  }),
  note({
    id: 5,
    body: "산책하다 찍은 것들. 길이 다 다르게 생겼다. #산책",
    author: YUNA,
    createdAt: "2026-10-05T10:30:00Z",
    media: [
      { url: "https://picsum.photos/seed/kurl-walk-1/600/800", altText: "골목 끝에 선 가로등", contentType: "image/jpeg", width: 600, height: 800 },
      { url: "https://picsum.photos/seed/kurl-walk-2/900/600", altText: null, contentType: "image/jpeg", width: 900, height: 600 },
      { url: "https://picsum.photos/seed/kurl-walk-3/700/700", altText: "강가의 낮은 다리", contentType: "image/jpeg", width: 700, height: 700 },
    ],
  }),
  note({
    id: 2,
    body: "블로그 글을 인용해 봤어요.",
    author: ME,
    likeCount: 2,
    createdAt: "2026-10-05T10:00:00Z",
    quotedPost: { id: 5, title: "타입스크립트 제네릭이 어려운 이유", slug: "typescript-generics", authorUsername: "dohyun" },
  }),
  note({
    id: 1,
    body: "창밖 사진",
    author: ME,
    likeCount: 0,
    media: [{ url: "https://picsum.photos/seed/kurl-note/800/600", altText: "비 오는 창밖", contentType: "image/jpeg", width: 800, height: 600 }],
  }),
  note({ id: 4, body: "@yuna 좋은 생각이에요", mentions: ["yuna"], author: ME, inReplyToId: 3, likeCount: 0, createdAt: "2026-10-05T12:00:00Z" }),
  note({
    id: 7,
    body: "마지막 장면에서 주인공이 결국 돌아오지 않는다. 그래서 더 오래 남는다.",
    author: YUNA,
    createdAt: "2026-10-04T09:00:00Z",
    contentWarning: "영화 결말 이야기",
    sensitive: true,
  }),
  note({
    id: 9,
    body: "@dohyun 다음 주 회고, 둘이 먼저 맞춰 볼래요?",
    author: YUNA,
    createdAt: "2026-10-04T07:00:00Z",
    mentions: ["dohyun"],
    visibility: "direct",
  }),
  note({
    id: 8,
    body: "수술 끝나고 꿰맨 자리. 잘 아물고 있다.",
    author: YUNA,
    createdAt: "2026-10-04T08:00:00Z",
    sensitive: true,
    media: [{ url: "https://picsum.photos/seed/kurl-note-d/800/600", altText: "꿰맨 자리", contentType: "image/jpeg", width: 800, height: 600 }],
  }),
  note({
    id: 11,
    body: "포트와 어댑터, 오늘은 어댑터만 세 개 늘었다.",
    author: HARUKA,
    createdAt: "2026-10-03T09:00:00Z",
  }),
  note({
    id: 14,
    body: "Which day works for the next meetup?",
    author: MINA,
    createdAt: "2026-10-03T09:30:00Z",
    language: "en",
    poll: {
      expiresAt: new Date(Date.now() + 2 * 86_400 * 1000).toISOString(),
      expired: false,
      multiple: false,
      votesCount: 27,
      votersCount: 27,
      options: [
        { title: "Friday", votesCount: 8 },
        { title: "Saturday", votesCount: 14 },
        { title: "Sunday", votesCount: 5 },
      ],
      voted: true,
      ownVotes: [],
    },
    remote: { kind: "QUESTION", title: null, url: "https://mastodon.social/@mina/113300000000000014", community: null },
  }),
  note({
    id: 15,
    body: "週末のランチ、どこにする？",
    author: HARUTO,
    createdAt: "2026-10-03T09:20:00Z",
    language: "ja",
    poll: {
      expiresAt: null,
      expired: false,
      multiple: false,
      votesCount: 11,
      votersCount: 11,
      options: [
        { title: "そば", votesCount: 4 },
        { title: "カレー", votesCount: 7 },
      ],
      voted: true,
      ownVotes: [],
    },
    remote: { kind: "QUESTION", title: null, url: "https://misskey.io/notes/9xk2a1b3c4", community: null },
  }),
  note({
    id: 16,
    body: "올해는 모종 여섯 개로 시작했다. 장마가 길어서 절반은 잎곰팡이에 졌고, 남은 셋이 8월 내내 열매를 냈다. 내년엔 간격을 넓히고 지지대를 먼저 세울 생각이다.",
    author: NORA,
    createdAt: "2026-10-03T09:10:00Z",
    language: "ko",
    media: [
      { url: "https://picsum.photos/seed/kurl-remote-tomato/1200/628", altText: null, contentType: "image/jpeg", width: 1200, height: 628 },
    ],
    remote: { kind: "ARTICLE", title: "토마토 한 철, 인내의 기록", url: "https://blog.example/2026/10/tomato-season/", community: null },
  }),
  note({
    id: 17,
    body: "Built two 1.2 m beds this spring from untreated cedar. The soil warmed up two weeks earlier than the ground plot, and weeding took a third of the time. Cost was the catch. Curious what others used.",
    author: TOMAS,
    createdAt: "2026-10-03T09:05:00Z",
    language: "en",
    media: [
      { url: "https://picsum.photos/seed/kurl-remote-beds/1200/628", altText: "Two cedar raised beds", contentType: "image/jpeg", width: 1200, height: 628 },
    ],
    remote: {
      kind: "PAGE",
      title: "Raised beds: worth the lumber?",
      url: "https://lemmy.example/post/12345",
      community: "gardening@lemmy.example",
    },
  }),
  note({
    id: 18,
    body: "Recorded at dawn near the upper falls. No music, just water.",
    author: TRAILCAM,
    createdAt: "2026-10-03T08:30:00Z",
    language: "en",
    media: [
      { url: "https://picsum.photos/seed/kurl-remote-stream/1280/720", altText: null, contentType: "image/jpeg", width: 1280, height: 720 },
    ],
    remote: { kind: "VIDEO", title: "Ten minutes of a forest stream", url: "https://pt.example/w/9c1f2e", community: null },
  }),
  note({
    id: 12,
    body: "Hello from the fediverse 👋 #kurl",
    author: MINA,
    likeCount: 2,
    createdAt: "2026-10-03T08:00:00Z",
  }),
  note({
    id: 13,
    body: "오늘 찍은 파도 소리와 영상",
    author: MINA,
    createdAt: "2026-10-03T07:00:00Z",
    media: [
      { url: "https://files.mastodon.social/waves.mp4", altText: "밀려오는 파도", contentType: "video/mp4" },
      { url: "https://files.mastodon.social/waves.mp3", altText: "파도 소리", contentType: "audio/mpeg" },
    ],
  }),
  note({ id: 30, body: "헥사고날로 옮긴 지 석 달. 남은 것 세 가지를 적어 둔다.", author: HARUKA, createdAt: "2026-09-28T09:00:00Z" }),
  note({ id: 31, body: "하나. 테스트가 빨라졌다.", author: HARUKA, createdAt: "2026-09-28T09:00:10Z", inReplyToId: 30 }),
  note({ id: 32, body: "둘. 경계를 먼저 긋게 됐다.", author: HARUKA, createdAt: "2026-09-28T09:00:20Z", inReplyToId: 31 }),
  note({ id: 33, body: "셋. 이름 짓는 데 시간을 쓴다.", author: HARUKA, createdAt: "2026-09-28T09:00:30Z", inReplyToId: 32 }),
  note({ id: 34, body: "셋째가 제일 공감돼요.", author: YUNA, createdAt: "2026-09-29T09:00:00Z", inReplyToId: 30 }),
  note({
    id: 70,
    body: "다음 주 회고 안건, 같이 준비하는 사람만 답해 주세요 @haruka",
    author: YUNA,
    mentions: ["haruka"],
    replyPolicy: "mentioned",
    replyCount: 1,
    createdAt: "2026-09-20T09:00:00Z",
  }),
  note({ id: 71, body: "안건 셋이면 될 것 같아요.", author: HARUKA, inReplyToId: 70, replyPolicy: "mentioned", createdAt: "2026-09-20T10:00:00Z" }),
  note({ id: 72, body: "산책 코스 추천받아요.", author: ME, replyCount: 2, createdAt: "2026-09-19T09:00:00Z" }),
  note({ id: 73, body: "강변 쪽이 좋아요.", author: YUNA, inReplyToId: 72, createdAt: "2026-09-19T10:00:00Z" }),
  note({ id: 74, body: "여기 광고 링크 남겨요 https://example.com/deal", author: MINA, inReplyToId: 72, hidden: true, createdAt: "2026-09-19T10:30:00Z" }),
  note({ id: 75, body: "언덕길 끝 카페까지 추천.", author: HARUKA, inReplyToId: 72, createdAt: "2026-09-19T11:00:00Z" }),
  note({
    id: 20,
    body: "항구에서 본 저녁.",
    author: ME,
    createdAt: "2026-09-18T09:00:00Z",
    media: [
      {
        url: "https://d82putaebkgm4.cloudfront.net/note-images/1/e2e-harbor.jpg",
        altText: "항구의 저녁",
        contentType: "image/jpeg",
        width: 2400,
        height: 1800,
      },
    ],
  }),
  ...MOCK_SERIES_NOTES.map(({ id, body, contentWarning, createdAt }) =>
    note({ id, body, contentWarning, sensitive: Boolean(contentWarning), createdAt, author: ME }),
  ),
];
let nextId = 100;
const reposts = new Map<string, number[]>([[ME.username, [3]], [YUNA.username, [6]]]);
let settings: FederationSettings = { enabled: true, noticeSeen: false, handle: "@dohyun@kurl.me" };

const muted = new Map<string, MuteStatus>([["haruki", { muted: true, notifications: true, expiresAt: null }]]);
const MUTABLE: Record<string, { id: number; avatarUrl: string | null }> = {
  haruki: { id: 13, avatarUrl: "https://i.pravatar.cc/120?img=8" },
  yuna: YUNA,
  haruka: HARUKA,
};
const remoteBlocks = new Set<number>([9804]);
const remoteMutes = new Map<number, { notifications: boolean; expiresAt: string | null }>([
  [9805, { notifications: true, expiresAt: null }],
]);
const topLevel = () =>
  notes.filter((n) => n.inReplyToId === null && !n.author.remoteId && !muted.has(n.author.username));
const remoteTopLevel = (remoteId: number) =>
  remoteBlocks.has(remoteId) ? [] : notes.filter((n) => n.inReplyToId === null && n.author.remoteId === remoteId);
const listedRemote = (n: Note) =>
  !n.author.remoteId || (!remoteBlocks.has(n.author.remoteId) && !remoteMutes.has(n.author.remoteId));

const FILTERS_KEY = "kurl-mock-note-filters";

function storedFilters(): NoteFilter[] {
  try {
    return JSON.parse(sessionStorage.getItem(FILTERS_KEY) ?? "[]") as NoteFilter[];
  } catch {
    return [];
  }
}

function storeFilters(next: NoteFilter[]) {
  filters = next;
  try {
    sessionStorage.setItem(FILTERS_KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the filters live for this page only
  }
}

let filters: NoteFilter[] = typeof window === "undefined" ? [] : storedFilters();

export function mockFilters(): NoteFilter[] {
  return filters;
}

export function mockSaveFilter(draft: NoteFilterDraft, id: number | null): NoteFilter {
  const saved: NoteFilter = {
    id: id ?? Math.max(799, ...filters.map((f) => f.id)) + 1,
    phrase: draft.phrase,
    wholeWord: draft.wholeWord,
    context: draft.context,
    action: draft.action,
    expiresAt: draft.expiresIn === null ? null : new Date(Date.now() + draft.expiresIn * 1000).toISOString(),
  };
  storeFilters(id === null ? [saved, ...filters] : filters.map((f) => (f.id === id ? saved : f)));
  return saved;
}

export function mockDeleteFilter(id: number): void {
  storeFilters(filters.filter((f) => f.id !== id));
}

export function mockMuteStatus(username: string): MuteStatus {
  return muted.get(username) ?? { muted: false, notifications: false, expiresAt: null };
}

export function mockMute(username: string, notifications: boolean, duration: number | null): MuteStatus {
  const status = {
    muted: true,
    notifications,
    expiresAt: duration === null ? null : new Date(Date.now() + duration * 1000).toISOString(),
  };
  muted.set(username, status);
  return status;
}

export function mockUnmute(username: string): void {
  muted.delete(username);
}

export function mockMutedUsers(): MutedUser[] {
  return [...muted.entries()].map(([username, status]) => ({
    id: MUTABLE[username]?.id ?? 0,
    username,
    avatarUrl: MUTABLE[username]?.avatarUrl ?? null,
    notifications: status.notifications,
    expiresAt: status.expiresAt,
  }));
}
let bookmarks: number[] = [];
let showReposts = true;
let pins: number[] = [];
const earlierVersions = new Map<number, NoteHistory["versions"]>();
const repostsHidden = new Set<string>();

const QUOTING_POSTS: Record<number, PublicFeedItem[]> = {
  5: [
    {
      id: 801,
      author: { id: 4, username: "kazuki", bio: null, avatarUrl: null },
      slug: "kyoto-workation",
      title: "교토에서 한 달 살기: 워케이션 회고",
      excerpt: "낮엔 카페에서 코드, 밤엔 산책. 생산성과 외로움 사이의 균형.",
      ogImageUrl: null,
      languageTag: "ko",
      tags: ["일상", "여행"],
      publishedAt: "2026-10-05T12:00:00Z",
      viewCount: 0,
      likeCount: 0,
    },
  ],
};

// The author's own replies under a note, oldest answer first at each step — a thread written in parts.
function selfChain(root: Note): Note[] {
  const chain: Note[] = [];
  let current = root.id;
  while (chain.length < 9) {
    const next = notes
      .filter((n) => n.inReplyToId === current && n.author.id === root.author.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!next) break;
    chain.push(next);
    current = next.id;
  }
  return chain;
}

const withQuotes = (n: Note): Note => {
  const chain = n.inReplyToId === null ? selfChain(n) : [];
  return {
    ...n,
    quoteCount: notes.filter((q) => q.quotedNote?.id === n.id).length + (QUOTING_POSTS[n.id]?.length ?? 0),
    bookmarkedByMe: bookmarks.includes(n.id),
    thread: chain.length > 0 ? { total: chain.length + 1, preview: [chain[0]] } : null,
  };
};

export function mockQuotingPosts(id: number, page: number): PublicFeedView {
  return { items: page === 0 ? (QUOTING_POSTS[id] ?? []) : [], page, size: 20, hasNext: false };
}

export function mockFederatedNotes(page: number): NoteFeed {
  const received = notes.filter(
    (n) => n.inReplyToId === null && n.author.remoteId && (n.visibility ?? "public") === "public" && listedRemote(n),
  );
  return { items: page === 0 ? received.map(withQuotes) : [], page, hasNext: false };
}

export function mockTrendingNoteTags(): TrendingNoteTag[] {
  return [
    { tag: "산책", accounts: 3, uses: 5, history: [1, 0, 0, 1, 0, 1, 2] },
    { tag: "kurl", accounts: 2, uses: 2, history: [0, 0, 0, 0, 0, 1, 1] },
  ];
}

export function mockTrendingNoteLinks(): TrendingNoteLink[] {
  return [
    {
      url: "https://kurl.me/about",
      title: "kurl — 짧은 링크와 글이 오래 사는 곳",
      description: "링크를 줄이고, 글을 쓰고, 그 사이를 엮는다.",
      imageUrl: "https://picsum.photos/seed/kurl-about/960/502",
      accounts: 3,
      uses: 4,
      history: [0, 0, 1, 0, 1, 1, 1],
    },
    {
      url: "https://example.org/slow-web",
      title: null,
      description: null,
      imageUrl: null,
      accounts: 2,
      uses: 2,
      history: [0, 0, 0, 0, 1, 0, 1],
    },
  ];
}

export function mockLinkedNotes(url: string, page: number): NoteFeed {
  const items =
    page === 0
      ? notes.filter((n) => (n.visibility ?? "public") === "public" && n.linkPreview?.url === url)
      : [];
  return { items: items.map(withQuotes), page, hasNext: false };
}

export function mockTrendingNotes(page: number): NoteFeed {
  const ranked = [...topLevel().filter((n) => (n.visibility ?? "public") === "public")].sort(
    (a, b) => (b.likeCount ?? 0) + b.replyCount - ((a.likeCount ?? 0) + a.replyCount),
  );
  return { items: page === 0 ? ranked.map(withQuotes) : [], page, hasNext: false };
}

let languages: string[] = [];

export function mockFeedPreferences(): { showReposts: boolean; languages: string[] } {
  return { showReposts, languages };
}

export function mockSetShowReposts(on: boolean): { showReposts: boolean; languages: string[] } {
  showReposts = on;
  return { showReposts, languages };
}

export function mockSetLanguages(codes: string[]): { showReposts: boolean; languages: string[] } {
  languages = codes;
  return { showReposts, languages };
}

export function mockRepostVisibility(username: string): { hidden: boolean } {
  return { hidden: repostsHidden.has(username) };
}

export function mockSetRepostsHidden(username: string, hidden: boolean): { hidden: boolean } {
  if (hidden) repostsHidden.add(username);
  else repostsHidden.delete(username);
  return { hidden };
}

export function mockFollowingNotes(page: number): NoteFeed {
  if (page > 0) return { items: [], page, hasNext: false };
  const mine = topLevel().filter((n) => n.author.id === ME.id).map(withQuotes);
  const shown = showReposts && !repostsHidden.has(YUNA.username);
  const reposted = (shown ? (reposts.get(YUNA.username) ?? []) : [])
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is Note => n !== undefined && n.author.id !== YUNA.id)
    .map((n) => ({ ...withQuotes(n), repostedBy: YUNA }));
  const yunas = topLevel().filter((n) => n.author.id === YUNA.id).map(withQuotes);
  const seen = new Set<number>();
  const followedElsewhere = remoteAccounts
    .filter((a) => a.following)
    .flatMap((a) => remoteTopLevel(a.id))
    .filter(listedRemote)
    .map(withQuotes);
  const items = [...reposted, ...yunas, ...mine, ...followedElsewhere].filter(
    (n) => !seen.has(n.id) && seen.add(n.id),
  );
  return { items, page, hasNext: false };
}

let remoteAccounts: RemoteAccount[] = [
  {
    id: 9800,
    acct: "mina@mastodon.social",
    username: "mina",
    domain: "mastodon.social",
    displayName: "Mina",
    avatarUrl: null,
    url: "https://mastodon.social/@mina",
    following: true,
    requested: false,
  },
  {
    id: 9801,
    acct: "haruto@misskey.io",
    username: "haruto",
    domain: "misskey.io",
    displayName: "Haruto",
    avatarUrl: null,
    url: "https://misskey.io/@haruto",
    following: false,
    requested: false,
  },
  {
    id: 9802,
    acct: "sora@fosstodon.org",
    username: "sora",
    domain: "fosstodon.org",
    displayName: "Sora",
    avatarUrl: "https://i.pravatar.cc/120?img=47",
    url: "https://fosstodon.org/@sora",
    following: false,
    requested: false,
  },
  {
    id: 9803,
    acct: "aoi@mstdn.jp",
    username: "aoi",
    domain: "mstdn.jp",
    displayName: "あおい",
    avatarUrl: null,
    url: "https://mstdn.jp/@aoi",
    following: false,
    requested: false,
  },
  {
    id: 9804,
    acct: "deals@spam.example",
    username: "deals",
    domain: "spam.example",
    displayName: "Deals",
    avatarUrl: null,
    url: "https://spam.example/@deals",
    following: false,
    requested: false,
  },
  {
    id: 9805,
    acct: "ren@mastodon.online",
    username: "ren",
    domain: "mastodon.online",
    displayName: "Ren",
    avatarUrl: null,
    url: "https://mastodon.online/@ren",
    following: false,
    requested: false,
  },
  {
    id: 9806,
    acct: "nora@blog.example",
    username: "nora",
    domain: "blog.example",
    displayName: "Nora",
    avatarUrl: null,
    url: "https://blog.example/author/nora",
    following: true,
    requested: false,
  },
  {
    id: 9807,
    acct: "tomas@lemmy.example",
    username: "tomas",
    domain: "lemmy.example",
    displayName: "Tomas",
    avatarUrl: null,
    url: "https://lemmy.example/u/tomas",
    following: true,
    requested: false,
  },
  {
    id: 9808,
    acct: "trailcam@pt.example",
    username: "trailcam",
    domain: "pt.example",
    displayName: "Trail Camera",
    avatarUrl: null,
    url: "https://pt.example/a/trailcam",
    following: true,
    requested: false,
  },
];
const SUGGESTED_ELSEWHERE = [9802, 9803, 9801];
let nextRemoteId = 9900;
let domainBlocks: { domain: string; createdAt: string }[] = [];

const shown = (a: RemoteAccount): RemoteAccount => ({
  ...a,
  domainBlocked: domainBlocks.some((b) => b.domain === a.domain),
  blocking: remoteBlocks.has(a.id),
  muting: remoteMutes.has(a.id),
});

const remoteById = (id: number): Promise<RemoteAccount> => {
  const account = remoteAccounts.find((a) => a.id === id);
  return account
    ? Promise.resolve(shown(account))
    : Promise.reject(new ApiError(404, { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" }));
};

export function mockSetRemoteBlocked(id: number, on: boolean): Promise<RemoteAccount> {
  if (on) {
    remoteBlocks.add(id);
    remoteAccounts = remoteAccounts.map((a) => (a.id === id ? { ...a, following: false, requested: false } : a));
  } else {
    remoteBlocks.delete(id);
  }
  return remoteById(id);
}

export function mockMuteRemote(id: number, notifications: boolean, duration: number | null): Promise<RemoteAccount> {
  remoteMutes.set(id, {
    notifications,
    expiresAt: duration === null ? null : new Date(Date.now() + duration * 1000).toISOString(),
  });
  return remoteById(id);
}

export function mockUnmuteRemote(id: number): Promise<RemoteAccount> {
  remoteMutes.delete(id);
  return remoteById(id);
}

export function mockRemoteBlocks(): Promise<RemoteAccountsBody> {
  return Promise.resolve({ items: remoteAccounts.filter((a) => remoteBlocks.has(a.id)).map(shown) });
}

export function mockRemoteMutes(): Promise<RemoteMutesBody> {
  return Promise.resolve({
    items: remoteAccounts
      .filter((a) => remoteMutes.has(a.id))
      .map((a) => ({ account: shown(a), ...remoteMutes.get(a.id)! })),
  });
}

export function mockRemoteSuggestions(limit: number): Promise<RemoteAccountsBody> {
  const items = SUGGESTED_ELSEWHERE.map((id) => remoteAccounts.find((a) => a.id === id))
    .filter((a): a is RemoteAccount => a !== undefined && !a.following && !a.requested && !remoteBlocks.has(a.id))
    .slice(0, limit)
    .map(shown);
  return Promise.resolve({ items });
}

export function mockDomainBlocks() {
  return domainBlocks;
}

export function mockSetDomainBlocked(domain: string, on: boolean): Promise<void> {
  const key = domain.toLowerCase();
  domainBlocks = domainBlocks.filter((b) => b.domain !== key);
  if (on) {
    domainBlocks = [...domainBlocks, { domain: key, createdAt: new Date().toISOString() }];
    remoteAccounts = remoteAccounts.map((a) =>
      a.domain === key ? { ...a, following: false, requested: false } : a,
    );
  }
  return Promise.resolve();
}

// A follow request is accepted the next time the account is read, as a server that does not lock
// accounts answers within seconds.
export function mockLookupRemote(acct: string): Promise<RemoteAccount> {
  const [user, domain] = acct.replace(/^@/, "").split("@");
  if (!user || !domain) {
    return Promise.reject(new ApiError(400, { status: 400, code: "REMOTE_ACCOUNT_INVALID" }));
  }
  const key = `${user}@${domain.toLowerCase()}`;
  const known = remoteAccounts.find((a) => a.acct === key);
  if (known) return Promise.resolve(shown(known));
  const account: RemoteAccount = {
    id: nextRemoteId++,
    acct: key,
    username: user,
    domain: domain.toLowerCase(),
    displayName: user.charAt(0).toUpperCase() + user.slice(1),
    avatarUrl: null,
    url: `https://${domain.toLowerCase()}/@${user}`,
    following: false,
    requested: false,
  };
  remoteAccounts = [...remoteAccounts, account];
  return Promise.resolve(shown(account));
}

export function mockRemoteAccount(id: number): Promise<RemoteAccount> {
  const account = remoteAccounts.find((a) => a.id === id);
  if (!account) {
    return Promise.reject(new ApiError(404, { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" }));
  }
  if (account.requested) {
    remoteAccounts = remoteAccounts.map((a) =>
      a.id === id ? { ...a, requested: false, following: true } : a,
    );
  }
  return Promise.resolve(shown(remoteAccounts.find((a) => a.id === id)!));
}

export function mockSetRemoteFollow(id: number, on: boolean): Promise<RemoteAccount> {
  remoteAccounts = remoteAccounts.map((a) =>
    a.id === id ? { ...a, requested: on, following: false } : a,
  );
  return Promise.resolve(shown(remoteAccounts.find((a) => a.id === id)!));
}

export function mockRemoteFollowing(): RemoteAccount[] {
  return remoteAccounts.filter((a) => a.following || a.requested).map(shown);
}

export function mockRemoteAccountNotes(id: number, page: number): NoteFeed {
  return { items: page > 0 ? [] : remoteTopLevel(id).map(withQuotes), page, hasNext: false };
}

const NAMED_DOMAINS = [
  "mastodon.social",
  "misskey.io",
  "mstdn.jp",
  "fedibird.com",
  "qdon.space",
  "planet.moe",
  "social.silicon.moe",
  "mastodon.online",
  "mas.to",
  "fosstodon.org",
];

export function mockRemoteDomains(prefix: string, limit: number): Promise<RemoteDomainListBody> {
  const start = prefix.slice(prefix.lastIndexOf("@") + 1).trim().toLowerCase();
  const known = remoteAccounts.map((a) => a.domain).filter((d) => !d.endsWith(".example"));
  const domains = [...new Set([...known, ...NAMED_DOMAINS])].filter((d) => d.startsWith(start));
  return Promise.resolve({ items: domains.slice(0, limit).map((domain) => ({ domain })) });
}

export function mockSearchRemote(q: string, limit: number): Promise<RemoteAccountSearchBody> {
  const needle = q.toLowerCase();
  const items = remoteAccounts
    .filter(
      (a) =>
        a.username.toLowerCase().startsWith(needle) ||
        (a.displayName ?? "").toLowerCase().startsWith(needle) ||
        a.acct.startsWith(needle),
    )
    .slice(0, limit)
    .map(shown);
  return Promise.resolve({ items });
}

export function mockResolveRemote(q: string): Promise<RemoteResolveBody> {
  const address = /^https:\/\//i.test(q) ? new URL(q) : null;
  const domain = (address ? address.hostname : q.slice(q.lastIndexOf("@") + 1)).toLowerCase();
  if (domain.startsWith("down.")) {
    return Promise.reject(new ApiError(502, { status: 502, code: "REMOTE_SERVER_UNREACHABLE" }));
  }
  const missing = () => Promise.reject(new ApiError(404, { status: 404, code: "REMOTE_ACCOUNT_NOT_FOUND" }));
  if (!address) {
    if (q.replace(/^@/, "").startsWith("nobody@")) return missing();
    return mockLookupRemote(q).then((account) => ({ account, note: null }));
  }
  const trending = TRENDING.find((item) => item.uri === q);
  if (trending) return bringOver(trending).then((local) => ({ account: null, note: withQuotes(local) }));
  const [user, noteId] = address.pathname.split("/").filter(Boolean);
  const account = remoteAccounts.find((a) => a.domain === domain && `@${a.username}` === user);
  if (!account) return missing();
  if (!noteId) return Promise.resolve({ account: shown(account), note: null });
  const found = notes.find((n) => n.author.remoteId === account.id && String(n.id) === noteId);
  return found ? Promise.resolve({ account: null, note: withQuotes(found) }) : missing();
}

function trendingItem(
  uri: string,
  body: string,
  acct: string,
  displayName: string,
  minutesAgo: number,
  servers: string[],
  extra: Partial<TrendingNote> = {},
): TrendingNote {
  const [user, host] = acct.split("@");
  const known = remoteAccounts.find((a) => a.acct === acct);
  return {
    ...note({ id: 0, body, author: MINA }),
    id: null,
    createdAt: new Date(Date.UTC(2026, 9, 16, 12) - minutesAgo * 60_000).toISOString(),
    author: {
      id: known ? -known.id : null,
      username: acct,
      avatarUrl: null,
      displayName,
      remoteId: known?.id ?? null,
      url: `https://${host}/@${user}`,
    },
    likeCount: 120,
    likedByMe: null,
    repostCount: 40,
    repostedByMe: null,
    quoteCount: 0,
    mentions: [],
    contentWarning: null,
    sensitive: false,
    visibility: "public",
    poll: null,
    language: "ko",
    remote: { kind: "NOTE", title: null, url: `https://${host}/@${user}/${uri.split("/").pop()}`, community: null },
    uri,
    url: `https://${host}/@${user}/${uri.split("/").pop()}`,
    sourceHost: servers[0],
    servers,
    ...extra,
  };
}

const TRENDING: TrendingNote[] = [
  trendingItem(
    "https://mastodon.social/users/mina/statuses/9600",
    "Hello from the fediverse 👋 #kurl",
    "mina@mastodon.social",
    "Mina",
    30,
    ["mastodon.social", "mstdn.jp"],
    { replyCount: 3, language: "en" },
  ),
  trendingItem(
    "https://mstdn.jp/users/hana/statuses/1131",
    "今日は朝から雨。駅前の紫陽花がいちばんきれいな季節になった。",
    "hana@mstdn.jp",
    "はな",
    90,
    ["mstdn.jp"],
    {
      replyCount: 12,
      language: "ja",
      media: [
        {
          url: "https://picsum.photos/seed/kurl-hydrangea/1200/800",
          altText: "雨に濡れた紫陽花",
          contentType: "image/jpeg",
          width: 1200,
          height: 800,
        },
      ],
    },
  ),
  trendingItem(
    "https://qdon.space/users/dal/statuses/2201",
    "어제 본 영화 결말 이야기. 아직 안 본 분은 접어 두세요.",
    "dal@qdon.space",
    "달",
    150,
    ["qdon.space", "planet.moe", "mastodon.social"],
    { replyCount: 5, contentWarning: "영화 결말 있음", sensitive: true },
  ),
  trendingItem("https://planet.moe/users/jun/statuses/3301", "주말에 가장 오래 하는 일은?", "jun@planet.moe", "준", 200, ["planet.moe"], {
    replyCount: 8,
    poll: {
      expiresAt: "2026-10-30T00:00:00Z",
      expired: false,
      multiple: false,
      votesCount: 214,
      votersCount: 214,
      options: [
        { title: "책 읽기", votesCount: 88 },
        { title: "걷기", votesCount: 71 },
        { title: "잠", votesCount: 55 },
      ],
      voted: true,
      ownVotes: [],
    },
    remote: { kind: "QUESTION", title: null, url: "https://planet.moe/@jun/3301", community: null },
  }),
  trendingItem(
    "https://fedibird.com/users/sora/statuses/4401",
    "長く使える道具の選び方について書きました。",
    "sora@fedibird.com",
    "そら",
    250,
    ["fedibird.com"],
    {
      replyCount: 2,
      language: "ja",
      linkPreview: { url: "https://sora.example/tools", title: "長く使える道具", description: "十年使った鞄とペンの話", image: null },
    },
  ),
  trendingItem(
    "https://social.silicon.moe/users/lee/statuses/5501",
    "작은 서버를 오래 운영하며 배운 것 세 가지.",
    "lee@social.silicon.moe",
    "이",
    330,
    ["social.silicon.moe"],
    { replyCount: 1 },
  ),
  trendingItem(
    "https://mastodon.social/users/alice/statuses/6601",
    "Morning light over the harbour.",
    "alice@mastodon.social",
    "Alice",
    430,
    ["mastodon.social"],
    { language: "en" },
  ),
];

export function mockRemoteTrending(limit: number): Promise<RemoteTrendingBody> {
  return Promise.resolve({ items: TRENDING.slice(0, limit) });
}

const broughtOver = new Map<string, number>();

function bringOver(item: TrendingNote): Promise<Note> {
  const known = notes.find((n) => n.id === broughtOver.get(item.uri));
  if (known) return Promise.resolve(known);
  return mockLookupRemote(item.author.username).then((account) => {
    const local = note({
      id: nextId++,
      body: item.body,
      createdAt: item.createdAt,
      author: {
        id: -account.id,
        username: account.acct,
        avatarUrl: item.author.avatarUrl,
        displayName: item.author.displayName,
        remoteId: account.id,
        url: item.author.url,
      },
      media: item.media,
      replyCount: item.replyCount,
      likeCount: null,
      repostCount: null,
      linkPreview: item.linkPreview,
      contentWarning: item.contentWarning,
      sensitive: item.sensitive,
      visibility: "public",
      poll: item.poll,
      language: item.language,
      remote: item.remote,
    });
    notes = [local, ...notes];
    broughtOver.set(item.uri, local.id);
    return local;
  });
}

let lists: { id: number; title: string; members: string[] }[] = [];
let nextListId = 700;
const PEOPLE: Record<string, NoteAuthor> = { dohyun: ME, yuna: YUNA, haruka: HARUKA };

export function mockLists(): NoteListSummary[] {
  return lists.map((l) => ({ id: l.id, title: l.title, memberCount: l.members.length }));
}

export function mockCreateList(title: string): NoteListSummary {
  lists = [...lists, { id: nextListId++, title, members: [] }];
  return { id: nextListId - 1, title, memberCount: 0 };
}

export function mockRenameList(id: number, title: string): NoteListSummary {
  lists = lists.map((l) => (l.id === id ? { ...l, title } : l));
  const list = lists.find((l) => l.id === id)!;
  return { id, title, memberCount: list.members.length };
}

export function mockDeleteList(id: number): void {
  lists = lists.filter((l) => l.id !== id);
}

export function mockListMembers(id: number): NoteAuthor[] {
  return (lists.find((l) => l.id === id)?.members ?? []).map((name) => PEOPLE[name]).filter(Boolean);
}

export function mockSetListMember(id: number, username: string, on: boolean): void {
  lists = lists.map((l) =>
    l.id === id ? { ...l, members: [...(on ? [username] : []), ...l.members.filter((m) => m !== username)] } : l,
  );
}

export function mockListNotes(id: number, page: number): NoteFeed {
  const members = new Set(lists.find((l) => l.id === id)?.members ?? []);
  const items =
    page === 0 ? topLevel().filter((n) => members.has(n.author.username) && n.visibility !== "direct") : [];
  return { items: items.map(withQuotes), page, hasNext: false };
}

export function mockListMemberships(username: string): { listIds: number[] } {
  return { listIds: lists.filter((l) => l.members.includes(username)).map((l) => l.id) };
}

export function mockDirectNotes(page: number): NoteFeed {
  const items =
    page === 0
      ? notes.filter((n) => n.visibility === "direct" && (n.author.id === ME.id || n.mentions?.includes(ME.username)))
      : [];
  return { items: items.map(withQuotes), page, hasNext: false };
}

export function mockTaggedNotes(tag: string, page: number): NoteFeed {
  const needle = `#${tag.toLowerCase()}`;
  const items = page === 0 ? notes.filter((n) => n.body.toLowerCase().includes(needle)) : [];
  return { items: items.map(withQuotes), page, hasNext: false };
}

export function mockSearchNotes(query: string, page: number): NoteFeed {
  const needle = query.trim().toLowerCase();
  const items =
    page === 0 && needle
      ? notes.filter(
          (n) => (n.visibility ?? "public") === "public" && listedRemote(n) && n.body.toLowerCase().includes(needle),
        )
      : [];
  return { items: items.map(withQuotes), page, hasNext: false };
}

export function mockBookmarkedNotes(page: number): NoteFeed {
  const items = page === 0 ? bookmarks.map((id) => notes.find((n) => n.id === id)) : [];
  return {
    items: items.filter((n): n is Note => n !== undefined).map(withQuotes),
    page,
    hasNext: false,
  };
}

export function mockNoteQuotes(id: number, page: number): NoteFeed {
  const items = page === 0 ? notes.filter((n) => n.quotedNote?.id === id) : [];
  return { items: items.map(withQuotes), page, hasNext: false };
}

export function mockPostQuotes(postId: number, page: number): PostQuotes {
  const quoting = notes.filter((n) => n.quotedPost?.id === postId);
  return { items: page === 0 ? quoting.map(withQuotes) : [], page, hasNext: false, total: quoting.length };
}

export function mockConversationMute(id: number, on: boolean): { muted: boolean } {
  notes = notes.map((n) => (n.id === id ? { ...n, conversationMuted: on } : n));
  return { muted: on };
}

export function mockBookmark(id: number, on: boolean): { bookmarked: boolean } {
  bookmarks = [...(on ? [id] : []), ...bookmarks.filter((x) => x !== id)];
  return { bookmarked: on };
}

export function mockLike(id: number, on: boolean): { liked: boolean; likeCount: number } {
  notes = notes.map((n) =>
    n.id === id && n.likedByMe !== on
      ? { ...n, likedByMe: on, likeCount: Math.max((n.likeCount ?? 0) + (on ? 1 : -1), 0) }
      : n,
  );
  return { liked: on, likeCount: notes.find((n) => n.id === id)?.likeCount ?? 0 };
}

export function mockEveryoneNotes(page: number): NoteFeed {
  const shared = topLevel().filter((n) => (n.visibility ?? "public") === "public");
  return { items: page === 0 ? shared.map(withQuotes) : [], page, hasNext: false };
}

export function mockAuthorNotes(username: string, page: number): NoteFeed {
  const own = topLevel().filter(
    (n) => n.author.username === username && (n.visibility !== "direct" || n.author.id === ME.id),
  );
  const pinnedFirst = [
    ...pins.map((id) => own.find((n) => n.id === id)).filter((n): n is Note => n !== undefined),
    ...own.filter((n) => !pins.includes(n.id)),
  ].map((n) => ({ ...n, pinned: pins.includes(n.id) }));
  return { items: page === 0 ? pinnedFirst : [], page, hasNext: false };
}

export function mockPin(id: number, on: boolean): { pinned: boolean } {
  pins = [...(on ? [id] : []), ...pins.filter((x) => x !== id)];
  return { pinned: on };
}

export function mockAuthorReposts(username: string, page: number): NoteFeed {
  const ids = page === 0 ? (reposts.get(username) ?? []) : [];
  return {
    items: ids
      .map((id) => notes.find((n) => n.id === id))
      .filter((n): n is Note => n !== undefined)
      .map((n) => ({ ...n, repostedByMe: reposts.get(ME.username)?.includes(n.id) ?? false })),
    page,
    hasNext: false,
  };
}

// 부모가 지워졌거나 이 서버에 오지 않은 답글 — 프로필 답글 탭은 이런 답글도 남기고 replyingTo 를 비운다.
const ORPHAN_REPLY = note({
  id: 990,
  body: "그때 말한 책, 결국 끝까지 읽었어요.",
  author: ME,
  inReplyToId: 9990,
  createdAt: "2026-10-01T09:00:00Z",
});

export function mockAuthorReplies(username: string, page: number): ProfileRepliesFeed {
  if (page > 0) return { items: [], page, hasNext: false };
  const replies = [...notes, ...(username === ME.username ? [ORPHAN_REPLY] : [])]
    .filter((n) => n.author.username === username && n.inReplyToId !== null)
    .map((n) => ({ reply: n, parent: notes.find((p) => p.id === n.inReplyToId) ?? null }))
    .filter(({ parent }) => parent?.author.username !== username)
    .sort((a, b) => b.reply.createdAt.localeCompare(a.reply.createdAt));
  return {
    items: replies.map(({ reply, parent }) => ({
      note: reply,
      replyingTo: parent
        ? {
            id: parent.id,
            author: parent.author,
            excerpt: parent.contentWarning ? null : parent.body.slice(0, 80),
            contentWarning: parent.contentWarning ?? null,
          }
        : null,
    })),
    page,
    hasNext: false,
  };
}

export function mockAuthorMedia(username: string, page: number): ProfileMediaFeed {
  if (page > 0) return { items: [], page, hasNext: false };
  return {
    items: notes
      .filter((n) => n.author.username === username && n.media.length > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => ({
        noteId: n.id,
        createdAt: n.createdAt,
        media: n.media[0],
        mediaCount: n.media.length,
        sensitive: Boolean(n.sensitive || n.contentWarning),
        contentWarning: n.contentWarning ?? null,
      })),
    page,
    hasNext: false,
  };
}

export function mockRepost(id: number, on: boolean): { reposted: boolean; repostCount: number } {
  const mine = (reposts.get(ME.username) ?? []).filter((x) => x !== id);
  reposts.set(ME.username, on ? [id, ...mine] : mine);
  notes = notes.map((n) => (n.id === id ? { ...n, repostedByMe: on } : n));
  const target = notes.find((n) => n.id === id);
  return { reposted: on, repostCount: target?.repostCount ?? 0 };
}

const RIN_NOTE = note({
  id: 90,
  body: "불 끄고 나서야 써지는 문장이 있다.",
  author: { id: 16, username: "rin", avatarUrl: null },
  createdAt: "2026-10-04T23:00:00Z",
});

function rootOf(target: Note): Note {
  let current = target;
  while (current.inReplyToId !== null) {
    const parent = notes.find((n) => n.id === current.inReplyToId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function viewerCanReply(target: Note): boolean {
  const root = rootOf(target);
  const policy = root.replyPolicy ?? "everyone";
  if (policy === "everyone" || root.author.id === ME.id) return true;
  return root.mentions?.includes(ME.username) === true;
}

const forViewer = (n: Note): Note => ({ ...n, canReply: viewerCanReply(n) });

export function mockViewerThread(id: number): NoteThread {
  const thread = mockThread(id);
  if (!thread || MOCK_BLOCKS_VIEWER.has(thread.note.author.username)) {
    throw new ApiError(404, { status: 404, code: "NOTE_NOT_FOUND" });
  }
  return {
    ...thread,
    note: forViewer(thread.note),
    parent: thread.parent && forViewer(thread.parent),
    replies: thread.replies.map(forViewer),
    viewerCanModerate: rootOf(thread.note).author.id === ME.id,
  };
}

export function mockHiddenReplies(id: number): Note[] {
  return notes.filter((n) => n.inReplyToId === id && n.hidden === true).map(forViewer);
}

export function mockSetReplyHidden(id: number, hidden: boolean): { hidden: boolean } {
  const target = notes.find((n) => n.id === id);
  notes = notes.map((n) => {
    if (n.id === id) return { ...n, hidden };
    if (target && n.id === target.inReplyToId) return { ...n, replyCount: Math.max(0, n.replyCount + (hidden ? -1 : 1)) };
    return n;
  });
  return { hidden };
}

export function mockSetReplyPolicy(id: number, replyPolicy: NoteReplyPolicy): { replyPolicy: NoteReplyPolicy } {
  notes = notes.map((n) => (n.id === id || rootOf(n).id === id ? { ...n, replyPolicy } : n));
  return { replyPolicy };
}

export function mockThread(id: number): NoteThread | null {
  if (id === RIN_NOTE.id) return { note: RIN_NOTE, parent: null, replies: [], continuation: [], series: null };
  const main = notes.find((n) => n.id === id);
  if (!main) return null;
  const continuation = selfChain(main);
  const parts = new Set(continuation.map((n) => n.id));
  return {
    note: withQuotes(main),
    parent: main.inReplyToId === null ? null : (notes.find((n) => n.id === main.inReplyToId) ?? null),
    replies: notes.filter((n) => n.inReplyToId === id && !parts.has(n.id) && n.hidden !== true && listedRemote(n)),
    continuation,
    series: mockNoteSeries(id),
    hiddenReplyCount: notes.filter((n) => n.inReplyToId === id && n.hidden === true).length,
    viewerCanModerate: false,
  };
}

export function mockSeriesNoteSummary(id: number) {
  const found = notes.find((n) => n.id === id);
  if (!found) return null;
  return {
    summary: {
      id: found.id,
      body: found.body,
      contentWarning: found.contentWarning ?? null,
      excerpt: found.contentWarning ?? found.body.slice(0, 80),
      createdAt: found.createdAt,
    },
    authorId: found.author.id,
    visibility: found.visibility ?? "public",
  };
}

let nextScheduledId = 9700;
let scheduledNotes: ScheduledNote[] = [
  {
    id: 9699,
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    body: "그 답글에 덧붙이려던 생각",
    contentWarning: null,
    visibility: "PUBLIC",
    imageCount: 0,
    poll: false,
    inReplyToId: 3,
    quotedNoteId: null,
    quotedPostId: null,
    failure: "NOTE_NOT_FOUND",
  },
];

export function mockSchedule(draft: NoteDraft, scheduledAt: string): ScheduledNote {
  const scheduled: ScheduledNote = {
    id: nextScheduledId++,
    scheduledAt,
    body: draft.body.trim(),
    contentWarning: draft.contentWarning ?? null,
    visibility: draft.visibility ?? null,
    imageCount: draft.images.length,
    poll: Boolean(draft.poll),
    inReplyToId: draft.inReplyToId,
    quotedNoteId: draft.quotedNoteId,
    quotedPostId: draft.quotedPostId,
    failure: null,
  };
  scheduledNotes = [...scheduledNotes, scheduled];
  return scheduled;
}

export function mockScheduledNotes(): ScheduledNote[] {
  return [...scheduledNotes].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function mockReschedule(id: number, scheduledAt: string): ScheduledNote {
  scheduledNotes = scheduledNotes.map((n) => (n.id === id ? { ...n, scheduledAt, failure: null } : n));
  return scheduledNotes.find((n) => n.id === id)!;
}

export function mockCancelScheduled(id: number): Promise<void> {
  scheduledNotes = scheduledNotes.filter((n) => n.id !== id);
  return Promise.resolve();
}

export function mockCreateThread(drafts: NoteDraft[]): Note[] {
  const created: Note[] = [];
  for (const draft of drafts) {
    const previous = created[created.length - 1];
    created.push(
      mockCreate(previous ? { ...draft, inReplyToId: previous.id, visibility: previous.visibility } : draft),
    );
  }
  return created;
}

export function mockCreate(draft: NoteDraft): Note {
  const parent = draft.inReplyToId === null ? null : notes.find((n) => n.id === draft.inReplyToId);
  if (parent && !viewerCanReply(parent)) {
    throw new ApiError(403, { status: 403, code: "NOTE_REPLY_RESTRICTED" });
  }
  const created = note({
    id: nextId++,
    body: draft.body.trim(),
    author: ME,
    likeCount: 0,
    createdAt: new Date().toISOString(),
    inReplyToId: draft.inReplyToId,
    quotedNote: quotedNoteOf(draft.quotedNoteId),
    quotedPost: quotedPostOf(draft.quotedPostId),
    contentWarning: draft.contentWarning ?? null,
    sensitive: Boolean(draft.sensitive || draft.contentWarning),
    visibility: draft.visibility ?? "public",
    replyPolicy: parent ? (rootOf(parent).replyPolicy ?? "everyone") : (draft.replyPolicy ?? "everyone"),
    poll: draft.poll
      ? {
          expiresAt: new Date(Date.now() + draft.poll.expiresIn * 1000).toISOString(),
          expired: false,
          multiple: draft.poll.multiple,
          votesCount: 0,
          votersCount: 0,
          options: draft.poll.options.map((title) => ({ title, votesCount: 0 })),
          voted: true,
          ownVotes: [],
        }
      : null,
    media: draft.images.map((image) => ({
      url: "https://picsum.photos/seed/kurl-upload/800/600",
      altText: image.altText || null,
      contentType: "image/jpeg",
      width: image.width ?? null,
      height: image.height ?? null,
    })),
  });
  notes = [created, ...notes];
  if (draft.inReplyToId !== null) {
    notes = notes.map((n) => (n.id === draft.inReplyToId ? { ...n, replyCount: n.replyCount + 1 } : n));
  }
  return created;
}

export function mockVote(id: number, choices: number[]): NotePoll {
  const target = notes.find((n) => n.id === id);
  if (!target?.poll) throw new Error("no poll");
  if (target.author.remoteId) throw new ApiError(400, { status: 400, code: "NOTE_POLL_ELSEWHERE" });
  if (target.poll.voted) return target.poll;
  const poll: NotePoll = {
    ...target.poll,
    votesCount: target.poll.votesCount + choices.length,
    votersCount: target.poll.votersCount + 1,
    options: target.poll.options.map((option, index) =>
      choices.includes(index) ? { ...option, votesCount: option.votesCount + 1 } : option,
    ),
    voted: true,
    ownVotes: choices,
  };
  notes = notes.map((n) => (n.id === id ? { ...n, poll } : n));
  return poll;
}

function quotedPostOf(id: number | null): Note["quotedPost"] {
  const post = id === null ? undefined : MOCK_ALL_ITEMS.find((p) => p.id === id);
  return post ? { id: post.id, title: post.title, slug: post.slug, authorUsername: post.author.username } : null;
}

function quotedNoteOf(id: number | null): Note["quotedNote"] {
  const quoted = id === null ? undefined : notes.find((n) => n.id === id);
  if (!quoted) return null;
  return {
    id: quoted.id,
    body: quoted.body,
    createdAt: quoted.createdAt,
    author: quoted.author,
    media: quoted.media,
    contentWarning: quoted.contentWarning ?? null,
    sensitive: quoted.sensitive ?? false,
  };
}

export function mockHistory(id: number): NoteHistory {
  const current = notes.find((n) => n.id === id);
  if (!current) throw new Error("not found");
  return {
    noteId: id,
    versions: [
      {
        body: current.body,
        contentWarning: current.contentWarning ?? null,
        sensitive: current.sensitive ?? false,
        at: current.editedAt ?? current.createdAt,
      },
      ...(earlierVersions.get(id) ?? []),
    ],
  };
}

export function mockEdit(id: number, edit: NoteEdit): Note {
  const before = notes.find((n) => n.id === id)!;
  const contentWarning = edit.contentWarning.trim() || null;
  const sensitive = edit.sensitive || contentWarning != null;
  const unchanged =
    before.body === edit.body &&
    (before.contentWarning ?? null) === contentWarning &&
    (before.sensitive ?? false) === sensitive;
  if (unchanged) return before;
  earlierVersions.set(id, [
    { body: before.body, contentWarning: before.contentWarning ?? null, sensitive: before.sensitive ?? false, at: before.editedAt ?? before.createdAt },
    ...(earlierVersions.get(id) ?? []),
  ]);
  notes = notes.map((n) =>
    n.id === id ? { ...n, body: edit.body, contentWarning, sensitive, editedAt: new Date().toISOString() } : n,
  );
  return notes.find((n) => n.id === id)!;
}

export function mockDelete(id: number): void {
  notes = notes.filter((n) => n.id !== id);
}

export function mockFederationSettings(): FederationSettings {
  return settings;
}

export function mockUpdateFederationSettings(patch: {
  enabled?: boolean;
  noticeSeen?: boolean;
}): FederationSettings {
  settings = {
    ...settings,
    enabled: patch.enabled ?? settings.enabled,
    noticeSeen: settings.noticeSeen || patch.noticeSeen === true,
  };
  return settings;
}
