import { ApiError } from "@/lib/api/client";
import type { PublicFeedItem, PublicFeedView } from "@/modules/blog/api/public-posts";
import type {
  FederationSettings,
  Note,
  NoteAuthor,
  NoteDraft,
  NoteFeed,
  NoteHistory,
  MuteStatus,
  NoteFilter,
  NoteFilterDraft,
  NoteListSummary,
  NotePoll,
  NoteThread,
  RemoteAccount,
  ScheduledNote,
  TrendingNoteLink,
  TrendingNoteTag,
} from "./notes";

const ME = { id: 1, username: "dohyun", avatarUrl: "https://i.pravatar.cc/120?img=12" };
const YUNA = { id: 15, username: "yuna", avatarUrl: "https://i.pravatar.cc/120?img=20" };
const HARUKA = { id: 21, username: "haruka", avatarUrl: "https://i.pravatar.cc/120?img=32", displayName: "하루카" };
const MINA = {
  id: -9800,
  username: "mina@mastodon.social",
  avatarUrl: null,
  displayName: "Mina",
  remoteId: 9800,
  url: "https://mastodon.social/@mina",
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
];
let nextId = 100;
const reposts = new Map<string, number[]>([[ME.username, [3]], [YUNA.username, [6]]]);
let settings: FederationSettings = { enabled: true, noticeSeen: false, handle: "@dohyun@kurl.me" };

const muted = new Map<string, MuteStatus>();
const topLevel = () =>
  notes.filter((n) => n.inReplyToId === null && !n.author.remoteId && !muted.has(n.author.username));
const remoteTopLevel = (remoteId: number) =>
  notes.filter((n) => n.inReplyToId === null && n.author.remoteId === remoteId);

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
let bookmarks: number[] = [];
let showReposts = true;
let pins: number[] = [];
const earlierVersions = new Map<number, NoteHistory["versions"]>();
const repostsHidden = new Set<string>();

const QUOTING_POSTS: Record<number, PublicFeedItem[]> = {
  5: [
    {
      id: 801,
      author: { id: 31, username: "kazuki", bio: null, avatarUrl: null },
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

const withQuotes = (n: Note): Note => ({
  ...n,
  quoteCount: notes.filter((q) => q.quotedNote?.id === n.id).length + (QUOTING_POSTS[n.id]?.length ?? 0),
  bookmarkedByMe: bookmarks.includes(n.id),
});

export function mockQuotingPosts(id: number, page: number): PublicFeedView {
  return { items: page === 0 ? (QUOTING_POSTS[id] ?? []) : [], page, size: 20, hasNext: false };
}

export function mockFederatedNotes(page: number): NoteFeed {
  const received = notes.filter(
    (n) => n.inReplyToId === null && n.author.remoteId && (n.visibility ?? "public") === "public",
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
];
let nextRemoteId = 9900;
let domainBlocks: { domain: string; createdAt: string }[] = [];

const shown = (a: RemoteAccount): RemoteAccount => ({
  ...a,
  domainBlocked: domainBlocks.some((b) => b.domain === a.domain),
});

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
      ? notes.filter((n) => (n.visibility ?? "public") === "public" && n.body.toLowerCase().includes(needle))
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

export function mockRepost(id: number, on: boolean): { reposted: boolean; repostCount: number } {
  const mine = (reposts.get(ME.username) ?? []).filter((x) => x !== id);
  reposts.set(ME.username, on ? [id, ...mine] : mine);
  notes = notes.map((n) => (n.id === id ? { ...n, repostedByMe: on } : n));
  const target = notes.find((n) => n.id === id);
  return { reposted: on, repostCount: target?.repostCount ?? 0 };
}

export function mockThread(id: number): NoteThread | null {
  const main = notes.find((n) => n.id === id);
  if (!main) return null;
  return {
    note: withQuotes(main),
    parent: main.inReplyToId === null ? null : (notes.find((n) => n.id === main.inReplyToId) ?? null),
    replies: notes.filter((n) => n.inReplyToId === id),
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

export function mockCreate(draft: NoteDraft): Note {
  const created = note({
    id: nextId++,
    body: draft.body.trim(),
    author: ME,
    likeCount: 0,
    createdAt: new Date().toISOString(),
    inReplyToId: draft.inReplyToId,
    quotedNote: quotedNoteOf(draft.quotedNoteId),
    contentWarning: draft.contentWarning ?? null,
    sensitive: Boolean(draft.sensitive || draft.contentWarning),
    visibility: draft.visibility ?? "public",
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

export function mockEdit(id: number, body: string): Note {
  const before = notes.find((n) => n.id === id);
  if (before && before.body !== body) {
    earlierVersions.set(id, [
      { body: before.body, contentWarning: before.contentWarning ?? null, sensitive: before.sensitive ?? false, at: before.editedAt ?? before.createdAt },
      ...(earlierVersions.get(id) ?? []),
    ]);
  }
  notes = notes.map((n) => (n.id === id ? { ...n, body, editedAt: new Date().toISOString() } : n));
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
