import { sendRemoteSeen, type SeenBatch, type SeenFeed } from "@/modules/notes/api/remote-trending";

export const SEEN_BATCH = 20;
export const SEEN_FLUSH_MS = 10_000;
export const SEEN_QUEUE_MAX = 200;
export const SEEN_DWELL_MS = 1_000;
export const DWELL_MAX_MS = 600_000;
const SEEN_REQUEST_MAX = 100;

type Send = (batch: SeenBatch, keepalive: boolean) => Promise<void>;

export type SeenQueue = {
  add: (uri: string, feed: SeenFeed) => void;
  dwell: (uri: string, ms: number, feed: SeenFeed) => void;
  flush: (keepalive?: boolean) => Promise<void>;
};

export function createSeenQueue(send: Send): SeenQueue {
  const reported = new Set<string>();
  const dwelt = new Map<string, number>();
  const failedOnce = new Set<string>();
  let pending: { uri: string; feed: SeenFeed }[] = [];
  const dwelling = new Map<string, { ms: number; feed: SeenFeed }>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const size = () => pending.length + dwelling.size;

  function schedule() {
    if (timer === null && size() > 0) timer = setTimeout(() => flush(), SEEN_FLUSH_MS);
  }

  function requeue(batch: SeenBatch) {
    const again: { uri: string; feed: SeenFeed }[] = [];
    for (const uri of batch.uris) {
      const key = `seen:${uri}`;
      if (failedOnce.has(key) || size() + again.length >= SEEN_QUEUE_MAX) {
        failedOnce.delete(key);
        reported.delete(uri);
      } else {
        failedOnce.add(key);
        again.push({ uri, feed: batch.feed });
      }
    }
    pending = [...again, ...pending];
    for (const { uri, ms } of batch.dwell) {
      const key = `dwell:${uri}`;
      if (failedOnce.has(key) || (!dwelling.has(uri) && size() >= SEEN_QUEUE_MAX)) {
        failedOnce.delete(key);
        if (dwelt.get(uri) === ms) dwelt.delete(uri);
      } else {
        failedOnce.add(key);
        if ((dwelling.get(uri)?.ms ?? 0) < ms) dwelling.set(uri, { ms, feed: batch.feed });
      }
    }
    schedule();
  }

  function flush(keepalive = false): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const byFeed = new Map<SeenFeed, SeenBatch>();
    const batchOf = (feed: SeenFeed) => {
      const batch = byFeed.get(feed) ?? { feed, uris: [], dwell: [] };
      byFeed.set(feed, batch);
      return batch;
    };
    for (const { uri, feed } of pending) batchOf(feed).uris.push(uri);
    for (const [uri, { ms, feed }] of dwelling) batchOf(feed).dwell.push({ uri, ms });
    pending = [];
    dwelling.clear();
    const sent: Promise<void>[] = [];
    for (const { feed, uris, dwell } of byFeed.values()) {
      for (let at = 0; at < Math.max(uris.length, dwell.length); at += SEEN_REQUEST_MAX) {
        const batch = {
          feed,
          uris: uris.slice(at, at + SEEN_REQUEST_MAX),
          dwell: dwell.slice(at, at + SEEN_REQUEST_MAX),
        };
        sent.push(
          send(batch, keepalive).then(
            () => {
              batch.uris.forEach((uri) => failedOnce.delete(`seen:${uri}`));
              batch.dwell.forEach(({ uri }) => failedOnce.delete(`dwell:${uri}`));
            },
            () => requeue(batch),
          ),
        );
      }
    }
    return Promise.all(sent).then(() => undefined);
  }

  function gathered() {
    if (size() >= SEEN_BATCH) flush();
    else schedule();
  }

  function add(uri: string, feed: SeenFeed) {
    if (reported.has(uri) || size() >= SEEN_QUEUE_MAX) return;
    reported.add(uri);
    pending.push({ uri, feed });
    gathered();
  }

  function dwell(uri: string, ms: number, feed: SeenFeed) {
    const total = Math.min(Math.round(ms), DWELL_MAX_MS);
    if (total < SEEN_DWELL_MS || (dwelt.get(uri) ?? 0) >= total) return;
    if (!dwelling.has(uri) && size() >= SEEN_QUEUE_MAX) return;
    dwelt.set(uri, total);
    dwelling.set(uri, { ms: total, feed });
    gathered();
  }

  return { add, dwell, flush };
}

let shared: SeenQueue | null = null;

export function seenQueue(): SeenQueue {
  if (shared) return shared;
  const queue = createSeenQueue(sendRemoteSeen);
  shared = queue;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void queue.flush(true);
  });
  window.addEventListener("pagehide", () => void queue.flush(true));
  return queue;
}

type KurlRow = { kind: "note" | "post"; id: number | string };
export type SeenRow = KurlRow | { kind: "remote"; uri: string | null };

export function seenKeyOf(row: KurlRow): string;
export function seenKeyOf(row: SeenRow): string | null;
export function seenKeyOf(row: SeenRow): string | null {
  return row.kind === "remote" ? row.uri : `kurl:${row.kind}:${row.id}`;
}

type Watch = {
  uri: string;
  feed: SeenFeed;
  glance: boolean;
  counted: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  since: number | null;
  total: number;
};

let observer: IntersectionObserver | null = null;
const watched = new Map<Element, Watch>();

function stopTimer(watch: Watch) {
  if (watch.timer !== null) clearTimeout(watch.timer);
  watch.timer = null;
}

function leave(watch: Watch) {
  stopTimer(watch);
  if (watch.since === null) return;
  watch.total += Date.now() - watch.since;
  watch.since = null;
  if (!watch.uri.startsWith("kurl:")) seenQueue().dwell(watch.uri, watch.total, watch.feed);
}

function count(watch: Watch) {
  if (watch.counted) return;
  watch.counted = true;
  seenQueue().add(watch.uri, watch.feed);
}

function onEntries(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const watch = watched.get(entry.target);
    if (!watch) continue;
    const visible = document.visibilityState === "visible";
    if (watch.glance && entry.isIntersecting && entry.intersectionRatio > 0 && visible) count(watch);
    if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || !visible) {
      leave(watch);
      continue;
    }
    watch.since ??= Date.now();
    if (watch.counted) continue;
    watch.timer ??= setTimeout(() => {
      watch.timer = null;
      count(watch);
    }, SEEN_DWELL_MS);
  }
}

function leaveAll() {
  if (watched.size === 0) return;
  watched.forEach(leave);
  void seenQueue().flush(true);
}

function lookAgain() {
  if (!observer) return;
  if (document.visibilityState !== "visible") {
    leaveAll();
    return;
  }
  for (const el of watched.keys()) {
    observer.unobserve(el);
    observer.observe(el);
  }
}

function unwatch(el: Element) {
  const watch = watched.get(el);
  if (!watch) return;
  leave(watch);
  watched.delete(el);
  observer?.unobserve(el);
}

export function watchSeen(el: Element, uri: string, feed: SeenFeed, glance = false): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};
  if (!observer) {
    observer = new IntersectionObserver(onEntries, { threshold: [0, 0.5] });
    document.addEventListener("visibilitychange", lookAgain);
    window.addEventListener("pagehide", leaveAll);
  }
  watched.set(el, { uri, feed, glance, counted: false, timer: null, since: null, total: 0 });
  observer.observe(el);
  return () => unwatch(el);
}
