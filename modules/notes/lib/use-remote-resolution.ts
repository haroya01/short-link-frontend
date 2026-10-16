"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { resolveRemote, type RemoteResolution } from "@/modules/notes/api/federation-search";
import type { RemoteAccount } from "@/modules/notes/api/notes";
import { hiddenFromViewer } from "@/modules/notes/api/remote-safety";
import { liveRemoteQueryDomain, normalizeRemoteQuery } from "@/modules/notes/lib/remote-handle";

const LIVE_RESOLVE_DELAY_MS = 450;

const resolveKey = (query: string) => ["remote", "resolve", normalizeRemoteQuery(query)] as const;

export function useRemoteResolution(query: string): RemoteResolution | null {
  const { authenticated, ready } = useAuth();
  const { data } = useQuery({
    queryKey: resolveKey(query),
    queryFn: ({ signal }) => resolveRemote(query, { signal }),
    enabled: ready && authenticated,
    staleTime: 60_000,
  });
  return ready && !authenticated ? { state: "signin" } : (data ?? null);
}

export type LiveRemoteLookup =
  | { state: "pending" }
  | { state: "account"; account: RemoteAccount }
  | { state: "missing" | "unreachable"; domain: string };

export function useLiveRemoteLookup(query: string, enabled: boolean): LiveRemoteLookup | null {
  const { authenticated, ready } = useAuth();
  const q = normalizeRemoteQuery(query);
  const wanted = enabled && ready && authenticated && liveRemoteQueryDomain(q) !== null;
  const [settled, setSettled] = useState("");
  useEffect(() => {
    if (!wanted) return;
    const id = window.setTimeout(() => setSettled(q), LIVE_RESOLVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [wanted, q]);
  const current = wanted && settled === q;
  const { data } = useQuery({
    queryKey: resolveKey(current ? q : ""),
    queryFn: ({ signal }) => resolveRemote(q, { signal }),
    enabled: current,
    staleTime: 60_000,
  });
  if (!current) return null;
  if (!data) return { state: "pending" };
  if (data.state === "account") return hiddenFromViewer(data.account) ? null : data;
  if (data.state === "missing" || data.state === "unreachable") return data;
  return null;
}
