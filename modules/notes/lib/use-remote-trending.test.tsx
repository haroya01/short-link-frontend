import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteNotesPage, TrendingNote } from "@/modules/notes/api/remote-trending";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, ready: true },
  listRemoteNotes: vi.fn(),
  resolveRemote: vi.fn(),
  setNoteLike: vi.fn(),
  setRemoteFollow: vi.fn(),
  askToSignIn: vi.fn(),
  toast: vi.fn(),
  likeFailed: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    values?.domain ? `${namespace}.${key}:${values.domain}` : `${namespace}.${key}`,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/host", () => ({ blogPath: (path: string) => path }));
vi.mock("@/modules/blog/lib/author-href", () => ({ authorHref: (u: string, _l: string, rest = "") => `/@${u}/${rest}` }));
vi.mock("@/components/auth/login-prompt", () => ({ askToSignIn: mocks.askToSignIn }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/use-like-failed", () => ({ useLikeFailed: () => mocks.likeFailed }));
vi.mock("@/modules/notes/api/remote-trending", () => ({ listRemoteNotes: mocks.listRemoteNotes }));
vi.mock("@/modules/notes/api/federation-search", () => ({ resolveRemote: mocks.resolveRemote }));
vi.mock("@/modules/notes/api/notes", () => ({
  setNoteLike: mocks.setNoteLike,
  setRemoteFollow: mocks.setRemoteFollow,
}));
vi.mock("@/modules/notes/components/remote-account", () => ({ followFailure: () => "disabled" }));

import {
  REMOTE_TRENDING_STALE_MS,
  useRemoteNotes,
  useTrendingNote,
  type RemoteNotes,
} from "./use-remote-trending";

const URI = "https://qdon.space/users/minji/statuses/113000000000000001";
const URL_ = "https://qdon.space/@minji/113000000000000001";

const item = {
  id: null,
  body: "서울 불꽃축제 사진 몇 장 올려요.",
  author: { id: null, username: "minji@qdon.space", avatarUrl: null, remoteId: null },
  likeCount: 128,
  replyCount: 4,
  uri: URI,
  url: URL_,
  sourceHost: "qdon.space",
  servers: ["qdon.space", "planet.moe"],
} as unknown as TrendingNote;

function localNote(partial: Partial<Note> = {}): Note {
  return {
    id: 4321,
    body: item.body,
    author: { id: -412, username: "minji@qdon.space", avatarUrl: null, remoteId: 412 },
    likedByMe: false,
    ...partial,
  } as Note;
}

function deferred<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (settle = resolve));
  return { promise, settle };
}

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { authenticated: true, ready: true };
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function flush() {
  for (let i = 0; i < 4; i += 1) await act(async () => vi.advanceTimersByTimeAsync(0));
}

function pool(items: TrendingNote[], next: string | null = null): RemoteNotesPage {
  return { items: items.map((item) => ({ kind: "pool", item })), next };
}

