import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { TrendingNote } from "@/modules/notes/api/remote-trending";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, ready: true },
  listRemoteTrending: vi.fn(),
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
vi.mock("@/modules/notes/api/remote-trending", () => ({ listRemoteTrending: mocks.listRemoteTrending }));
vi.mock("@/modules/notes/api/federation-search", () => ({ resolveRemote: mocks.resolveRemote }));
vi.mock("@/modules/notes/api/notes", () => ({
  setNoteLike: mocks.setNoteLike,
  setRemoteFollow: mocks.setRemoteFollow,
}));
vi.mock("@/modules/notes/components/remote-account", () => ({ followFailure: () => "disabled" }));

import {
  REMOTE_TRENDING_STALE_MS,
  useRemoteTrending,
  useTrendingNote,
  type RemoteTrending,
} from "./use-remote-trending";

const URI = "https://qdon.space/users/minji/statuses/113000000000000001";
const URL_ = "https://qdon.space/@minji/113000000000000001";

const item = {
  id: null,
  body: "서울 불꽃축제 사진 몇 장 올려요.",
  author: { id: null, username: "minji@qdon.space", avatarUrl: null, remoteId: null },
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

describe("the trending list", () => {
  let seen: RemoteTrending;

  function Probe() {
    seen = useRemoteTrending();
    return null;
  }

  async function mount() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe key={Math.random()} />
        </QueryClientProvider>,
      ),
    );
    await flush();
  }

  beforeEach(() => vi.useFakeTimers());

  it("waits for the session before asking, then shows what came back", async () => {
    mocks.auth = { authenticated: false, ready: false };
    mocks.listRemoteTrending.mockResolvedValue([item]);
    await mount();
    expect(seen).toEqual({ state: "loading" });
    expect(mocks.listRemoteTrending).not.toHaveBeenCalled();

    mocks.auth = { authenticated: false, ready: true };
    await mount();
    expect(mocks.listRemoteTrending).toHaveBeenCalledTimes(1);
    expect(seen).toEqual({ state: "ready", items: [item] });
  });

  it("keeps the list for five minutes and asks again only when the view opens after that", async () => {
    mocks.listRemoteTrending.mockResolvedValue([item]);
    await mount();
    await act(async () => vi.advanceTimersByTimeAsync(REMOTE_TRENDING_STALE_MS - 1000));
    await mount();
    expect(mocks.listRemoteTrending).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(10 * REMOTE_TRENDING_STALE_MS));
    expect(mocks.listRemoteTrending).toHaveBeenCalledTimes(1);

    await mount();
    expect(mocks.listRemoteTrending).toHaveBeenCalledTimes(2);
  });

  it("asks again when the reader signs in, since their list is filtered for them", async () => {
    mocks.auth = { authenticated: false, ready: true };
    mocks.listRemoteTrending.mockResolvedValue([item]);
    await mount();
    mocks.auth = { authenticated: true, ready: true };
    await mount();
    expect(mocks.listRemoteTrending).toHaveBeenCalledTimes(2);
  });

  it("an empty list is ready and empty, so the group can hide", async () => {
    mocks.listRemoteTrending.mockResolvedValue([]);
    await mount();
    expect(seen).toEqual({ state: "ready", items: [] });
  });

  it("a failure says so, and retry loads again", async () => {
    mocks.listRemoteTrending.mockRejectedValueOnce(new Error("503"));
    await mount();
    expect(seen.state).toBe("failed");

    const later = deferred<TrendingNote[]>();
    mocks.listRemoteTrending.mockReturnValueOnce(later.promise);
    await act(async () => (seen as Extract<RemoteTrending, { state: "failed" }>).retry());
    await flush();
    expect(seen).toEqual({ state: "loading" });

    later.settle([item]);
    await flush();
    expect(seen).toEqual({ state: "ready", items: [item] });
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

  it("likes the local note by its own id, and a second tap takes it back", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    mocks.setNoteLike.mockResolvedValue({ liked: true, likeCount: 1 });
    await mount();
    await act(async () => actions.like());
    expect(mocks.setNoteLike).toHaveBeenLastCalledWith(4321, true);
    expect(actions.liked).toBe(true);
    await act(async () => actions.like());
    expect(mocks.setNoteLike).toHaveBeenLastCalledWith(4321, false);
    expect(actions.liked).toBe(false);
  });

  it("a first like on a post the reader already liked keeps the like", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote({ likedByMe: true }) });
    await mount();
    await act(async () => actions.like());
    expect(mocks.setNoteLike).not.toHaveBeenCalled();
    expect(actions.liked).toBe(true);
  });

  it("a like that fails goes back and says so", async () => {
    const error = new Error("like 500");
    mocks.resolveRemote.mockResolvedValue({ state: "note", note: localNote() });
    mocks.setNoteLike.mockRejectedValue(error);
    await mount();
    await act(async () => actions.like());
    expect(actions.liked).toBe(false);
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
