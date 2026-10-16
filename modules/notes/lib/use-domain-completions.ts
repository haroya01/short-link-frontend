"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { suggestRemoteDomains } from "@/modules/notes/api/federation-search";
import { handleBeingTyped } from "@/modules/notes/lib/remote-handle";

const COMPLETION_DELAY_MS = 150;

export interface DomainCompletions {
  handles: string[];
  active: boolean;
  hold: boolean;
}

export function useDomainCompletions(query: string, enabled: boolean): DomainCompletions {
  const typing = enabled ? handleBeingTyped(query) : null;
  const domain = typing?.domain ?? null;
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (domain === null) return;
    const id = window.setTimeout(() => setSettled(domain), COMPLETION_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [domain]);
  const current = domain !== null && settled === domain;
  const { data } = useQuery({
    queryKey: ["federation", "domains", current ? domain : null],
    queryFn: ({ signal }) => suggestRemoteDomains(domain ?? "", { signal }),
    enabled: current,
    staleTime: 60_000,
  });

  if (!typing) return { handles: [], active: false, hold: false };
  if (!current || data === undefined) return { handles: [], active: true, hold: true };
  if (data === null || data.length === 0 || data.includes(typing.domain)) {
    return { handles: [], active: true, hold: false };
  }
  return { handles: data.map((found) => `@${typing.user}@${found}`), active: true, hold: true };
}
