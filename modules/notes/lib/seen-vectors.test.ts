import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import vectors from "@/modules/blog/lib/vectors/seen-rules.json";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/modules/notes/api/remote-trending", () => ({ sendRemoteSeen: mocks.send }));

type Entry = Partial<IntersectionObserverEntry>;
type Sent = { feed: string; uris: string[]; dwell: { uri: string; ms: number }[] };

let fire: (entries: Entry[]) => void = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  mocks.send.mockReset();
  mocks.send.mockResolvedValue(undefined);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: Entry[]) => void) {
        fire = callback;
      }
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setActive(true);
});

function setActive(active: boolean) {
  Object.defineProperty(document, "visibilityState", { value: active ? "visible" : "hidden", configurable: true });
}

async function reporter() {
  vi.resetModules();
  return import("./remote-seen");
}

const sent = () => mocks.send.mock.calls.map(([batch]) => batch as Sent);

describe("the key a row is reported by (kurl.seen-rules keyFormat)", () => {
  type KeyCase = { id: string; row: { kind: "note" | "post"; id: string } | { kind: "remote"; uri: string | null }; key: string | null };
  const cases = (vectors.tables.keyFormat.cases as KeyCase[]).map((c) => [c.id, c] as const);

  it.each(cases)("%s", async (_, c) => {
    const { seenKeyOf } = await reporter();
    expect(seenKeyOf(c.row)).toBe(c.key);
  });
});

describe("what counts as seen on each surface (kurl.seen-rules exposure)", () => {
  type ExposureCase = {
    id: string;
    surface: "home-for-you" | "explore-remote" | "home-following";
    visibleRatio: number;
    visibleMs: number;
    appActive: boolean;
    counted: boolean;
  };
  const cases = (vectors.tables.exposure.cases as ExposureCase[]).map((c) => [c.id, c] as const);
  const KEY = "https://a.example/s/1";

  it.each(cases)("%s", async (_, c) => {
    const seen = await reporter();
    const el = document.createElement("div");
    if (c.surface === "home-for-you") seen.watchSeen(el, KEY, "for-you", true);
    if (c.surface === "explore-remote") seen.watchSeen(el, KEY, "for-you");
    setActive(c.appActive);
    fire([{ target: el, isIntersecting: c.visibleRatio > 0, intersectionRatio: c.visibleRatio }]);
    await vi.advanceTimersByTimeAsync(c.visibleMs);
    fire([{ target: el, isIntersecting: false, intersectionRatio: 0 }]);
    await seen.seenQueue().flush();
    expect(sent().some((batch) => batch.uris.includes(KEY))).toBe(c.counted);
  });

  it("a row whose edge only touches the screen is not on it", async () => {
    const seen = await reporter();
    const el = document.createElement("div");
    seen.watchSeen(el, KEY, "for-you", true);
    fire([{ target: el, isIntersecting: true, intersectionRatio: 0 }]);
    await seen.seenQueue().flush();
    expect(sent()).toEqual([]);
  });
});

describe("the time on screen that goes with a key (kurl.seen-rules dwell)", () => {
  type DwellCase = { id: string; key: string; totalMs: number; sentMs: number | null };
  const cases = (vectors.tables.dwell.cases as DwellCase[]).map((c) => [c.id, c] as const);

  it.each(cases)("%s", async (_, c) => {
    const seen = await reporter();
    const el = document.createElement("div");
    seen.watchSeen(el, c.key, "for-you");
    fire([{ target: el, isIntersecting: true, intersectionRatio: 1 }]);
    await vi.advanceTimersByTimeAsync(c.totalMs);
    fire([{ target: el, isIntersecting: false, intersectionRatio: 0 }]);
    await seen.seenQueue().flush();
    const dwell = sent().flatMap((batch) => batch.dwell).find((entry) => entry.uri === c.key);
    expect(dwell?.ms ?? null).toBe(c.sentMs);
  });
});
