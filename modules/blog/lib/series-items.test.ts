import { describe, expect, it } from "vitest";
import type { FollowingSeriesNote } from "@/modules/blog/api/follows";
import type { PostView } from "@/modules/blog/api/posts";
import type {
  PublicFeedItem,
  PublicPostListItem,
  PublicPostSeriesNav,
  SeriesNoteSummary,
} from "@/modules/blog/api/public-posts";
import {
  entryRefs,
  moveEntry,
  noteHeadline,
  noteSeriesNav,
  ownerSeriesEntries,
  placeSeriesNotes,
  postSeriesNav,
  seriesCardItems,
  seriesEntries,
  seriesEpisodes,
  seriesItemCount,
  seriesItemHref,
  seriesItemKey,
  seriesItemRefs,
  seriesSlugFromTitle,
} from "./series-items";

const author = { id: 1, username: "dohyun", bio: null, avatarUrl: null };

function post(slug: string, publishedAt: string): PublicFeedItem {
  return {
    id: slug.length,
    author,
    slug,
    title: slug,
    excerpt: null,
    ogImageUrl: null,
    languageTag: "ko",
    tags: [],
    publishedAt,
    viewCount: 0,
    likeCount: 0,
  };
}

function seriesNote(id: number, createdAt: string): FollowingSeriesNote {
  return {
    id,
    author,
    body: `note ${id}`,
    contentWarning: null,
    excerpt: null,
    createdAt,
    series: { id: 9, slug: "s", title: "S" },
  };
}

const order = (rows: ReturnType<typeof placeSeriesNotes>) =>
  rows.map((row) => (row.kind === "post" ? row.item.slug : `note-${row.note.id}`));

describe("placeSeriesNotes", () => {
  it("puts a note right before the first post published earlier than it", () => {
    const rows = placeSeriesNotes(
      [post("a", "2026-05-30T09:00:00Z"), post("b", "2026-05-25T09:00:00Z"), post("c", "2026-05-20T09:00:00Z")],
      [seriesNote(1, "2026-05-26T12:00:00Z")],
    );
    expect(order(rows)).toEqual(["a", "note-1", "b", "c"]);
  });

  it("leads with notes newer than every post and closes with notes older than every post", () => {
    const rows = placeSeriesNotes(
      [post("a", "2026-05-30T09:00:00Z"), post("b", "2026-05-25T09:00:00Z")],
      [seriesNote(1, "2026-05-01T00:00:00Z"), seriesNote(2, "2026-06-01T00:00:00Z")],
    );
    expect(order(rows)).toEqual(["note-2", "a", "b", "note-1"]);
  });

  it("orders several notes newest first whatever order they arrive in", () => {
    const rows = placeSeriesNotes(
      [post("a", "2026-05-30T09:00:00Z"), post("b", "2026-05-20T09:00:00Z")],
      [seriesNote(1, "2026-05-21T00:00:00Z"), seriesNote(2, "2026-05-29T00:00:00Z"), seriesNote(3, "2026-05-25T00:00:00Z")],
    );
    expect(order(rows)).toEqual(["a", "note-2", "note-3", "note-1", "b"]);
  });

  it("keeps a post published at the same instant ahead of the note", () => {
    const rows = placeSeriesNotes([post("a", "2026-05-25T09:00:00Z")], [seriesNote(1, "2026-05-25T09:00:00Z")]);
    expect(order(rows)).toEqual(["a", "note-1"]);
  });

  it("renders a page of notes alone", () => {
    const rows = placeSeriesNotes([], [seriesNote(1, "2026-05-17T00:00:00Z"), seriesNote(2, "2026-05-18T00:00:00Z")]);
    expect(order(rows)).toEqual(["note-2", "note-1"]);
  });

  it("matches the per-page rule once pages are appended, including a page of notes only", () => {
    const pages = [
      { posts: [post("a", "2026-05-30T00:00:00Z"), post("b", "2026-05-24T00:00:00Z")], notes: [seriesNote(1, "2026-05-22T00:00:00Z")] },
      { posts: [], notes: [seriesNote(2, "2026-05-18T00:00:00Z"), seriesNote(3, "2026-05-17T00:00:00Z")] },
      { posts: [post("c", "2026-05-12T00:00:00Z")], notes: [] },
    ];
    const perPage = pages.flatMap((p) => order(placeSeriesNotes(p.posts, p.notes)));
    const appended = order(
      placeSeriesNotes(
        pages.flatMap((p) => p.posts),
        pages.flatMap((p) => p.notes),
      ),
    );
    expect(appended).toEqual(["a", "b", "note-1", "note-2", "note-3", "c"]);
    expect(appended).toEqual(perPage);
  });
});

