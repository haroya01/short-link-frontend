import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteAccount } from "@/modules/notes/api/notes";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, ready: true },
  resolveRemote: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/modules/notes/api/federation-search", () => ({ resolveRemote: mocks.resolveRemote }));

import { useLiveRemoteLookup, type LiveRemoteLookup } from "./use-remote-resolution";

const mina: RemoteAccount = {
  id: 9800,
  acct: "mina@mastodon.social",
  username: "mina",
  domain: "mastodon.social",
  displayName: "Mina",
  avatarUrl: null,
  url: "https://mastodon.social/@mina",
  following: false,
  requested: false,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { authenticated: true, ready: true };
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("a handle typed into the live search", () => {
  let lookup: LiveRemoteLookup | null;
  let client: QueryClient;

  function Probe({ query, enabled = true }: { query: string; enabled?: boolean }) {
    lookup = useLiveRemoteLookup(query, enabled);
    return null;
  }

  async function type(query: string, wait = 0) {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe query={query} />
        </QueryClientProvider>,
      ),
    );
    if (wait) await act(async () => vi.advanceTimersByTimeAsync(wait));
    await flush();
  }

  async function flush() {
    for (let i = 0; i < 3; i += 1) await act(async () => vi.advanceTimersByTimeAsync(0));
  }

  function deferred() {
    let settle!: (value: unknown) => void;
    const promise = new Promise((resolve) => (settle = resolve));
    return { promise, settle };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    lookup = null;
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks once typing has paused for 450ms, then shows the account", async () => {
    mocks.resolveRemote.mockResolvedValue({ state: "account", account: mina });
    await type("@mina@mastodon.social", 449);
    expect(mocks.resolveRemote).not.toHaveBeenCalled();
    expect(lookup).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    await flush();
    expect(mocks.resolveRemote).toHaveBeenCalledTimes(1);
    expect(mocks.resolveRemote.mock.calls[0][0]).toBe("@mina@mastodon.social");
    expect(lookup).toEqual({ state: "account", account: mina });
  });

  it("is pending while the server has not answered", async () => {
    mocks.resolveRemote.mockReturnValue(new Promise(() => {}));
    await type("@mina@mastodon.social", 450);
    expect(lookup).toEqual({ state: "pending" });
  });

  it("asks with what people paste, cleaned: a full-width ＠ and an acct: prefix", async () => {
    mocks.resolveRemote.mockReturnValue(new Promise(() => {}));
    await type(" acct:＠mina＠mastodon.social ", 450);
    expect(mocks.resolveRemote.mock.calls[0][0]).toBe("@mina@mastodon.social");
  });

  it.each(["@a@mastodon.s", "@a@mastodon.", "@a@mastodon.social-", "https://mastodon.s/@mina", "mina", "@mina"])(
    "asks nothing while %s names no finished server",
    async (query) => {
      await type(query, 1000);
      expect(mocks.resolveRemote).not.toHaveBeenCalled();
      expect(lookup).toBeNull();
    },
  );

  it("asks nothing for a signed-out reader or a closed search", async () => {
    mocks.auth = { authenticated: false, ready: true };
    await type("@mina@mastodon.social", 1000);
    mocks.auth = { authenticated: true, ready: true };
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe query="@mina@mastodon.social" enabled={false} />
        </QueryClientProvider>,
      ),
    );
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(mocks.resolveRemote).not.toHaveBeenCalled();
    expect(lookup).toBeNull();
  });

  it("cancels the question for a query that changed", async () => {
    let first: AbortSignal | undefined;
    mocks.resolveRemote.mockImplementationOnce((_q: string, init: { signal: AbortSignal }) => {
      first = init.signal;
      return new Promise(() => {});
    });
    mocks.resolveRemote.mockResolvedValue({ state: "account", account: mina });
    await type("@nobody@mastodon.social", 450);
    expect(first?.aborted).toBe(false);
    await type("@mina@mastodon.social");
    expect(first?.aborted).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(450));
    await flush();
    expect(mocks.resolveRemote).toHaveBeenCalledTimes(2);
    expect(lookup).toEqual({ state: "account", account: mina });
  });

  it("never shows a superseded query's error, only the settled one's", async () => {
    const late = deferred();
    mocks.resolveRemote.mockReturnValueOnce(late.promise);
    mocks.resolveRemote.mockReturnValueOnce(new Promise(() => {}));
    await type("@nobody@mastodon.social", 450);
    await type("@mina@mastodon.social");
    await act(async () => late.settle({ state: "missing", domain: "mastodon.social" }));
    await flush();
    expect(lookup).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(450));
    await flush();
    expect(lookup).toEqual({ state: "pending" });
  });

  it("says which server had no such account or did not answer, once the query settled", async () => {
    mocks.resolveRemote.mockResolvedValueOnce({ state: "missing", domain: "mastodon.social" });
    await type("@nobody@mastodon.social", 450);
    expect(lookup).toEqual({ state: "missing", domain: "mastodon.social" });
    mocks.resolveRemote.mockResolvedValueOnce({ state: "unreachable", domain: "down.example" });
    await type("@mina@down.example", 450);
    expect(lookup).toEqual({ state: "unreachable", domain: "down.example" });
  });

  it("shows nothing live for a note address or an account the viewer blocked", async () => {
    mocks.resolveRemote.mockResolvedValueOnce({ state: "note", note: { id: 12 } });
    await type("https://mastodon.social/@mina/12", 450);
    expect(lookup).toBeNull();
    mocks.resolveRemote.mockResolvedValueOnce({ state: "account", account: { ...mina, blocking: true } });
    await type("@mina@mastodon.social", 450);
    expect(lookup).toBeNull();
  });
});
