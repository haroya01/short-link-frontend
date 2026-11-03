import { ApiError, request, withBase } from "@/lib/api/client";

export type LiveScopeKind = "note" | "comments" | "room";

export type LiveChange = { ids: number[]; more: boolean };

type LiveScopeOptions = {
  kind: LiveScopeKind;
  id: number;
  since: string | null;
  known: (id: number) => boolean;
  refresh: (change: LiveChange) => Promise<unknown>;
  onRevoked?: () => void;
  paused?: boolean;
  random?: () => number;
};

export type LiveScope = { pause(): void; resume(): void; stop(): void };

const BACKOFF_FIRST_MS = 2_000;
const BACKOFF_MAX_MS = 30_000;
const COOLDOWN_MS = 60_000;
const POLL_MS = 30_000;
const COALESCE_MS = 1_000;

const ONE_BY_ONE_MAX = 3;

export function readsOneByOne(change: LiveChange): boolean {
  return !change.more && change.ids.length > 0 && change.ids.length <= ONE_BY_ONE_MAX;
}

function liveScopePath(kind: LiveScopeKind, id: number): string {
  if (kind === "note") return `/api/v1/live/notes/${id}`;
  if (kind === "room") return `/api/v1/live/rooms/${id}`;
  return `/api/v1/live/posts/${id}/comments`;
}

export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(BACKOFF_MAX_MS, BACKOFF_FIRST_MS * 2 ** attempt);
  return base / 2 + random() * (base / 2);
}

function parse(event: Event): Record<string, unknown> | null {
  try {
    const data = JSON.parse((event as MessageEvent).data);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

export function openLiveScope(options: LiveScopeOptions): LiveScope {
  const random = options.random ?? Math.random;
  const path = liveScopePath(options.kind, options.id);
  let cursor = options.since;
  let es: EventSource | null = null;
  let attempt = 0;
  let generation = 0;
  let stopped = false;
  let paused = options.paused === true;
  let pollUntil = 0;
  let wake: ReturnType<typeof setTimeout> | null = null;
  let pendingIds = new Set<number>();
  let pendingMore = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushing = false;

  function close() {
    generation += 1;
    es?.close();
    es = null;
    if (wake) clearTimeout(wake);
    wake = null;
  }

  function finish() {
    stopped = true;
    close();
  }

  function later(ms: number, run: () => void) {
    if (wake) clearTimeout(wake);
    wake = setTimeout(() => {
      wake = null;
      run();
    }, ms);
  }

  function retry() {
    close();
    later(backoffDelay(attempt, random), () => void connect());
    attempt += 1;
  }

  function cool(ms: number) {
    close();
    pollUntil = Date.now() + ms;
    poll();
  }

  function poll() {
    const left = pollUntil - Date.now();
    if (left <= 0) {
      pollUntil = 0;
      void connect();
      return;
    }
    const next = POLL_MS * (0.8 + random() * 0.4);
    if (next >= left) {
      later(left, () => {
        pollUntil = 0;
        void connect();
      });
      return;
    }
    later(next, () => {
      ingest([], true);
      poll();
    });
  }

  function ingest(ids: number[], more: boolean) {
    ids.forEach((id) => pendingIds.add(id));
    pendingMore = pendingMore || more;
    if (flushTimer || flushing) return;
    flushTimer = setTimeout(() => void flush(), random() * COALESCE_MS);
  }

  async function flush() {
    flushTimer = null;
    const ids = [...pendingIds].filter((id) => !options.known(id));
    const more = pendingMore;
    pendingIds = new Set();
    pendingMore = false;
    if (stopped || (!more && ids.length === 0)) return;
    flushing = true;
    await Promise.resolve()
      .then(() => options.refresh({ ids, more }))
      .catch(() => undefined);
    flushing = false;
    if (!stopped && (pendingMore || pendingIds.size > 0)) {
      flushTimer = setTimeout(() => void flush(), random() * COALESCE_MS);
    }
  }

  async function connect() {
    if (stopped || paused) return;
    close();
    if (Date.now() < pollUntil) {
      ingest([], true);
      poll();
      return;
    }
    const mine = generation;
    let token: string;
    try {
      token = (await request<{ streamToken: string }>(`${path}/stream-token`, { method: "POST" })).streamToken;
    } catch (error) {
      if (mine !== generation || stopped || paused) return;
      if (error instanceof ApiError && error.status === 429) return cool(COOLDOWN_MS);
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return finish();
      return retry();
    }
    if (mine !== generation || stopped || paused) return;
    const query = new URLSearchParams({ streamToken: token });
    if (cursor) query.set("since", cursor);
    const source = new EventSource(`${withBase(`${path}/stream`)}?${query}`);
    es = source;
    source.addEventListener("ready", (event) => {
      if (es !== source) return;
      attempt = 0;
      const data = parse(event);
      if (cursor === null && typeof data?.cursor === "string") cursor = data.cursor;
    });
    source.addEventListener("changed", (event) => {
      if (es !== source) return;
      const data = parse(event);
      if (!data) return;
      const next = typeof data.cursor === "string" ? data.cursor : (event as MessageEvent).lastEventId;
      if (next) cursor = next;
      const items = Array.isArray(data.items) ? (data.items as { id?: unknown }[]) : [];
      ingest(
        items.flatMap((item) => (typeof item?.id === "number" ? [item.id] : [])),
        data.more === true,
      );
    });
    source.addEventListener("revoked", () => {
      if (es !== source) return;
      finish();
      options.onRevoked?.();
    });
    source.addEventListener("busy", (event) => {
      if (es !== source) return;
      const seconds = Number(parse(event)?.retryAfterSeconds);
      cool(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : COOLDOWN_MS);
    });
    source.onerror = () => {
      if (es !== source) return;
      retry();
    };
  }

  void connect();

  return {
    pause() {
      if (stopped || paused) return;
      paused = true;
      close();
    },
    resume() {
      if (stopped || !paused) return;
      paused = false;
      attempt = 0;
      void connect();
    },
    stop() {
      finish();
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = null;
    },
  };
}
