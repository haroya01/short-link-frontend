import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(public status: number) {
      super(`HTTP ${status}`);
    }
  }
  return { ApiError, request: vi.fn() };
});

vi.mock("@/lib/api/client", () => ({
  ApiError: api.ApiError,
  request: api.request,
  withBase: (path: string) => path,
}));

import { backoffDelay, openLiveScope, readsOneByOne, type LiveChange, type LiveScope } from "./live-scope";

class FakeEventSource extends EventTarget {
  static all: FakeEventSource[] = [];
  closed = false;
  onerror: (() => void) | null = null;
  constructor(public url: string) {
    super();
    FakeEventSource.all.push(this);
  }
  close() {
    this.closed = true;
  }
  emit(name: string, data: unknown, id = "") {
    this.dispatchEvent(new MessageEvent(name, { data: JSON.stringify(data), lastEventId: id }));
  }
  fail() {
    this.onerror?.();
  }
  get params() {
    return new URL(this.url, "http://x").searchParams;
  }
}

const latest = () => FakeEventSource.all[FakeEventSource.all.length - 1];
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("openLiveScope", () => {
  let scope: LiveScope | null = null;
  let known: Set<number>;
  let refresh: ReturnType<typeof vi.fn<(change: LiveChange) => Promise<unknown>>>;
  let tokens: number;

  function open(overrides: Partial<Parameters<typeof openLiveScope>[0]> = {}) {
    scope = openLiveScope({
      kind: "comments",
      id: 7,
      since: "40",
      known: (id) => known.has(id),
      refresh,
      random: () => 0,
      ...overrides,
    });
    return scope;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    FakeEventSource.all = [];
    known = new Set([40]);
    refresh = vi.fn(async () => undefined);
    tokens = 0;
    api.request.mockReset();
    api.request.mockImplementation(async () => ({ streamToken: `t${++tokens}` }));
  });

  afterEach(() => {
    scope?.stop();
    scope = null;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("trades for a scoped token and opens the stream from the newest id on screen", async () => {
    open();
    await settle();
    expect(api.request).toHaveBeenCalledWith("/api/v1/live/posts/7/comments/stream-token", { method: "POST" });
    expect(latest().url.startsWith("/api/v1/live/posts/7/comments/stream?")).toBe(true);
    expect(latest().params.get("streamToken")).toBe("t1");
    expect(latest().params.get("since")).toBe("40");
  });

  it("folds a burst of signals into one read, and skips it when everything is already on screen", async () => {
    let jitter = 0.5;
    open({ random: () => jitter });
    await settle();
    const stream = latest();
    stream.emit("ready", { cursor: "40" });
    stream.emit("changed", { items: [{ kind: "comment", id: 41 }], more: false, cursor: "41" }, "41");
    stream.emit("changed", { items: [{ kind: "comment", id: 42 }], more: false, cursor: "42" }, "42");
    await vi.advanceTimersByTimeAsync(499);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith({ ids: [41, 42], more: false });

    known.add(43);
    jitter = 0;
    stream.emit("changed", { items: [{ kind: "comment", id: 43 }], more: false, cursor: "43" }, "43");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("checks what is on screen when the read is due, not when the signal lands", async () => {
    open();
    await settle();
    latest().emit("changed", { items: [{ kind: "comment", id: 44 }], more: false, cursor: "44" });
    known.add(44);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("runs one read at a time and one more for whatever landed meanwhile", async () => {
    let release: () => void = () => {};
    refresh.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve(undefined))));
    open();
    await settle();
    const stream = latest();
    stream.emit("changed", { items: [{ kind: "comment", id: 41 }], more: false, cursor: "41" });
    await settle();
    expect(refresh).toHaveBeenCalledTimes(1);
    stream.emit("changed", { items: [{ kind: "comment", id: 42 }], more: false, cursor: "42" });
    stream.emit("changed", { items: [], more: true, cursor: "45" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenLastCalledWith({ ids: [42], more: true });
  });

  it("reconnects from the last cursor after the stream drops, waiting longer each failed try", async () => {
    open();
    await settle();
    latest().emit("ready", { cursor: "40" });
    latest().emit("changed", { items: [{ kind: "comment", id: 41 }], more: false, cursor: "41" }, "41");
    const first = latest();
    first.fail();
    expect(first.closed).toBe(true);
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeEventSource.all).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeEventSource.all).toHaveLength(2);
    expect(latest().params.get("since")).toBe("41");
    expect(latest().params.get("streamToken")).toBe("t2");

    latest().fail();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(FakeEventSource.all).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeEventSource.all).toHaveLength(3);

    latest().emit("ready", { cursor: "41" });
    latest().fail();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(FakeEventSource.all).toHaveLength(4);
  });

  it("keeps its own cursor when the server says ready, and takes the server's only when it had none", async () => {
    open();
    await settle();
    latest().emit("ready", { cursor: "99" });
    latest().fail();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(latest().params.get("since")).toBe("40");

    scope?.stop();
    open({ since: null });
    await settle();
    expect(latest().params.has("since")).toBe(false);
    latest().emit("ready", { cursor: "99" });
    latest().fail();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(latest().params.get("since")).toBe("99");
  });

  it("stops for good when the server revokes the stream", async () => {
    const onRevoked = vi.fn();
    open({ onRevoked });
    await settle();
    latest().emit("revoked", { scope: "comments", scopeId: 7 });
    expect(latest().closed).toBe(true);
    expect(onRevoked).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.all).toHaveLength(1);
  });

  it("falls back to polling for the busy window, then tries the stream again", async () => {
    open();
    await settle();
    latest().emit("busy", { retryAfterSeconds: 60 });
    expect(latest().closed).toBe(true);
    await vi.advanceTimersByTimeAsync(23_999);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(refresh).toHaveBeenCalledWith({ ids: [], more: true });
    expect(api.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(24_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(api.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.all).toHaveLength(2);
  });

  it("polls instead of streaming when the server is full", async () => {
    api.request.mockRejectedValueOnce(new api.ApiError(429));
    open();
    await settle();
    expect(FakeEventSource.all).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(24_001);
    expect(refresh).toHaveBeenCalledWith({ ids: [], more: true });
    await vi.advanceTimersByTimeAsync(36_000);
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(FakeEventSource.all).toHaveLength(1);
  });

  it.each([401, 403, 404])("goes quiet when the token answers %i, so a server without streams changes nothing", async (status) => {
    api.request.mockRejectedValueOnce(new api.ApiError(status));
    open();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.all).toHaveLength(0);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("retries a token that failed for any other reason", async () => {
    api.request.mockRejectedValueOnce(new api.ApiError(503)).mockRejectedValueOnce(new TypeError("offline"));
    open();
    await settle();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(api.request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(api.request).toHaveBeenCalledTimes(3);
    expect(FakeEventSource.all).toHaveLength(1);
  });

  it("closes while the tab is hidden and picks up from the cursor when it shows again", async () => {
    const live = open();
    await settle();
    latest().emit("changed", { items: [], more: false, cursor: "48" }, "48");
    live.pause();
    expect(latest().closed).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeEventSource.all).toHaveLength(1);
    live.resume();
    await settle();
    expect(FakeEventSource.all).toHaveLength(2);
    expect(latest().params.get("since")).toBe("48");
  });

  it("never opens a stream for a token that came back after the tab was hidden", async () => {
    let answer: (value: { streamToken: string }) => void = () => {};
    api.request.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    const live = open();
    live.pause();
    answer({ streamToken: "late" });
    await settle();
    expect(FakeEventSource.all).toHaveLength(0);
  });

  it("starts paused in a hidden tab without asking for a token", async () => {
    open({ paused: true });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(api.request).not.toHaveBeenCalled();
  });
});

describe("backoffDelay", () => {
  it("spreads each try between half and all of a doubling base, capped at 30 seconds", () => {
    expect(backoffDelay(0, () => 0)).toBe(1_000);
    expect(backoffDelay(0, () => 1)).toBe(2_000);
    expect(backoffDelay(3, () => 0)).toBe(8_000);
    expect(backoffDelay(9, () => 0)).toBe(15_000);
    expect(backoffDelay(9, () => 1)).toBe(30_000);
  });
});

describe("readsOneByOne", () => {
  it("reads a few named items one by one and anything else as one list read", () => {
    expect(readsOneByOne({ ids: [1], more: false })).toBe(true);
    expect(readsOneByOne({ ids: [1, 2, 3], more: false })).toBe(true);
    expect(readsOneByOne({ ids: [1, 2, 3, 4], more: false })).toBe(false);
    expect(readsOneByOne({ ids: [1], more: true })).toBe(false);
    expect(readsOneByOne({ ids: [], more: true })).toBe(false);
  });
});