const nav: PublicPostSeriesNav = {
  slug: "refactoring-diary",
  title: "리팩터링 일지",
  position: 1,
  total: 2,
  prev: null,
  next: { slug: "first-commit-retro", title: "첫 커밋 회고" },
};

describe("postSeriesNav", () => {
  it("walks posts and notes when the item fields are present", () => {
    const view = postSeriesNav({
      ...nav,
      itemPosition: 1,
      itemTotal: 3,
      prevItem: null,
      nextItem: { type: "NOTE", slug: null, noteId: 40, title: "이름 하나" },
    });
    expect(view).toMatchObject({ position: 1, total: 3, prev: null });
    expect(view.next).toEqual({ type: "NOTE", slug: null, noteId: 40, title: "이름 하나" });
  });

  it("falls back to the published-post walk when the item fields are absent", () => {
    const view = postSeriesNav(nav);
    expect(view).toMatchObject({ position: 1, total: 2, prev: null });
    expect(view.next).toEqual({ type: "POST", slug: "first-commit-retro", noteId: null, title: "첫 커밋 회고" });
  });

  it("takes each new key on its own and drops links it cannot follow", () => {
    const view = postSeriesNav({
      ...nav,
      position: 2,
      prev: { slug: "a", title: "A" },
      itemTotal: 5,
      nextItem: { type: "NOTE", slug: null, noteId: null, title: "?" },
    });
    expect(view.position).toBe(2);
    expect(view.total).toBe(5);
    expect(view.prev).toEqual({ type: "POST", slug: "a", noteId: null, title: "A" });
    expect(view.next).toBeNull();
  });

  it("cleans a note thread's nav the same way", () => {
    const view = noteSeriesNav({
      slug: "s",
      title: "S",
      position: 2,
      total: 3,
      prev: { type: "POST", slug: null, noteId: null, title: "?" },
      next: { type: "POST", slug: "b", noteId: null, title: "B" },
    });
    expect(view.prev).toBeNull();
    expect(view.next?.slug).toBe("b");
  });
});

function listItem(slug: string): PublicPostListItem {
  return {
    id: slug.length,
    slug,
    title: slug.toUpperCase(),
    excerpt: null,
    ogImageUrl: null,
    languageTag: "ko",
    tags: [],
    likeCount: 0,
    publishedAt: "2026-05-01T00:00:00Z",
    lastEditedAt: null,
    pinned: false,
  };
}

const note40: SeriesNoteSummary = {
  id: 40,
  body: "본문",
  contentWarning: null,
  excerpt: "본문 요약",
  createdAt: "2026-05-25T15:00:00Z",
};

describe("seriesEntries", () => {
  it("reads items in series order, notes included", () => {
    const entries = seriesEntries({
      posts: [listItem("a"), listItem("b")],
      items: [
        { type: "POST", post: listItem("a"), note: null },
        { type: "NOTE", post: null, note: note40 },
        { type: "POST", post: listItem("b"), note: null },
      ],
    });
    expect(entries.map((e) => e.type)).toEqual(["POST", "NOTE", "POST"]);
  });

  it("falls back to posts when items are absent", () => {
    expect(seriesEntries({ posts: [listItem("a")] }).map((e) => e.type)).toEqual(["POST"]);
  });

  it("keeps a series of notes alone non-empty and skips malformed rows", () => {
    const entries = seriesEntries({
      posts: [],
      items: [
        { type: "NOTE", post: null, note: note40 },
        { type: "POST", post: null, note: null },
      ],
    });
    expect(entries).toHaveLength(1);
  });

  it("numbers episodes across posts and notes with their own pages", () => {
    const episodes = seriesEpisodes(
      seriesEntries({
        posts: [listItem("a")],
        items: [
          { type: "POST", post: listItem("a"), note: null },
          { type: "NOTE", post: null, note: note40 },
        ],
      }),
      "dohyun",
      "ko",
    );
    expect(episodes).toEqual([
      { key: "a", type: "POST", title: "A", href: "/ko/p/dohyun/a" },
      { key: "notes/40", type: "NOTE", title: "본문 요약", href: "/ko/p/dohyun/notes/40" },
    ]);
  });
});