describe("the list of posts from other servers", () => {
  let seen: RemoteNotes;

  function Probe({ view = "trending" }: { view?: "trending" | "latest" }) {
    seen = useRemoteNotes(view);
    return null;
  }

  async function mount(view: "trending" | "latest" = "trending") {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe key={Math.random()} view={view} />
        </QueryClientProvider>,
      ),
    );
    await flush();
  }

  function loaded() {
    expect(seen.state).toBe("ready");
    return seen as Extract<RemoteNotes, { state: "ready" }>;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mocks.listRemoteNotes.mockReset();
  });

  it("waits for the session before asking, then shows what came back", async () => {
    mocks.auth = { authenticated: false, ready: false };
    mocks.listRemoteNotes.mockResolvedValue(pool([item]));
    await mount();
    expect(seen).toEqual({ state: "loading" });
    expect(mocks.listRemoteNotes).not.toHaveBeenCalled();

    mocks.auth = { authenticated: false, ready: true };
    await mount();
    expect(mocks.listRemoteNotes).toHaveBeenCalledWith("trending", null);
    expect(loaded().pages).toEqual([pool([item])]);
    expect(loaded().hasMore).toBe(false);
  });

  it("follows next page by page until it runs out", async () => {
    const kept: RemoteNotesPage = { items: [{ kind: "kept", note: { id: 12 } as Note }], next: null };
    mocks.listRemoteNotes
      .mockResolvedValueOnce(pool([item], "t20"))
      .mockResolvedValueOnce(pool([], "r"))
      .mockResolvedValueOnce(kept);
    await mount();
    expect(loaded().hasMore).toBe(true);

    await act(async () => loaded().more());
    await flush();
    await act(async () => loaded().more());
    await flush();
    expect(mocks.listRemoteNotes.mock.calls).toEqual([
      ["trending", null],
      ["trending", "t20"],
      ["trending", "r"],
    ]);
    expect(loaded().pages).toEqual([pool([item], "t20"), pool([], "r"), kept]);
    expect(loaded().hasMore).toBe(false);
  });

  it("keeps trending and latest apart", async () => {
    mocks.listRemoteNotes.mockResolvedValue(pool([item]));
    await mount("trending");
    await mount("latest");
    expect(mocks.listRemoteNotes.mock.calls).toEqual([
      ["trending", null],
      ["latest", null],
    ]);
  });

  it("a later page that fails says so and keeps what is shown, and asking again loads it", async () => {
    mocks.listRemoteNotes.mockResolvedValueOnce(pool([item], "t20")).mockRejectedValueOnce(new Error("503"));
    await mount();
    await act(async () => loaded().more());
    await flush();
    expect(loaded().moreFailed).toBe(true);
    expect(loaded().pages).toEqual([pool([item], "t20")]);

    mocks.listRemoteNotes.mockResolvedValueOnce(pool([], null));
    await act(async () => loaded().more());
    await flush();
    expect(loaded().moreFailed).toBe(false);
    expect(loaded().hasMore).toBe(false);
  });

  it("an empty page with a next asks for the next one at once, three times in a row at most", async () => {
    mocks.listRemoteNotes.mockImplementation((_view: string, cursor: string | null) =>
      Promise.resolve(pool([], `u${Number(cursor?.slice(1) ?? 0) + 1}`)),
    );
    await mount("latest");
    await flush();
    expect(mocks.listRemoteNotes.mock.calls).toEqual([
      ["latest", null],
      ["latest", "u1"],
      ["latest", "u2"],
      ["latest", "u3"],
    ]);
    expect(loaded().stalled).toBe(true);
    expect(loaded().loadingMore).toBe(false);

    await act(async () => loaded().more());
    await flush();
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(5);
    expect(loaded().stalled).toBe(true);
  });

  it("the chain starts over once a page brings posts", async () => {
    mocks.listRemoteNotes
      .mockResolvedValueOnce(pool([], "u1"))
      .mockResolvedValueOnce(pool([item], "u2"))
      .mockResolvedValueOnce(pool([], "u3"))
      .mockResolvedValueOnce(pool([], "u4"))
      .mockResolvedValueOnce(pool([], "u5"))
      .mockResolvedValueOnce(pool([], "u6"))
      .mockResolvedValue(pool([], null));
    await mount("latest");
    await flush();
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(2);
    expect(loaded().stalled).toBe(false);

    await act(async () => loaded().more());
    await flush();
    await flush();
    expect(mocks.listRemoteNotes.mock.calls.map(([, cursor]) => cursor)).toEqual([null, "u1", "u2", "u3", "u4", "u5"]);
    expect(loaded().stalled).toBe(true);
  });

  it("an empty last page ends the list without asking again", async () => {
    mocks.listRemoteNotes.mockResolvedValueOnce(pool([], null));
    await mount("latest");
    await flush();
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(1);
    expect(loaded().hasMore).toBe(false);
  });

  it("keeps the list for five minutes and asks again only when the view opens after that", async () => {
    mocks.listRemoteNotes.mockResolvedValue(pool([item]));
    await mount();
    await act(async () => vi.advanceTimersByTimeAsync(REMOTE_TRENDING_STALE_MS - 1000));
    await mount();
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(10 * REMOTE_TRENDING_STALE_MS));
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(1);

    await mount();
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(2);
  });

  it("asks again when the reader signs in, since their list is filtered for them", async () => {
    mocks.auth = { authenticated: false, ready: true };
    mocks.listRemoteNotes.mockResolvedValue(pool([item]));
    await mount();
    mocks.auth = { authenticated: true, ready: true };
    await mount();
    expect(mocks.listRemoteNotes).toHaveBeenCalledTimes(2);
  });

  it("a failure says so, and retry loads again", async () => {
    mocks.listRemoteNotes.mockRejectedValueOnce(new Error("503"));
    await mount();
    expect(seen.state).toBe("failed");

    const later = deferred<RemoteNotesPage>();
    mocks.listRemoteNotes.mockReturnValueOnce(later.promise);
    await act(async () => (seen as Extract<RemoteNotes, { state: "failed" }>).retry());
    await flush();
    expect(seen).toEqual({ state: "loading" });

    later.settle(pool([item]));
    await flush();
    expect(loaded().pages).toEqual([pool([item])]);
  });
});

