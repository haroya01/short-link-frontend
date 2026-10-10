"use client";

import { useMemo, useState } from "react";
import { splitNoteText, type NoteTextPart } from "@/modules/notes/lib/note-text";
import { translatableTexts, withTranslatedTexts } from "./note-parts";
import { useInPlaceTranslation, useTranslationSource } from "./use-in-place-translation";

export function useNoteTranslation({
  id,
  body,
  mentions,
  contentWarning,
  language,
  enabled,
}: {
  id: number;
  body: string;
  mentions?: readonly string[];
  contentWarning?: string | null;
  language?: string | null;
  enabled: boolean;
}) {
  const parts = useMemo(() => splitNoteText(body, mentions ?? []), [body, mentions]);
  const source = useTranslationSource({ declared: language, text: body, enabled: enabled && body.trim() !== "" });
  const [shown, setShown] = useState<{ parts: NoteTextPart[]; warning: string | null } | null>(null);
  const translation = useInPlaceTranslation({
    source,
    cacheKey: `note:${id}:${contentWarning ?? ""}:${body}`,
    texts: () => [...(contentWarning ? [contentWarning] : []), ...translatableTexts(parts)],
    onTranslated: (translated) => {
      const next = withTranslatedTexts(parts, contentWarning ? translated.slice(1) : translated);
      if (!next) throw new Error("translation count mismatch");
      setShown({ parts: next, warning: contentWarning ? translated[0] : null });
    },
    onOriginal: () => setShown(null),
  });
  return { source, translation, shown };
}
