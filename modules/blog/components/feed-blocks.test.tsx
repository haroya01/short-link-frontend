import React, { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionEvent } from "@/modules/blog/api/collections";
import type { FollowingSeriesNote } from "@/modules/blog/api/follows";
import type { PublicSeriesCard } from "@/modules/blog/api/public-posts";
import { ConnectionFeedInsert } from "./connection-feed-insert";
import { SeriesNoteFeedCard } from "./series-note-feed-card";
import { SeriesRow } from "./series-row";

vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key;
  t.rich = (key: string, values: Record<string, unknown>) => {
    const tag = (name: string, text: unknown) => (values[name] as (c: ReactNode) => ReactNode)(String(text));
    return createElement(
      "span",
      { "data-key": key },
      tag("curator", values.curatorName),
      "→",
      tag("collection", values.collectionName),
    );
  };
  return { useTranslations: () => t };
});
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...rest }: any) => createElement("a", { href, ...rest }, children),
}));

const curator = { id: 9, username: "jinhwa", bio: null, avatarUrl: "https://example.com/jinhwa.png" };
const highlight: ConnectionEvent = {
  id: 501,
  curator,
  collectionId: 11,
  collectionTitle: "느린 사고",
  collectionKind: "PATH",
  why: "일주일을 곱씹게 한 문단.",
  connectedAt: "2026-10-10T08:30:00Z",
  blockType: "HIGHLIGHT",
  title: "기다림의 기술",
  excerpt: null,
  slug: "the-art-of-waiting",
  username: "minji",
  quote: "판단을 유보한다는 건 정보를 더 기다린다는 뜻이다.",
  body: null,
};

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement("ul", null, node)));
}

const row = () => host.querySelector<HTMLLIElement>("li[data-feed-row]")!;
const topLine = () => row().firstElementChild as HTMLElement;

describe("connection event row", () => {
  it("opens with the context line, then reads as a normal row with no card or section head", async () => {
    await render(createElement(ConnectionFeedInsert, { event: highlight, locale: "ko" }));
    expect(row().className).toContain("border-b");
    expect(row().className).not.toMatch(/rounded|bg-white|shadow/);
    expect(host.querySelector("h2")!.textContent).toBe("기다림의 기술");
    expect(host.textContent).not.toContain("connectingNow");

    expect(topLine().querySelector('[data-key="connectionMeta"]')).not.toBeNull();
    expect(topLine().querySelector('a[href*="/collections/11"]')!.textContent).toBe("느린 사고");
    expect(topLine().querySelector("time")!.textContent).toBe("30분");
    expect(topLine().compareDocumentPosition(host.querySelector("h2")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("carries the painted passage as the lede and deep-links to that sentence", async () => {
    await render(createElement(ConnectionFeedInsert, { event: highlight, locale: "ko" }));
    const link = host.querySelector("h2")!.closest("a")!;
    expect(link.getAttribute("href")).toContain("/p/minji/the-art-of-waiting?hl=");
    expect(link.querySelector("p")!.textContent).toBe(`“${highlight.quote}”`);
    expect(host.textContent).not.toContain(highlight.why);
  });

  it("keeps the text column full width because the payload has no cover", async () => {
    await render(createElement(ConnectionFeedInsert, { event: highlight, locale: "ko" }));
    expect(row().querySelector("[data-row-thumb]")).toBeNull();
    expect(row().className).toMatch(/\bgrid-cols-1\b/);
    expect(row().className).not.toMatch(/gap-x/);
  });

  it("prefers the curator's why over the post excerpt for a post", async () => {
    await render(
      createElement(ConnectionFeedInsert, {
        event: { ...highlight, blockType: "POST", quote: null, excerpt: "작가의 발췌" },
        locale: "ko",
      }),
    );
    expect(host.querySelector("h2")!.closest("a")!.getAttribute("href")).toBe("/ko/p/minji/the-art-of-waiting");
    expect(host.querySelector("p")!.textContent).toBe(highlight.why);
  });

  it("shows a curator's note as body text that opens the collection", async () => {
    await render(
      createElement(ConnectionFeedInsert, {
        event: { ...highlight, blockType: "NOTE", title: null, slug: null, username: null, quote: null, body: "놓아줄 수 있는 상태" },
        locale: "ko",
      }),
    );
    expect(host.querySelector("h2")).toBeNull();
    const body = host.querySelector("p")!;
    expect(body.textContent).toBe("놓아줄 수 있는 상태");
    expect(body.className).toContain("line-clamp-3");
    expect(body.closest("a")!.getAttribute("href")).toContain("/collections/11");
    expect(row().lastElementChild!.textContent).toContain("jinhwa");
  });
});

describe("series row", () => {
  const series: PublicSeriesCard = {
    id: 3,
    author: { id: 1, username: "dohyun", bio: null, avatarUrl: null },
    slug: "refactoring-log",
    title: "리팩터링 일지",
    postCount: 2,
    itemCount: 3,
    lastPublishedAt: "2026-10-09T09:00:00Z",
    posts: [],
    items: [
      { type: "POST", slug: "first", noteId: null, title: "첫 편", ogImageUrl: null },
      { type: "NOTE", slug: null, noteId: 40, title: "중간 노트", ogImageUrl: null },
      { type: "POST", slug: "third", noteId: null, title: "셋째 편", ogImageUrl: "https://example.com/c3.png" },
    ],
  };

  it("is one row: 시리즈 · N편, the series name, earlier titles, and the first cover", async () => {
    await render(createElement(SeriesRow, { series, locale: "ko" }));
    expect(topLine().textContent).toBe("seriesEyebrow·seriesEpisodeCount(3)");
    expect(host.querySelector("h2")!.textContent).toBe("리팩터링 일지");
    expect(host.querySelector("p")!.textContent).toBe("첫 편 · 중간 노트 · 셋째 편");
    expect(row().querySelector("[data-row-thumb] img")!.getAttribute("src")).toBe("https://example.com/c3.png");
    expect(host.querySelector("h2")!.closest("a")!.getAttribute("href")).toBe("/ko/p/dohyun/series/refactoring-log");
    expect(host.querySelector("button")).toBeNull();
  });
});

describe("subscribed-series note row", () => {
  const note: FollowingSeriesNote = {
    id: 40,
    author: { id: 1, username: "dohyun", bio: null, avatarUrl: null },
    body: "첫 줄\n둘째 줄\n셋째 줄\n넷째 줄",
    contentWarning: null,
    excerpt: null,
    createdAt: "2026-10-10T07:00:00Z",
    series: { id: 3, slug: "refactoring-log", title: "리팩터링 일지" },
  };

  it("reads 시리즈명 · 노트 over a three-line body", async () => {
    await render(createElement(SeriesNoteFeedCard, { note, locale: "ko" }));
    expect(row().dataset.seriesNote).toBe("40");
    expect(topLine().textContent).toBe("리팩터링 일지·seriesNoteMarker");
    const body = host.querySelector("p")!;
    expect(body.className).toContain("line-clamp-3");
    expect(body.closest("a")!.getAttribute("href")).toBe("/ko/p/dohyun/notes/40");
    expect(row().querySelector("time")!.textContent).toBe("2시간");
  });

  it("shows only the warning, in two lines, for a note behind a content warning", async () => {
    await render(createElement(SeriesNoteFeedCard, { note: { ...note, contentWarning: "무거운 이야기" }, locale: "ko" }));
    const body = host.querySelector("p")!;
    expect(body.textContent).toBe("무거운 이야기");
    expect(body.className).toContain("line-clamp-2");
  });
});