describe("reacting to a trending post", () => {
  let actions: ReturnType<typeof useTrendingNote>;

  function Probe() {
    actions = useTrendingNote(item);
    return null;
  }

  async function mount() {
    await act(async () => root.render(<Probe />));
  }

  it.each([
    ["open", "federatedNotes"],
    ["reply", "reply"],
    ["like", "like"],
    ["follow", "follow"],
    ["openAuthor", "remoteAccount"],
    ["quote", "quote"],
  ] as const)("signed out, %s opens the login door and brings nothing over", async (action, reason) => {
    mocks.auth = { authenticated: false, ready: true };
    await mount();
    await act(async () => actions[action]());
    expect(mocks.askToSignIn).toHaveBeenCalledWith(reason);
    expect(mocks.resolveRemote).not.toHaveBeenCalled();
  });

  it("opening resolves the AP id, not the page address, then goes to the local note", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    await mount();
    await act(async () => actions.open());
    expect(mocks.resolveRemote).toHaveBeenCalledWith(URI);
    expect(mocks.push).toHaveBeenCalledWith("/remote/412/notes/4321");
  });

  it("brings the post over once, however many times and ways it is touched", async () => {
    const answer = deferred<unknown>();
    mocks.resolveRemote.mockReturnValue(answer.promise);
    mocks.setNoteLike.mockResolvedValue({ liked: true, likeCount: 1 });
    await mount();
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = actions.open();
      second = actions.reply();
    });
    expect(actions.busy).toBe(true);
    await act(async () => {
      answer.settle({ state: "note", note: localNote() });
      await Promise.all([first, second]);
    });
    expect(actions.busy).toBe(false);
    await act(async () => actions.like());
    await act(async () => actions.follow());
    expect(mocks.resolveRemote).toHaveBeenCalledTimes(1);
    expect(actions.replyTarget?.id).toBe(4321);
  });

  it("likes the local note by its own id, counting from the trending number, and a second tap takes it back", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    mocks.setNoteLike.mockResolvedValue({ liked: true, likeCount: 1 });
    await mount();
    expect(actions.likeCount).toBe(128);
    await act(async () => actions.like());
    expect(mocks.setNoteLike).toHaveBeenLastCalledWith(4321, true);
    expect(actions.liked).toBe(true);
    expect(actions.likeCount).toBe(129);
    await act(async () => actions.like());
    expect(mocks.setNoteLike).toHaveBeenLastCalledWith(4321, false);
    expect(actions.liked).toBe(false);
    expect(actions.likeCount).toBe(128);
  });

  it("a first like on a post the reader already liked keeps the like", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote({ likedByMe: true }) });
    await mount();
    await act(async () => actions.like());
    expect(mocks.setNoteLike).not.toHaveBeenCalled();
    expect(actions.liked).toBe(true);
    expect(actions.likeCount).toBe(128);
  });

  it("fills the heart before the post is brought over, and takes it back when that fails", async () => {
    const answer = deferred<unknown>();
    mocks.resolveRemote.mockReturnValue(answer.promise);
    await mount();
    let liking!: Promise<void>;
    await act(async () => {
      liking = actions.like();
    });
    expect(actions.liked).toBe(true);
    expect(actions.likeCount).toBe(129);
    expect(mocks.setNoteLike).not.toHaveBeenCalled();
    await act(async () => {
      answer.settle({ state: "missing", domain: "qdon.space" });
      await liking;
    });
    expect(actions.liked).toBe(false);
    expect(actions.likeCount).toBe(128);
    expect(mocks.setNoteLike).not.toHaveBeenCalled();
  });

  it("quoting and reposting bring the post over once and hand back the local note", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    await mount();
    await act(async () => actions.quote());
    expect(actions.quoteTarget?.id).toBe(4321);
    let resolved: Note | null = null;
    await act(async () => {
      resolved = await actions.resolve();
    });
    expect(resolved).toMatchObject({ id: 4321 });
    expect(mocks.resolveRemote).toHaveBeenCalledTimes(1);
  });

  it("a like that fails goes back and says so", async () => {
    const error = new Error("like 500");
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    mocks.setNoteLike.mockRejectedValue(error);
    await mount();
    await act(async () => actions.like());
    expect(actions.liked).toBe(false);
    expect(actions.likeCount).toBe(128);
    expect(mocks.likeFailed).toHaveBeenCalledWith(error);
  });

  it.each([
    [{ state: "missing", domain: "qdon.space" }, "notes.remoteSearchNotFound:qdon.space"],
    [{ state: "unreachable", domain: "qdon.space" }, "notes.remoteSearchUnreachable:qdon.space"],
    [{ state: "hidden" }, "notes.remoteFetchFailed"],
  ])("a post that cannot be brought over (%o) names the server and is asked again next time", async (result, message) => {
    mocks.resolveRemote.mockResolvedValue(result);
    await mount();
    await act(async () => actions.open());
    expect(mocks.toast).toHaveBeenCalledWith(message, "error");
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => actions.open());
    expect(mocks.resolveRemote).toHaveBeenCalledTimes(2);
  });

  it("a session that ran out on the way opens the login door", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "signin" });
    await mount();
    await act(async () => actions.reply());
    expect(mocks.askToSignIn).toHaveBeenCalledWith("reply");
    expect(actions.replyTarget).toBeNull();
  });

  it.each([
    [true, "notes.remoteFollowed"],
    [false, "notes.remoteFollowRequested"],
  ])("following asks the author's local account (following: %s)", async (following, message) => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    mocks.setRemoteFollow.mockResolvedValue({ id: 412, following, requested: !following });
    await mount();
    await act(async () => actions.follow());
    expect(mocks.setRemoteFollow).toHaveBeenCalledWith(412, true);
    expect(mocks.toast).toHaveBeenCalledWith(message);
  });

  it("a follow the server refuses says why", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    mocks.setRemoteFollow.mockRejectedValue(new Error("403"));
    await mount();
    await act(async () => actions.follow());
    expect(mocks.toast).toHaveBeenCalledWith("notes.remoteError.disabled", "error");
  });

  it("an author this server did not know opens once the post is brought over", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    await mount();
    await act(async () => actions.openAuthor());
    expect(mocks.resolveRemote).toHaveBeenCalledWith(URI);
    expect(mocks.push).toHaveBeenCalledWith("/remote/412");
  });
});
