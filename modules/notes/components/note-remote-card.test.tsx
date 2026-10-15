import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, NotePoll } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  auth: { authenticated: true, me: { id: 1, username: "dohyun" } } as {
    authenticated: boolean;
    me: { id: number; username: string } | null;
  },
}));
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.values(values).join(",")})` : key,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => "/ko/blog/notes" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/modules/blog/components/avatar", () => ({ Avatar: () => null }));
vi.mock("@/modules/blog/components/blog-link", () => ({
  BlogLink: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("@/modules/blog/components/follow-button", () => ({ FollowButton: () => null }));
vi.mock("@/modules/blog/components/connect-sheet", () => ({ ConnectSheet: () => null }));
vi.mock("@/modules/blog/components/report-button", () => ({ ReportButton: () => null }));
vi.mock("./note-reply-dialog", () => ({ NoteReplyDialog: () => null }));
vi.mock("./note-quote-dialog", () => ({ NoteQuoteDialog: () => null }));
vi.mock("./note-series-dialog", () => ({ NoteSeriesDialog: () => null }));
vi.mock("./note-history-dialog", () => ({ NoteHistoryDialog: () => null }));
vi.mock("./note-composer", () => ({ TextToggle: () => null }));
vi.mock("react", async (original) => ({ ...(await original<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

import { NoteCard } from "./note-card";
import { closed } from "./note-poll";

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.push.mockReset();
  mocks.auth = { authenticated: true, me: { id: 1, username: "dohyun" } };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const render = (node: React.ReactNode) => act(async () => root.render(node));

const ELSEWHERE = {
  id: -9807,
  username: "tomas@lemmy.example",
  avatarUrl: null,
  displayName: "Tomas",
  remoteId: 9807,
  url: "https://lemmy.example/u/tomas",
};

const note = (over: Partial<Note>): Note => ({
  id: 17,
  body: "Built two beds from untreated cedar.",
  createdAt: "2026-10-03T09:05:00Z",
  editedAt: null,
  likeCount: null,
  likedByMe: false,
  author: ELSEWHERE,
  media: [],
  quotedPost: null,
  inReplyToId: null,
  replyCount: 0,
  repostCount: null,
  repostedByMe: false,
  quotedNote: null,
  linkPreview: null,
  ...over,
});

const picture = { url: "https://lemmy.example/pictrs/image/beds.jpeg", altText: null, contentType: "image/jpeg" };

const poll = (over: Partial<NotePoll> = {}): NotePoll => ({
  expiresAt: "2099-01-01T00:00:00Z",
  expired: false,
  multiple: false,
  votesCount: 11,
  votersCount: 11,
  options: [
    { title: "Friday", votesCount: 4 },
    { title: "Saturday", votesCount: 7 },
  ],
  voted: true,
  ownVotes: [],
  ...over,
});

describe("a post from another server that is more than a note", () => {
  it("shows an article as one card that opens the original in a new tab and names where it goes", async () => {
    await render(
      <NoteCard
        note={note({
          media: [picture],
          remote: { kind: "ARTICLE", title: "Tomato season", url: "https://www.blog.example/2026/10/tomato/", community: null },
        })}
      />,
    );
    const card = host.querySelector<HTMLAnchorElement>('a[data-remote-card="ARTICLE"]')!;
    expect(card).not.toBeNull();
    expect(card.getAttribute("href")).toBe("https://www.blog.example/2026/10/tomato/");
    expect(card.getAttribute("target")).toBe("_blank");
    expect(card.getAttribute("rel")).toBe("nofollow noopener ugc");
    expect(card.getAttribute("aria-label")).toBe("remoteOpenLabel(Tomato season,blog.example)");
    expect(card.textContent).toContain("Tomato season");
    expect(card.textContent).toContain("Built two beds from untreated cedar.");
    expect(card.textContent).toContain("remoteOpen");
    expect(card.textContent).toContain("blog.example");
    expect(card.textContent).not.toContain("/2026/10/tomato");
    const image = card.querySelector("img")!;
    expect(image.getAttribute("src")).toBe(picture.url);
    expect(image.hasAttribute("referrerpolicy")).toBe(false);
    expect(host.querySelectorAll("img")).toHaveLength(1);
  });

  it("keeps the summary as plain text, links and all", async () => {
    await render(
      <NoteCard
        note={note({
          body: "<b>bold</b> see https://lemmy.example/x and #garden",
          remote: { kind: "PAGE", title: null, url: "https://lemmy.example/post/1", community: null },
        })}
      />,
    );
    const card = host.querySelector('a[data-remote-card="PAGE"]')!;
    expect(card.querySelectorAll("a, b")).toHaveLength(0);
    expect(card.textContent).toContain("<b>bold</b> see https://lemmy.example/x and #garden");
    expect(card.getAttribute("aria-label")).toBe("remoteOpenHost(lemmy.example)");
  });

  it("names the community of a community post", async () => {
    await render(
      <NoteCard
        note={note({
          remote: {
            kind: "PAGE",
            title: "Raised beds",
            url: "https://lemmy.example/post/12345",
            community: "gardening@lemmy.example",
          },
        })}
      />,
    );
    expect(host.querySelector("[data-remote-community]")!.textContent).toBe("gardening@lemmy.example");
  });

  it("marks a video's picture as a video and never loads the file", async () => {
    await render(
      <NoteCard
        note={note({
          media: [picture],
          remote: { kind: "VIDEO", title: "Forest stream", url: "https://pt.example/w/9c1f2e", community: null },
        })}
      />,
    );
    const card = host.querySelector('a[data-remote-card="VIDEO"]')!;
    expect(card.querySelector('[role="img"]')!.getAttribute("aria-label")).toBe("remoteVideo");
    expect(host.querySelector("video")).toBeNull();
  });

  it("opens only the original when the card is clicked, not the note", async () => {
    const around = vi.fn();
    await render(
      <div onClick={around}>
        <NoteCard
          note={note({ remote: { kind: "ARTICLE", title: "T", url: "https://blog.example/t", community: null } })}
        />
      </div>,
    );
    const card = host.querySelector<HTMLAnchorElement>("a[data-remote-card]")!;
    card.addEventListener("click", (e) => e.preventDefault());
    await act(async () => card.click());
    expect(around).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("is a card without a way out when the original is missing or not on the web", async () => {
    await render(
      <NoteCard note={note({ remote: { kind: "ARTICLE", title: "T", url: "javascript:alert(1)", community: null } })} />,
    );
    expect(host.querySelector("div[data-remote-card]")).not.toBeNull();
    expect(host.querySelector("a[data-remote-card]")).toBeNull();
    expect(host.textContent).not.toContain("remoteOpen");
  });

  it("keeps a sensitive picture covered outside the card until it is revealed", async () => {
    await render(
      <NoteCard
        note={note({
          sensitive: true,
          media: [picture],
          remote: { kind: "VIDEO", title: "T", url: "https://pt.example/w/1", community: null },
        })}
      />,
    );
    expect(host.querySelector("a[data-remote-card] img")).toBeNull();
    expect(host.querySelector("[data-note-sensitive]")).not.toBeNull();
  });
});

describe("a poll from another server", () => {
  it("shows only the results, with the way to vote on the original", async () => {
    await render(
      <NoteCard
        note={note({
          poll: poll(),
          remote: { kind: "QUESTION", title: null, url: "https://mastodon.social/@mina/1", community: null },
        })}
      />,
    );
    expect(host.querySelectorAll("[data-poll-result]")).toHaveLength(2);
    expect(host.querySelector("[data-note-poll] button")).toBeNull();
    const link = host.querySelector<HTMLAnchorElement>("[data-poll-elsewhere]")!;
    expect(link.getAttribute("href")).toBe("https://mastodon.social/@mina/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("nofollow noopener ugc");
    expect(link.textContent).toContain("remoteVote");
  });

  it("shows the results to a guest too, with nothing to press but the original", async () => {
    mocks.auth = { authenticated: false, me: null };
    await render(
      <NoteCard
        note={note({
          poll: poll({ voted: null, ownVotes: null }),
          remote: { kind: "QUESTION", title: null, url: "https://mastodon.social/@mina/1", community: null },
        })}
      />,
    );
    expect(host.querySelectorAll("[data-poll-result]")).toHaveLength(2);
    expect(host.querySelector("[data-note-poll] button")).toBeNull();
  });

  it("reads a poll with no closing time as open", async () => {
    await render(
      <NoteCard
        note={note({
          poll: poll({ expiresAt: null }),
          remote: { kind: "QUESTION", title: null, url: "https://misskey.io/notes/1", community: null },
        })}
      />,
    );
    const footer = host.querySelector("[data-note-poll] p")!;
    expect(footer.textContent).toContain("pollVoters(11)");
    expect(footer.textContent).toContain("pollNoDeadline");
    expect(footer.textContent).not.toContain("pollEnded");
    expect(footer.textContent).toContain("remoteVote");
  });

  it("points to the original, not to a vote, once it has closed", async () => {
    await render(
      <NoteCard
        note={note({
          poll: poll({ expired: true }),
          remote: { kind: "QUESTION", title: null, url: "https://mastodon.social/@mina/1", community: null },
        })}
      />,
    );
    expect(host.querySelector("[data-poll-elsewhere]")!.textContent).toContain("remoteOpen");
  });
});

describe("closed", () => {
  it("treats a missing closing time as open and a passed one as closed", () => {
    const now = Date.parse("2026-10-16T00:00:00Z");
    expect(closed(poll({ expiresAt: null }), now)).toBe(false);
    expect(closed(poll({ expiresAt: null, expired: true }), now)).toBe(true);
    expect(closed(poll({ expiresAt: "2026-10-15T00:00:00Z" }), now)).toBe(true);
    expect(closed(poll({ expiresAt: "2026-10-17T00:00:00Z" }), now)).toBe(false);
    expect(closed(poll({ expiresAt: "2026-10-15T00:00:00Z" }), null)).toBe(false);
  });
});

describe("a response without remote", () => {
  const YUNA = { id: 15, username: "yuna", avatarUrl: null };

  it("draws a note as before: the body, its pictures and no card", async () => {
    await render(<NoteCard note={note({ author: YUNA, body: "산책 #산책", media: [picture] })} />);
    expect(host.querySelector("[data-remote-card]")).toBeNull();
    expect(host.querySelector("[data-note-body] p")!.textContent).toBe("산책 #산책");
    expect(host.querySelectorAll("img")).toHaveLength(1);
    expect(host.querySelector("img")!.closest("a[data-remote-card]")).toBeNull();
  });

  it("keeps a member's poll votable, with no way to an original", async () => {
    await render(<NoteCard note={note({ author: YUNA, poll: poll({ voted: false }) })} />);
    expect(host.querySelectorAll("[data-note-poll] li button")).toHaveLength(2);
    expect(host.querySelector("[data-poll-elsewhere]")).toBeNull();
  });
});
