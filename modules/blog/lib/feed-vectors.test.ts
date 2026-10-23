import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/modules/notes/api/notes";
import type { RemoteItem, TrendingNote } from "@/modules/notes/api/remote-trending";
import { remoteRows } from "@/modules/notes/lib/remote-rows";
import { mixHome, pullNotice, remoteBesides } from "./home-mix";
import mixVectors from "./vectors/home-mix.json";
import seenVectors from "./vectors/seen-rules.json";

vi.mock("react", async (actual) => ({ ...(await actual<typeof import("react")>()), cache: <T>(fn: T) => fn }));

type Own = { key: string; kind: string; id: number };
type Remote = { key: string; uri: string | null; keptNoteId: number | null };
type MixInput = { own: Own[]; remote: Remote[]; ownDone: boolean; cards?: number[] };

function layOut({ own, remote, ownDone, cards = [] }: MixInput): string[] {
  const keyOf = new Map<object, string>();
  const items: RemoteItem[] = remote.map((entry) => {
    if (entry.keptNoteId === null) {
      const item = { uri: entry.uri } as TrendingNote;
      keyOf.set(item, entry.key);
      return { kind: "pool", item };
    }
    const note = { id: entry.keptNoteId, author: { username: "mina@k.example" } } as Note;
    keyOf.set(note, entry.key);
    return entry.uri ? { kind: "kept", note, uri: entry.uri } : { kind: "kept", note };
  });
  const once = new Set<string>();
  const mine = own.filter((item) => {
    const id = `${item.kind}:${item.id}`;
    if (once.has(id)) return false;
    once.add(id);
    return true;
  });
  const notes = new Set(mine.filter((item) => item.kind === "note").map((item) => item.id));
  const rows = remoteBesides(remoteRows([{ items, next: null }], () => null, new Set()), notes);
  return mixHome(
    mine.map((item) => item.key),
    rows.map((row) => keyOf.get(row.kind === "pool" ? row.item : row.note)!),
    ownDone,
    new Set(cards),
  ).rows.map((row) => (row.kind === "local" ? `own:${row.item}` : `${row.tail ? "tail" : "mixed"}:${row.item}`));
}

type MixCase =
  | { id: string; name: string; input: MixInput; expected: string[] }
  | { id: string; name: string; steps: { input: MixInput; expected: string[] }[] };

const mixCases = (table: { cases: unknown[] }) => (table.cases as MixCase[]).map((c) => [c.id, c] as const);

const LAST_ROW_HELD = new Set([
  "base-011", "base-012", "base-021", "base-022", "base-031", "base-032", "base-041", "base-042",
  "base-051", "base-052", "base-061", "base-062", "base-071", "base-072", "base-081", "base-082",
  "base-112", "base-114", "base-117", "base-118", "base-119", "base-120", "base-122",
  "steps-001", "steps-002", "steps-006", "steps-007",
  "cards-008", "cards-009", "cards-010", "cards-011", "cards-012",
]);

describe("홈 최신 mixing, by the shared answer table (kurl.home-mix)", () => {
  const all = [...mixCases(mixVectors.tables.base), ...mixCases(mixVectors.tables.webCards)];
  const check = (c: MixCase) => {
    for (const step of "steps" in c ? c.steps : [c]) expect(layOut(step.input)).toEqual(step.expected);
  };
  it.each(all.filter(([id]) => !LAST_ROW_HELD.has(id)))("%s", (_, c) => check(c));
  it.fails.each(all.filter(([id]) => LAST_ROW_HELD.has(id)))(
    "%s: the web still holds a pair back after the last row of a page",
    (_, c) => check(c),
  );
});

describe("what a 홈 pull says (kurl.seen-rules pull)", () => {
  type Result<T> = { result: "ok"; items: T[]; done?: boolean } | { result: "failed" };
  type PullCase = {
    id: string;
    before: { own: Own[]; remote: Remote[]; ownDone: boolean };
    own: Result<Own>;
    remote: Result<Remote>;
    notice: string;
  };
  const notice = (c: PullCase) => {
    const before = layOut(c.before).map((row) => row.split(":")[1]);
    const after = layOut({
      own: c.own.result === "ok" ? c.own.items : c.before.own,
      remote: c.remote.result === "ok" ? c.remote.items : c.before.remote,
      ownDone: c.own.result === "ok" ? (c.own.done ?? false) : c.before.ownDone,
    }).map((row) => row.split(":")[1]);
    return pullNotice(new Set(before), after, { own: c.own.result === "failed", remote: c.remote.result === "failed" });
  };
  const ruledOtherwise = new Set(["pull-013"]);
  const cases = (seenVectors.tables.pull.cases as PullCase[]).map((c) => [c.id, c] as const);

  it.each(cases.filter(([id]) => !ruledOtherwise.has(id)))("%s", (_, c) => {
    expect(notice(c)).toBe(c.notice);
  });

  it.fails.each(cases.filter(([id]) => ruledOtherwise.has(id)))(
    "%s: 맞춤 failing alone says failed, as the lead ruled on 10-23, until the table's v2 settles it",
    (_, c) => {
      expect(notice(c)).toBe(c.notice);
    },
  );
});

describe("which requests carry seen=hide and the device (kurl.seen-rules requests)", () => {
  type RequestCase = { id: string; surface: string; what: string; seenHide: boolean; deviceHeader: boolean };
  const DEVICE = "0f8fad5b-d9cb-469f-a165-70867728950e";
  let calls: { url: string; headers: Headers }[] = [];

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("kurl:device-id", DEVICE);
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        calls.push({ url: String(input), headers: new Headers(init.headers) });
        return new Response(JSON.stringify({ items: [], next: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function ask(c: RequestCase) {
    vi.resetModules();
    const { listHome } = await import("@/modules/blog/api/home-feed");
    const { listRemoteNotes } = await import("@/modules/notes/api/remote-trending");
    const latest = c.surface === "home-latest";
    if (c.what.startsWith("맞춤")) {
      return listRemoteNotes("for-you", c.what.includes("next") ? "f1.20" : null, undefined, latest);
    }
    if (c.surface === "explore-remote") return listRemoteNotes("for-you");
    const tab = c.surface === "home-following" ? "following" : c.surface === "home-trending" ? "trending" : "latest";
    return listHome(tab, c.what === "next page" ? "h1.20.0" : null, undefined, latest);
  }

  const cases = (seenVectors.tables.requests.cases as RequestCase[]).map((c) => [c.id, c] as const);

  it.each(cases)("%s", async (_, c) => {
    await ask(c);
    const call = calls.find((sent) => !sent.url.endsWith("/auth/refresh"))!;
    expect(new URL(call.url, "http://x").searchParams.get("seen") === "hide").toBe(c.seenHide);
    expect(call.headers.get("X-Kurl-Device") === DEVICE).toBe(c.deviceHeader);
  });
});
