import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ suggestRemoteDomains: vi.fn() }));
vi.mock("@/modules/notes/api/federation-search", () => ({ suggestRemoteDomains: mocks.suggestRemoteDomains }));

import { useDomainCompletions, type DomainCompletions } from "./use-domain-completions";

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
let seen: DomainCompletions;

function Probe({ query, enabled = true }: { query: string; enabled?: boolean }) {
  seen = useDomainCompletions(query, enabled);
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
  for (let i = 0; i < 3; i += 1) await act(async () => vi.advanceTimersByTimeAsync(0));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("React", React);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("completing a handle's server", () => {
  it("does nothing for a plain name, and never holds the resolve", async () => {
    await type("gargron", 500);
    expect(mocks.suggestRemoteDomains).not.toHaveBeenCalled();
    expect(seen).toEqual({ handles: [], active: false, hold: false });
  });

  it("asks once typing pauses for 150ms and offers whole handles", async () => {
    mocks.suggestRemoteDomains.mockResolvedValue(["mastodon.social", "mastodon.online"]);
    await type("@gargron@mast", 149);
    expect(mocks.suggestRemoteDomains).not.toHaveBeenCalled();
    expect(seen).toEqual({ handles: [], active: true, hold: true });
    await type("@gargron@mast", 1);
    expect(mocks.suggestRemoteDomains).toHaveBeenCalledTimes(1);
    expect(mocks.suggestRemoteDomains.mock.calls[0][0]).toBe("mast");
    expect(seen).toEqual({ handles: ["@gargron@mastodon.social", "@gargron@mastodon.online"], active: true, hold: true });
  });

  it("offers the servers it knows best right after the second @", async () => {
    mocks.suggestRemoteDomains.mockResolvedValue(["mastodon.social"]);
    await type("＠gargron＠", 150);
    expect(mocks.suggestRemoteDomains.mock.calls[0][0]).toBe("");
    expect(seen.handles).toEqual(["@gargron@mastodon.social"]);
  });

  it("holds a server that only looks finished while it is not one of those offered", async () => {
    mocks.suggestRemoteDomains.mockResolvedValue(["mastodon.social"]);
    await type("@alice@mastodon.so", 150);
    expect(seen).toEqual({ handles: ["@alice@mastodon.social"], active: true, hold: true });
  });

  it("lets go once the server typed out is one of those offered", async () => {
    mocks.suggestRemoteDomains.mockResolvedValue(["mastodon.social", "mastodon.online"]);
    await type("@alice@Mastodon.Social", 150);
    expect(seen).toEqual({ handles: [], active: true, hold: false });
  });

  it("lets go when nothing matched or the request failed", async () => {
    mocks.suggestRemoteDomains.mockResolvedValueOnce([]);
    await type("@alice@zz.example", 150);
    expect(seen).toEqual({ handles: [], active: true, hold: false });
    mocks.suggestRemoteDomains.mockResolvedValueOnce(null);
    await type("@alice@yy.example", 150);
    expect(seen).toEqual({ handles: [], active: true, hold: false });
  });

  it("cancels the request for a prefix that changed", async () => {
    let first: AbortSignal | undefined;
    mocks.suggestRemoteDomains.mockImplementationOnce((_prefix: string, init: { signal: AbortSignal }) => {
      first = init.signal;
      return new Promise(() => {});
    });
    mocks.suggestRemoteDomains.mockResolvedValue(["misskey.io"]);
    await type("@a@m", 150);
    expect(first?.aborted).toBe(false);
    await type("@a@mi", 150);
    expect(first?.aborted).toBe(true);
    expect(seen.handles).toEqual(["@a@misskey.io"]);
  });

  it("does nothing while the search is closed", async () => {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe query="@gargron@m" enabled={false} />
        </QueryClientProvider>,
      ),
    );
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(mocks.suggestRemoteDomains).not.toHaveBeenCalled();
    expect(seen.hold).toBe(false);
  });
});
