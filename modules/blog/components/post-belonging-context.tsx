"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  listPublicPostCollectionsBatch,
  type CollectionSummary,
} from "@/modules/blog/api/collections";
import { onBelongingChanged } from "@/modules/blog/lib/consequence-events";

/**
 * The feed's "속함" batch resolver — the single fix for the per-card N+1.
 *
 * Every {@link PostBelongingLine} registers its postId once its card scrolls into view (kept lazy via
 * IntersectionObserver at the call site). This provider collects those ids across a microtask window
 * and fires ONE {@link listPublicPostCollectionsBatch} request for the whole burst (the API chunks at
 * 50), then hands each card back its membership. So a viewport of N cards costs one request, not N —
 * and off-screen cards still cost nothing until they're scrolled to (the next batch picks them up).
 *
 * Placed inside {@link DiscoveryGrid}, so every grid feed (recent / following / for-you / series)
 * inherits it with no per-feed wiring. A belonging line rendered outside a provider degrades to
 * "unknown" (renders nothing) rather than falling back to a per-post fetch.
 */

/** A post's membership once resolved: the collection list (possibly empty), or `undefined` while it
 *  hasn't been requested/answered yet. */
type Membership = CollectionSummary[] | undefined;

interface BelongingContextValue {
  /** Called by a belonging line when its card enters the viewport — queues the id for the next batch. */
  register: (postId: number) => void;
  /** The resolved membership for a post (`undefined` until the batch answers). */
  get: (postId: number) => Membership;
}

const BelongingContext = createContext<BelongingContextValue | null>(null);

export function BelongingProvider({ children }: { children: ReactNode }) {
  // Resolved membership per post. A key present with `[]` = "asked, belongs to nothing" (line stays
  // hidden); absent = "not yet asked". Kept in state so a resolved batch re-renders the lines.
  const [resolved, setResolved] = useState<Map<number, CollectionSummary[]>>(() => new Map());
  // Ids seen this session — asked, in-flight, or resolved — so we never re-request the same post.
  const requested = useRef<Set<number>>(new Set());
  // Ids registered since the last flush, waiting to go out as one batch.
  const pending = useRef<Set<number>>(new Set());
  const flushHandle = useRef<number | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (flushHandle.current != null) {
        window.clearTimeout(flushHandle.current);
        flushHandle.current = null;
      }
    };
  }, []);

  const flush = useCallback(() => {
    flushHandle.current = null;
    const ids = Array.from(pending.current);
    pending.current.clear();
    if (ids.length === 0) return;
    // Mark in-flight up front so a second register in the same tick can't double-request.
    for (const id of ids) requested.current.add(id);

    listPublicPostCollectionsBatch(ids)
      .then((views) => {
        if (!alive.current) return;
        setResolved((prev) => {
          const next = new Map(prev);
          const answered = new Set<number>();
          for (const view of views) {
            next.set(view.postId, view.collections);
            answered.add(view.postId);
          }
          // Any requested id the server didn't echo → treat as empty membership (line stays hidden),
          // so a card never spins waiting on an id that will never come back.
          for (const id of ids) if (!answered.has(id)) next.set(id, []);
          return next;
        });
      })
      .catch(() => {
        if (!alive.current) return;
        // A rejected batch degrades to empty membership for its ids — belonging lines just don't show.
        setResolved((prev) => {
          const next = new Map(prev);
          for (const id of ids) if (!next.has(id)) next.set(id, []);
          return next;
        });
      });
  }, []);

  const register = useCallback(
    (postId: number) => {
      if (!Number.isFinite(postId)) return;
      if (requested.current.has(postId) || pending.current.has(postId)) return;
      pending.current.add(postId);
      // Coalesce a burst of near-simultaneous in-view registers (a viewport-worth of cards) into one
      // request. A short timeout (not a microtask) lets the whole first screen's IntersectionObserver
      // callbacks land before the batch fires; later scroll bursts form their own batches.
      if (flushHandle.current == null) {
        flushHandle.current = window.setTimeout(flush, 60);
      }
    },
    [flush],
  );

  // Membership just changed for a post (a connect/disconnect elsewhere — the sheet fires the event).
  // Forget its cached answer + "already asked" mark, then re-register so the next flush re-fetches it.
  // Only touches a post the provider already resolved (in `requested`), so an unrelated feed's event is
  // a cheap no-op. This is what keeps a feed's 담김 line in step with the sheet's badge in one session.
  useEffect(() => {
    return onBelongingChanged((postId) => {
      if (!requested.current.has(postId)) return;
      requested.current.delete(postId);
      setResolved((prev) => {
        if (!prev.has(postId)) return prev;
        const next = new Map(prev);
        next.delete(postId);
        return next;
      });
      register(postId);
    });
  }, [register]);

  const get = useCallback((postId: number) => resolved.get(postId), [resolved]);

  const value = useMemo<BelongingContextValue>(() => ({ register, get }), [register, get]);

  return <BelongingContext.Provider value={value}>{children}</BelongingContext.Provider>;
}

/** Read a post's "속함" membership from the nearest {@link BelongingProvider}, registering it for the
 *  next batch when `enabled` (i.e. the card is in view). Returns `undefined` while unresolved / outside
 *  a provider — the belonging line renders nothing until real membership arrives. */
export function usePostBelonging(postId: number, enabled: boolean): Membership {
  const ctx = useContext(BelongingContext);

  useEffect(() => {
    if (!ctx || !enabled) return;
    ctx.register(postId);
  }, [ctx, enabled, postId]);

  return ctx?.get(postId);
}
