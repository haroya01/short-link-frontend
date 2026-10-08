"use client";

import { useEffect, useState } from "react";
import { listMentionCandidates, type MentionCandidate } from "./mention-candidates";

/** Candidates for the @name being typed; null query = not typing a mention. Stale answers are dropped. */
export function useMentionCandidates(query: string | null, enabled: boolean) {
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);

  useEffect(() => {
    if (query == null || !enabled) {
      setCandidates([]);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      listMentionCandidates(query)
        .then((found) => {
          if (alive) setCandidates(found);
        })
        .catch(() => {
          if (alive) setCandidates([]);
        });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, enabled]);

  return candidates;
}
