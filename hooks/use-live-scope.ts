"use client";

import { useEffect, useRef } from "react";
import { mockLiveOn } from "@/lib/api/mock-live";
import { openLiveScope, type LiveChange, type LiveScopeKind } from "@/lib/live-scope";

const MOCKS_ON = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

type Options = {
  enabled: boolean;
  since: string | null;
  known: (id: number) => boolean;
  refresh: (change: LiveChange) => Promise<unknown>;
  onRevoked?: () => void;
};

export function useLiveScope(kind: LiveScopeKind, id: number, options: Options) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const { enabled } = options;

  useEffect(() => {
    if (!enabled || (MOCKS_ON && !mockLiveOn())) return;
    const hidden = () => document.visibilityState === "hidden";
    const scope = openLiveScope({
      kind,
      id,
      since: latest.current.since,
      known: (item) => latest.current.known(item),
      refresh: (change) => latest.current.refresh(change),
      onRevoked: () => latest.current.onRevoked?.(),
      paused: hidden(),
    });
    const onVisibility = () => (hidden() ? scope.pause() : scope.resume());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      scope.stop();
    };
  }, [kind, id, enabled]);
}