describe("counts, headlines and links", () => {
  it("counts items when the server sends them, posts otherwise", () => {
    expect(seriesItemCount({ postCount: 2, itemCount: 3 })).toBe(3);
    expect(seriesItemCount({ postCount: 0, itemCount: 2 })).toBe(2);
    expect(seriesItemCount({ postCount: 4 })).toBe(4);
  });

  it("never shows a warned note's body", () => {
    expect(noteHeadline({ body: "결말", contentWarning: "스포일러", excerpt: "결말" })).toBe("스포일러");
    expect(noteHeadline({ body: "본문", contentWarning: null, excerpt: "요약" })).toBe("요약");
    expect(noteHeadline({ body: " 본문 ", contentWarning: null, excerpt: null })).toBe("본문");
  });

  it("links a note to its page and a post to its slug", () => {
    expect(seriesItemHref("dohyun", { type: "NOTE", slug: null, noteId: 40 }, "ko")).toBe("/ko/p/dohyun/notes/40");
    expect(seriesItemHref("dohyun", { type: "POST", slug: "a", noteId: null }, "en")).toBe("/en/p/dohyun/a");
    expect(seriesItemKey({ type: "NOTE", slug: null, noteId: 40 })).toBe("notes/40");
  });

  it("previews card items, or the old post list as posts", () => {
    expect(
      seriesCardItems({ posts: [{ slug: "a", title: "A" }] }),
    ).toEqual([{ type: "POST", slug: "a", noteId: null, title: "A", ogImageUrl: null }]);
    expect(
      seriesCardItems({
        posts: [],
        items: [
          { type: "NOTE", slug: null, noteId: 40, title: "노트", ogImageUrl: null },
          { type: "NOTE", slug: null, noteId: null, title: "?", ogImageUrl: null },
        ],
      }).map((i) => i.noteId),
    ).toEqual([40]);
  });
});

function postView(id: number): PostView {
  return {
    id,
    slug: `p${id}`,
    title: `P${id}`,
    status: "PUBLISHED",
    languageTag: "ko",
    publishedAt: null,
    scheduledAt: null,
    excerpt: null,
    ogImageUrl: null,
    viewCount: 0,
    likeCount: 0,
    tags: [],
    seriesId: 1,
    seriesOrder: 0,
    pinOrder: null,
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-05-01T00:00:00Z",
  };
}

describe("owner items", () => {
  it("builds the PUT /items body from the owner detail, falling back to posts", () => {
    expect(
      seriesItemRefs({
        posts: [postView(7)],
        items: [
          { type: "NOTE", post: null, note: note40 },
          { type: "POST", post: postView(7), note: null },
        ],
      }),
    ).toEqual([
      { type: "NOTE", id: 40 },
      { type: "POST", id: 7 },
    ]);
    expect(seriesItemRefs({ posts: [postView(7)] })).toEqual([{ type: "POST", id: 7 }]);
  });

  it("moves an entry and leaves the list alone for an impossible move", () => {
    const entries = ownerSeriesEntries({
      posts: [postView(7), postView(8)],
      items: [
        { type: "POST", post: postView(7), note: null },
        { type: "NOTE", post: null, note: note40 },
        { type: "POST", post: postView(8), note: null },
      ],
    });
    expect(entryRefs(moveEntry(entries, 2, 0))).toEqual([
      { type: "POST", id: 8 },
      { type: "POST", id: 7 },
      { type: "NOTE", id: 40 },
    ]);
    expect(moveEntry(entries, 0, 3)).toBe(entries);
  });
});

describe("seriesSlugFromTitle", () => {
  it("keeps latin titles readable and gives other scripts a random address", () => {
    expect(seriesSlugFromTitle("Spring In Depth!")).toBe("spring-in-depth");
    expect(seriesSlugFromTitle("짧은 생각들")).toMatch(/^series-[a-z0-9]+$/);
  });
});
