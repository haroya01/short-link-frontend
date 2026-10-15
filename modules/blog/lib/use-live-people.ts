"use client";

import { useEffect, useState } from "react";
import { searchPeople, searchablePeopleQuery, type PersonMatch } from "@/modules/blog/api/people";
import { searchRemoteAccounts } from "@/modules/notes/api/federation-search";
import type { RemoteAccount } from "@/modules/notes/api/notes";
import { hiddenFromViewer } from "@/modules/notes/api/remote-safety";
import { remoteQueryDomain } from "@/modules/notes/lib/remote-handle";

export const LIVE_REMOTE_PEOPLE = 3;

export function useLivePeople(
  query: string,
  enabled: boolean,
  size: number,
): { people: PersonMatch[]; remote: RemoteAccount[] } {
  const [people, setPeople] = useState<PersonMatch[]>([]);
  const [remote, setRemote] = useState<RemoteAccount[]>([]);

  useEffect(() => {
    if (!enabled || !searchablePeopleQuery(query)) {
      setPeople([]);
      setRemote([]);
      return;
    }
    let live = true;
    const id = window.setTimeout(() => {
      searchPeople(query, 0, size).then(
        (page) => live && setPeople(page?.items ?? []),
        () => live && setPeople([]),
      );
      if (remoteQueryDomain(query) !== null) {
        setRemote([]);
        return;
      }
      void searchRemoteAccounts(query, LIVE_REMOTE_PEOPLE).then(
        (found) => live && setRemote((found ?? []).filter((account) => !hiddenFromViewer(account))),
      );
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [query, enabled, size]);

  return { people, remote };
}
