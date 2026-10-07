import type { FederationSettings, Note, NoteDraft, NoteFeed, NoteHistory, NoteThread } from "./notes";

const ME = { id: 1, username: "dohyun", avatarUrl: "https://i.pravatar.cc/120?img=12" };
const YUNA = { id: 15, username: "yuna", avatarUrl: "https://i.pravatar.cc/120?img=20" };

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
        { url: "https://picsum.photos/seed/kurl-walk-1/600/800", altText: "골목 끝에 선 가로등", contentType: "image/jpeg" },
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
    id: 5,
    body: "산책하다 찍은 것들. 길이 다 다르게 생겼다. #산책",
    author: YUNA,
    createdAt: "2026-10-05T10:30:00Z",
    media: [
      { url: "https://picsum.photos/seed/kurl-walk-1/600/800", altText: "골목 끝에 선 가로등", contentType: "image/jpeg" },
      { url: "https://picsum.photos/seed/kurl-walk-2/900/600", altText: null, contentType: "image/jpeg" },
      { url: "https://picsum.photos/seed/kurl-walk-3/700/700", altText: "강가의 낮은 다리", contentType: "image/jpeg" },
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
    media: [{ url: "https://picsum.photos/seed/kurl-note/800/600", altText: "비 오는 창밖", contentType: "image/jpeg" }],
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
    id: 8,
    body: "수술 끝나고 꿰맨 자리. 잘 아물고 있다.",
    author: YUNA,
    createdAt: "2026-10-04T08:00:00Z",
    sensitive: true,
    media: [{ url: "https://picsum.photos/seed/kurl-note-d/800/600", altText: "꿰맨 자리", contentType: "image/jpeg" }],
  }),
];
let nextId = 100;
const reposts = new Map<string, number[]>([[ME.username, [3]], [YUNA.username, [6]]]);
let settings: FederationSettings = { enabled: true, noticeSeen: false, handle: "@dohyun@kurl.me" };

const topLevel = () => notes.filter((n) => n.inReplyToId === null);
let bookmarks: number[] = [];
let showReposts = true;
let pins: number[] = [];
const earlierVersions = new Map<number, NoteHistory["versions"]>();
const repostsHidden = new Set<string>();

const withQuotes = (n: Note): Note => ({
  ...n,
  quoteCount: notes.filter((q) => q.quotedNote?.id === n.id).length,
  bookmarkedByMe: bookmarks.includes(n.id),
});

export function mockTrendingNotes(page: number): NoteFeed {
  const ranked = [...topLevel()].sort(
    (a, b) => (b.likeCount ?? 0) + b.replyCount - ((a.likeCount ?? 0) + a.replyCount),
  );
  return { items: page === 0 ? ranked.map(withQuotes) : [], page, hasNext: false };
}

export function mockFeedPreferences(): { showReposts: boolean } {
  return { showReposts };
}

export function mockSetShowReposts(on: boolean): { showReposts: boolean } {
  showReposts = on;
  return { showReposts };
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
  const items = [...reposted, ...yunas, ...mine].filter((n) => !seen.has(n.id) && seen.add(n.id));
  return { items, page, hasNext: false };
}

export function mockTaggedNotes(tag: string, page: number): NoteFeed {
  const needle = `#${tag.toLowerCase()}`;
  const items = page === 0 ? notes.filter((n) => n.body.toLowerCase().includes(needle)) : [];
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
  return { items: page === 0 ? topLevel().map(withQuotes) : [], page, hasNext: false };
}

export function mockAuthorNotes(username: string, page: number): NoteFeed {
  const own = topLevel().filter((n) => n.author.username === username);
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
    media: draft.images.map((image) => ({
      url: "https://picsum.photos/seed/kurl-upload/800/600",
      altText: image.altText || null,
      contentType: "image/jpeg",
    })),
  });
  notes = [created, ...notes];
  if (draft.inReplyToId !== null) {
    notes = notes.map((n) => (n.id === draft.inReplyToId ? { ...n, replyCount: n.replyCount + 1 } : n));
  }
  return created;
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
