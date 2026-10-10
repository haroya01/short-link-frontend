import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ searchPublicFeed: vi.fn() }));
vi.mock("@/modules/blog/api/public-posts", () => ({ searchPublicFeed: mocks.searchPublicFeed }));

import { useLiveSearch } from "./use-live-search";

let root: Root;
let host: HTMLDivElement;
let state: ReturnType<typeof useLiveSearch>;

function Probe({ query }: { query: string }) {
  state = useLiveSearch(query, true, 5);
  return null;
}

const item = (slug: string) => ({ slug, title: slug, tags: [], author: { username: "minji" } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
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

async function search(query: string) {
  await act(async () => root.render(<Probe query={query} />));
  await act(async () => vi.advanceTimersByTimeAsync(250));
}

describe("useLiveSearch", () => {
  it("returns the first results after the debounce", async () => {
    mocks.searchPublicFeed.mockResolvedValue({ ok: true, data: { items: [item("a"), item("b")] } });
    await search("next");
    expect(mocks.searchPublicFeed).toHaveBeenCalledWith("next", "recent", 0, 5);
    expect(state.results.map((r) => r.slug)).toEqual(["a", "b"]);
    expect(state.failed).toBe(false);
  });

  it("tells a failed request apart from no results", async () => {
    mocks.searchPublicFeed.mockRejectedValueOnce(new Error("offline"));
    await search("next");
    expect(state).toMatchObject({ results: [], loading: false, failed: true });

    mocks.searchPublicFeed.mockResolvedValueOnce({ ok: false, status: 503 });
    await search("nextjs");
    expect(state.failed).toBe(true);

    mocks.searchPublicFeed.mockResolvedValueOnce({ ok: true, data: { items: [] } });
    await search("우주선");
    expect(state).toMatchObject({ results: [], failed: false });
  });

  it("asks again on retry", async () => {
    mocks.searchPublicFeed.mockRejectedValueOnce(new Error("offline"));
    await search("next");
    mocks.searchPublicFeed.mockResolvedValueOnce({ ok: true, data: { items: [item("a")] } });
    await act(async () => state.retry());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(mocks.searchPublicFeed).toHaveBeenCalledTimes(2);
    expect(state).toMatchObject({ failed: false });
    expect(state.results).toHaveLength(1);
  });

  it("does not search an empty query", async () => {
    await search("   ");
    expect(mocks.searchPublicFeed).not.toHaveBeenCalled();
    expect(state).toMatchObject({ results: [], loading: false, failed: false });
  });
});
