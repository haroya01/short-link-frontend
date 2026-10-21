import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/modules/notes/api/remote-trending", () => ({ sendRemoteSeen: mocks.send }));

import { createSeenQueue, SEEN_BATCH, SEEN_DWELL_MS, SEEN_FLUSH_MS, SEEN_QUEUE_MAX } from "./remote-seen";

const uri = (n: number) => `https://qdon.space/users/a/statuses/${n}`;
const uris = (from: number, count: number) => Array.from({ length: count }, (_, i) => uri(from + i));

async function settle() {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.send.mockReset();
  mocks.send.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("the queue of other-server posts the reader has seen", () => {
  it("sends once twenty have gathered", () => {
    const queue = createSeenQueue(mocks.send);
    uris(0, SEEN_BATCH - 1).forEach(queue.add);
    expect(mocks.send).not.toHaveBeenCalled();
    queue.add(uri(99));
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith([...uris(0, SEEN_BATCH - 1), uri(99)], false);
  });

  it("sends what it has ten seconds after the first one, and not before", async () => {
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1));
    await vi.advanceTimersByTimeAsync(SEEN_FLUSH_MS / 2);
    queue.add(uri(2));
    await vi.advanceTimersByTimeAsync(SEEN_FLUSH_MS / 2 - 1);
    expect(mocks.send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.send).toHaveBeenCalledWith([uri(1), uri(2)], false);
  });

  it("never sends the same post twice in a session", async () => {
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1));
    queue.add(uri(1));
    queue.flush();
    await settle();
    queue.add(uri(1));
    queue.flush();
    expect(mocks.send.mock.calls).toEqual([[[uri(1)], false]]);
  });

  it("a flush with nothing gathered sends nothing", () => {
    createSeenQueue(mocks.send).flush(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("a batch that fails rides along with the next one once, then is let go", async () => {
    mocks.send.mockRejectedValueOnce(new Error("503")).mockRejectedValueOnce(new Error("503"));
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1));
    queue.flush();
    await settle();
    queue.add(uri(2));
    queue.flush();
    await settle();
    expect(mocks.send.mock.calls[1]).toEqual([[uri(1), uri(2)], false]);

    queue.add(uri(3));
    queue.flush();
    await settle();
    expect(mocks.send.mock.calls[2]).toEqual([[uri(2), uri(3)], false]);
  });

  it("a failed batch goes out on its own after ten seconds when nothing else comes", async () => {
    mocks.send.mockRejectedValueOnce(new Error("offline"));
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1));
    queue.flush();
    await settle();
    await vi.advanceTimersByTimeAsync(SEEN_FLUSH_MS);
    expect(mocks.send.mock.calls).toEqual([
      [[uri(1)], false],
      [[uri(1)], false],
    ]);
  });

  it("holds at most two hundred waiting to go again and drops the rest", async () => {
    const inFlight: (() => void)[] = [];
    mocks.send.mockImplementation(() => new Promise<void>((_, reject) => inFlight.push(() => reject(new Error("503")))));
    const queue = createSeenQueue(mocks.send);
    uris(0, SEEN_BATCH * 15).forEach(queue.add);
    expect(inFlight).toHaveLength(15);
    inFlight.forEach((fail) => fail());
    await settle();

    mocks.send.mockReset();
    mocks.send.mockResolvedValue(undefined);
    queue.flush();
    const batches = mocks.send.mock.calls.map(([batch]) => batch as string[]);
    expect(batches.map((batch) => batch.length)).toEqual([100, 100]);
    expect(new Set(batches.flat()).size).toBe(SEEN_QUEUE_MAX);
  });

  it("a hidden tab sends right away with keepalive", async () => {
    vi.resetModules();
    const { seenQueue } = await import("./remote-seen");
    seenQueue().add(uri(1));
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(mocks.send).toHaveBeenCalledWith([uri(1)], true);

    seenQueue().add(uri(2));
    window.dispatchEvent(new Event("pagehide"));
    expect(mocks.send).toHaveBeenLastCalledWith([uri(2)], true);
  });
});

describe("what counts as seen", () => {
  type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
  let fire: Callback;
  const observed = new Set<Element>();

  beforeEach(() => {
    observed.clear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: Callback, options: IntersectionObserverInit) {
          fire = callback;
          expect(options.threshold).toBe(0.5);
        }
        observe(el: Element) {
          observed.add(el);
        }
        unobserve(el: Element) {
          observed.delete(el);
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    vi.resetModules();
    const seen = await import("./remote-seen");
    const el = document.createElement("div");
    const stop = seen.watchSeen(el, uri(7));
    const show = (ratio: number) =>
      fire([{ target: el, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    return { seen, el, stop, show };
  }

  it("half on screen for a full second counts, once", async () => {
    const { seen, el, show } = await setup();
    show(0.6);
    await vi.advanceTimersByTimeAsync(SEEN_DWELL_MS);
    seen.seenQueue().flush();
    expect(mocks.send).toHaveBeenCalledWith([uri(7)], false);
    expect(observed.has(el)).toBe(false);
  });

  it("scrolled past in under a second does not count", async () => {
    const { seen, show } = await setup();
    show(0.6);
    await vi.advanceTimersByTimeAsync(SEEN_DWELL_MS - 1);
    show(0.2);
    await vi.advanceTimersByTimeAsync(SEEN_DWELL_MS * 5);
    seen.seenQueue().flush();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("less than half on screen never counts", async () => {
    const { seen, show } = await setup();
    show(0.4);
    await vi.advanceTimersByTimeAsync(SEEN_DWELL_MS * 5);
    seen.seenQueue().flush();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("a row that leaves the page stops being watched", async () => {
    const { seen, el, stop, show } = await setup();
    show(0.9);
    stop();
    await vi.advanceTimersByTimeAsync(SEEN_DWELL_MS * 2);
    seen.seenQueue().flush();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(observed.has(el)).toBe(false);
  });
});
