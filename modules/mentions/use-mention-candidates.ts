"use client";

import { useEffect, useMemo, useState } from "react";
import { searchRemoteAccounts } from "@/modules/notes/api/federation-search";
import { hiddenFromViewer } from "@/modules/notes/api/remote-safety";
import { listMentionCandidates, type MentionCandidate } from "./api/mention-candidates";

const REMOTE_MENTION_LIMIT = 3;

/** Candidates for the @name being typed; null query = not typing a mention. Stale answers are dropped. */
export function useMentionCandidates(query: string | null, enabled: boolean, remote = false) {
  const [here, setHere] = useState<MentionCandidate[]>([]);
  const [elsewhere, setElsewhere] = useState<MentionCandidate[]>([]);

  useEffect(() => {
    if (query == null || !enabled) {
      setHere([]);
      setElsewhere([]);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      listMentionCandidates(query)
        .then((found) => {
          if (alive) setHere(found);
        })
        .catch(() => {
          if (alive) setHere([]);
        });
      if (!remote) return;
      void searchRemoteAccounts(query, REMOTE_MENTION_LIMIT).then((found) => {
        if (!alive) return;
        setElsewhere(
          (found ?? [])
            .filter((account) => !hiddenFromViewer(account))
            .map((account) => ({
              userId: -account.id,
              username: account.acct,
              displayName: account.displayName,
              avatarUrl: account.avatarUrl,
              following: account.following,
              remoteId: account.id,
            })),
        );
      });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, enabled, remote]);

  return useMemo(() => [...here, ...elsewhere], [here, elsewhere]);
}
