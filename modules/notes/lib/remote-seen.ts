import { sendRemoteSeen } from "@/modules/notes/api/remote-trending";

export const SEEN_BATCH = 20;
export const SEEN_FLUSH_MS = 10_000;
export const SEEN_QUEUE_MAX = 200;
export const SEEN_DWELL_MS = 1_000;
const SEEN_REQUEST_MAX = 100;

type Send = (uris: string[], keepalive: boolean) => Promise<void>;

export type SeenQueue = { add: (uri: string) => void; flush: (keepalive?: boolean) => void };

export function createSeenQueue(send: Send): SeenQueue {
  const reported = new Set<string>();
  const failedOnce = new Set<string>();
  let pending: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timer === null && pending.length > 0) timer = setTimeout(() => flush(), SEEN_FLUSH_MS);
  }

  function requeue(batch: string[]) {
    const again: string[] = [];
    for (const uri of batch) {
      if (failedOnce.has(uri) || pending.length + again.length >= SEEN_QUEUE_MAX) {
        failedOnce.delete(uri);
        reported.delete(uri);
      } else {
        failedOnce.add(uri);
        again.push(uri);
      }
    }
    pending = [...again, ...pending];
    schedule();
  }

  function flush(keepalive = false) {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    while (pending.length > 0) {
      const batch = pending.splice(0, SEEN_REQUEST_MAX);
      send(batch, keepalive).then(
        () => batch.forEach((uri) => failedOnce.delete(uri)),
        () => requeue(batch),
      );
    }
  }

  function add(uri: string) {
    if (reported.has(uri) || pending.length >= SEEN_QUEUE_MAX) return;
    reported.add(uri);
    pending.push(uri);
    if (pending.length >= SEEN_BATCH) flush();
    else schedule();
  }

  return { add, flush };
}

let shared: SeenQueue | null = null;

export function seenQueue(): SeenQueue {
  if (shared) return shared;
  const queue = createSeenQueue(sendRemoteSeen);
  shared = queue;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") queue.flush(true);
  });
  window.addEventListener("pagehide", () => queue.flush(true));
  return queue;
}

type Watch = { uri: string; timer: ReturnType<typeof setTimeout> | null };

let observer: IntersectionObserver | null = null;
const watched = new Map<Element, Watch>();

function stopTimer(watch: Watch) {
  if (watch.timer !== null) clearTimeout(watch.timer);
  watch.timer = null;
}

function onEntries(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const watch = watched.get(entry.target);
    if (!watch) continue;
    if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || document.visibilityState !== "visible") {
      stopTimer(watch);
      continue;
    }
    watch.timer ??= setTimeout(() => {
      watch.timer = null;
      unwatch(entry.target);
      seenQueue().add(watch.uri);
    }, SEEN_DWELL_MS);
  }
}

function lookAgain() {
  if (!observer) return;
  for (const [el, watch] of watched) {
    stopTimer(watch);
    observer.unobserve(el);
    if (document.visibilityState === "visible") observer.observe(el);
  }
}

function unwatch(el: Element) {
  const watch = watched.get(el);
  if (!watch) return;
  stopTimer(watch);
  watched.delete(el);
  observer?.unobserve(el);
}

export function watchSeen(el: Element, uri: string): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {};
  if (!observer) {
    observer = new IntersectionObserver(onEntries, { threshold: 0.5 });
    document.addEventListener("visibilitychange", lookAgain);
  }
  watched.set(el, { uri, timer: null });
  observer.observe(el);
  return () => unwatch(el);
}
