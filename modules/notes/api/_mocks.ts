import type { FederationSettings, Note, NoteDraft, NoteFeed, NoteThread } from "./notes";

const ME = { id: 1, username: "dohyun", avatarUrl: "https://i.pravatar.cc/120?img=12" };
const YUNA = { id: 15, username: "yuna", avatarUrl: "https://i.pravatar.cc/120?img=20" };

function note(partial: Partial<Note> & Pick<Note, "id" | "body" | "author">): Note {
  return {
    createdAt: "2026-10-05T09:00:00Z",
    editedAt: null,
    likeCount: partial.author.id === ME.id ? 0 : null,
    likedByMe: false,
    media: [],
    quotedPost: null,
    inReplyToId: null,
    replyCount: 0,
    ...partial,
  };
}

let notes: Note[] = [
  note({
    id: 3,
    body: "오늘 쓴 글의 씨앗: 단축 링크가 사라지면 글도 같이 끊긴다 https://kurl.me/about",
    author: YUNA,
    createdAt: "2026-10-05T11:00:00Z",
    replyCount: 1,
  }),
  note({
    id: 5,
    body: "산책하다 찍은 것들. 길이 다 다르게 생겼다.",
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
  note({ id: 4, body: "좋은 생각이에요", author: ME, inReplyToId: 3, likeCount: 0, createdAt: "2026-10-05T12:00:00Z" }),
];
let nextId = 100;
let settings: FederationSettings = { enabled: true, noticeSeen: false, handle: "@dohyun@kurl.me" };

const topLevel = () => notes.filter((n) => n.inReplyToId === null);

export function mockEveryoneNotes(page: number): NoteFeed {
  return { items: page === 0 ? topLevel() : [], page, hasNext: false };
}

export function mockAuthorNotes(username: string, page: number): NoteFeed {
  return {
    items: page === 0 ? topLevel().filter((n) => n.author.username === username) : [],
    page,
    hasNext: false,
  };
}

export function mockThread(id: number): NoteThread | null {
  const main = notes.find((n) => n.id === id);
  if (!main) return null;
  return {
    note: main,
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

export function mockEdit(id: number, body: string): Note {
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
