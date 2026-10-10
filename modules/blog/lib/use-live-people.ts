"use client";

import { useEffect, useState } from "react";
import { searchPeople, searchablePeopleQuery, type PersonMatch } from "@/modules/blog/api/people";

export function useLivePeople(query: string, enabled: boolean, size: number): PersonMatch[] {
  const [people, setPeople] = useState<PersonMatch[]>([]);

  useEffect(() => {
    if (!enabled || !searchablePeopleQuery(query)) {
      setPeople([]);
      return;
    }
    let live = true;
    const id = window.setTimeout(async () => {
      const page = await searchPeople(query, 0, size).catch(() => null);
      if (live) setPeople(page?.items ?? []);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [query, enabled, size]);

  return people;
}
