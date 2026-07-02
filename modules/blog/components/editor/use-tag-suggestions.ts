"use client";

import { useEffect, useState } from "react";
import { useTagPrefs } from "@/modules/blog/lib/use-tag-prefs";
import { listPopularTags } from "@/modules/blog/api/public-posts";

/**
 * One-tap tag suggestions for the write flow: the author's followed tags first (the topics they already
 * care about), then the most-used published tags — merged with a case-insensitive dedupe so a followed
 * tag never repeats lower down. Popular tags load once; a fetch failure just leaves the followed set
 * (suggestions are an assist, never a blocker). Shared by the publish dialog and the canvas tags line.
 */
export function useTagSuggestions(limit = 40): string[] {
  const { prefs } = useTagPrefs();
  const [popular, setPopular] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    listPopularTags(limit)
      .then((r) => {
        if (active && r.ok) setPopular(r.data.map((tc) => tc.tag));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [limit]);

  // Defensive: a malformed tag-prefs payload could leave `followed` non-array; never spread undefined.
  const followed = Array.isArray(prefs.followed) ? prefs.followed : [];
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const tag of [...followed, ...popular]) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(tag);
  }
  return merged;
}
