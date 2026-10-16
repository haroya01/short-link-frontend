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
): { people: PersonMatch[]; remote: RemoteAccount[]; remoteAnswered: boolean } {
  const [people, setPeople] = useState<PersonMatch[]>([]);
  const [remote, setRemote] = useState<RemoteAccount[]>([]);
  const [remoteAnswered, setRemoteAnswered] = useState(false);

  useEffect(() => {
    if (!enabled || !searchablePeopleQuery(query)) {
      setPeople([]);
      setRemote([]);
      setRemoteAnswered(false);
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
        setRemoteAnswered(false);
        return;
      }
      void searchRemoteAccounts(query, LIVE_REMOTE_PEOPLE).then((found) => {
        if (!live) return;
        setRemote((found ?? []).filter((account) => !hiddenFromViewer(account)));
        setRemoteAnswered(found !== null);
      });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [query, enabled, size]);

  return { people, remote, remoteAnswered };
}

export function remoteSearchHintVisible({
  query,
  answered,
  accounts,
  lookupActive,
}: {
  query: string;
  answered: boolean;
  accounts: readonly RemoteAccount[];
  lookupActive: boolean;
}): boolean {
  return (
    answered &&
    accounts.length === 0 &&
    !lookupActive &&
    searchablePeopleQuery(query) &&
    remoteQueryDomain(query) === null
  );
}
