import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/modules/notes/api/remote-trending", () => ({ sendRemoteSeen: mocks.send }));

import { createSeenQueue, DWELL_MAX_MS, SEEN_BATCH, SEEN_DWELL_MS, SEEN_FLUSH_MS, SEEN_QUEUE_MAX } from "./remote-seen";

const uri = (n: number) => `https://qdon.space/users/a/statuses/${n}`;
const uris = (from: number, count: number) => Array.from({ length: count }, (_, i) => uri(from + i));
const batch = (sent: string[], feed = "latest", dwell: { uri: string; ms: number }[] = []) => ({ feed, uris: sent, dwell });
const add = (queue: { add: (uri: string, feed: "latest") => void }) => (sent: string) => queue.add(sent, "latest");

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
    uris(0, SEEN_BATCH - 1).forEach(add(queue));
    expect(mocks.send).not.toHaveBeenCalled();
    queue.add(uri(99), "latest");
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(batch([...uris(0, SEEN_BATCH - 1), uri(99)]), false);
  });

  it("sends what it has ten seconds after the first one, and not before", async () => {
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1), "latest");
    await vi.advanceTimersByTimeAsync(SEEN_FLUSH_MS / 2);
    queue.add(uri(2), "latest");
    await vi.advanceTimersByTimeAsync(SEEN_FLUSH_MS / 2 - 1);
    expect(mocks.send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.send).toHaveBeenCalledWith(batch([uri(1), uri(2)]), false);
  });

  it("never sends the same post twice in a session", async () => {
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1), "latest");
    queue.add(uri(1), "for-you");
    queue.flush();
    await settle();
    queue.add(uri(1), "latest");
    queue.flush();
    expect(mocks.send.mock.calls).toEqual([[batch([uri(1)]), false]]);
  });

  it("a flush with nothing gathered sends nothing", () => {
    createSeenQueue(mocks.send).flush(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("a batch that fails rides along with the next one once, then is let go", async () => {
    mocks.send.mockRejectedValueOnce(new Error("503")).mockRejectedValueOnce(new Error("503"));
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1), "latest");
    queue.flush();
    await settle();
    queue.add(uri(2), "latest");
    queue.flush();
    await settle();
    expect(mocks.send.mock.calls[1]).toEqual([batch([uri(1), uri(2)]), false]);

    queue.add(uri(3), "latest");
    queue.flush();
    await settle();
    expect(mocks.send.mock.calls[2]).toEqual([batch([uri(2), uri(3)]), false]);
  });

  it("a failed batch goes out on its own after ten seconds when nothing else comes", async () => {
    mocks.send.mockRejectedValueOnce(new Error("offline"));
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1), "latest");
    queue.flush();
    await settle();
    await vi.advanceTimersByTimeAsync(SEEN_FLUSH_MS);
    expect(mocks.send.mock.calls).toEqual([
      [batch([uri(1)]), false],
      [batch([uri(1)]), false],
    ]);
  });

  it("holds at most two hundred waiting to go again and drops the rest", async () => {
    const inFlight: (() => void)[] = [];
    mocks.send.mockImplementation(() => new Promise<void>((_, reject) => inFlight.push(() => reject(new Error("503")))));
    const queue = createSeenQueue(mocks.send);
    uris(0, SEEN_BATCH * 15).forEach(add(queue));
    expect(inFlight).toHaveLength(15);
    inFlight.forEach((fail) => fail());
    await settle();

    mocks.send.mockReset();
    mocks.send.mockResolvedValue(undefined);
    queue.flush();
    const batches = mocks.send.mock.calls.map(([sent]) => (sent as { uris: string[] }).uris);
    expect(batches.map((batch) => batch.length)).toEqual([100, 100]);
    expect(new Set(batches.flat()).size).toBe(SEEN_QUEUE_MAX);
  });

  it("sends each feed's posts in its own request, so every request names one feed", () => {
    const queue = createSeenQueue(mocks.send);
    queue.add(uri(1), "latest");
    queue.add(uri(2), "for-you");
    queue.add(uri(3), "latest");
    queue.flush();
    expect(mocks.send.mock.calls).toEqual([
      [batch([uri(1), uri(3)]), false],
      [batch([uri(2)], "for-you"), false],
    ]);
  });

  it("carries how long a post stayed on screen, from one second up to ten minutes", () => {
    const queue = createSeenQueue(mocks.send);
    queue.dwell(uri(1), SEEN_DWELL_MS - 1, "for-you");
    queue.dwell(uri(2), 4_200.4, "for-you");
    queue.dwell(uri(3), DWELL_MAX_MS * 3, "for-you");
    queue.flush();
    expect(mocks.send.mock.calls).toEqual([
      [
        batch([], "for-you", [
          { uri: uri(2), ms: 4_200 },
          { uri: uri(3), ms: DWELL_MAX_MS },
        ]),
        false,
      ],
    ]);
  });

  it("sends a post's time again only once it has grown, and keeps the longest while waiting", async () => {
    const queue = createSeenQueue(mocks.send);
    queue.dwell(uri(1), 2_000, "for-you");
    queue.dwell(uri(1), 5_000, "for-you");
    queue.dwell(uri(1), 3_000, "for-you");
    queue.flush();
    await settle();
    queue.dwell(uri(1), 5_000, "for-you");
    queue.flush();
    queue.dwell(uri(1), 9_000, "for-you");
    queue.flush();
    expect(mocks.send.mock.calls).toEqual([
      [batch([], "for-you", [{ uri: uri(1), ms: 5_000 }]), false],
      [batch([], "for-you", [{ uri: uri(1), ms: 9_000 }]), false],
    ]);
  });

  it("counts times toward the twenty that send a batch", () => {
    const queue = createSeenQueue(mocks.send);
    uris(0, SEEN_BATCH - 1).forEach(add(queue));
    queue.dwell(uri(0), 1_500, "latest");
    expect(mocks.send).toHaveBeenCalledWith(batch(uris(0, SEEN_BATCH - 1), "latest", [{ uri: uri(0), ms: 1_500 }]), false);
  });

  it("a time that fails rides along with the next batch once, then is let go", async () => {
    mocks.send.mockRejectedValueOnce(new Error("503")).mockRejectedValueOnce(new Error("503"));
    const queue = createSeenQueue(mocks.send);
    queue.dwell(uri(1), 2_000, "for-you");
    queue.flush();
    await settle();
    queue.flush();
    await settle();
    queue.flush();
    expect(mocks.send.mock.calls).toEqual([
      [batch([], "for-you", [{ uri: uri(1), ms: 2_000 }]), false],
      [batch([], "for-you", [{ uri: uri(1), ms: 2_000 }]), false],
    ]);
    queue.dwell(uri(1), 2_000, "for-you");
    queue.flush();
    expect(mocks.send).toHaveBeenCalledTimes(3);
  });

  it("a hidden tab sends right away with keepalive", async () => {
    vi.resetModules();
    const { seenQueue } = await import("./remote-seen");
    seenQueue().add(uri(1), "latest");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(mocks.send).toHaveBeenCalledWith(batch([uri(1)]), true);

    seenQueue().add(uri(2), "latest");
    window.dispatchEvent(new Event("pagehide"));
    expect(mocks.send).toHaveBeenLastCalledWith(batch([uri(2)]), true);
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
  const stops: (() => void)[] = [];
  afterEach(() => {
    stops.splice(0).forEach((stop) => stop());
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    vi.unstubAllGlobals();
  });

  async function setup() {
    vi.resetModules();
    const seen = await import("./remote-seen");
    const el = document.createElement("div");
    const stop = seen.watchSeen(el, uri(7), "for-you");
    stops.push(stop);
    const show = (ratio: number) =>
      fire([{ target: el, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
    return { seen, el, stop, show };
  }

  it("half on screen for a full second counts, once", async () => {
    const { seen, el, show } = await setup();
    show(0.6);
    await vi.advanceTimersByTimeAsync(SEEN_DWELL_MS);
    seen.seenQueue().flush();
    expect(mocks.send).toHaveBeenCalledWith(batch([uri(7)], "for-you"), false);
    expect(observed.has(el)).toBe(true);
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

  it("adds up the time spent half on screen, across visits, and sends it with the feed", async () => {
    const { seen, stop, show } = await setup();
    show(0.6);
    await vi.advanceTimersByTimeAsync(2_000);
    show(0.3);
    await vi.advanceTimersByTimeAsync(2_000);
    show(1);
    await vi.advanceTimersByTimeAsync(3_000);
    stop();
    seen.seenQueue().flush();
    expect(mocks.send.mock.calls).toEqual([[batch([uri(7)], "for-you", [{ uri: uri(7), ms: 5_000 }]), false]]);
  });

  it("a tab going to the background ends the visit and sends its time at once", async () => {
    const { show } = await setup();
    show(0.8);
    await vi.advanceTimersByTimeAsync(1_200);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    expect(mocks.send.mock.calls).toEqual([[batch([uri(7)], "for-you", [{ uri: uri(7), ms: 1_200 }]), true]]);
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
