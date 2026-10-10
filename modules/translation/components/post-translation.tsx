"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { preparePostTranslation } from "@/modules/translation/lib/post-dom";
import { setPostTranslated } from "@/modules/translation/lib/post-translated";
import { primaryLanguage } from "@/modules/translation/lib/on-device";
import { useInPlaceTranslation, useTranslationSource } from "@/modules/translation/lib/use-in-place-translation";
import { TranslateLine } from "./translate-line";

export function PostTranslation({ postId, languageTag, title }: { postId: number; languageTag: string; title: string }) {
  const locale = useLocale();
  const source = useTranslationSource({ declared: languageTag, text: title });
  const prepared = useRef<ReturnType<typeof preparePostTranslation> | null>(null);
  const restore = useRef<(() => void) | null>(null);

  const translation = useInPlaceTranslation({
    source,
    cacheKey: `post:${postId}`,
    texts: () => {
      const article = document.querySelector<HTMLElement>(`article[data-bhv-post="${postId}"]`);
      prepared.current = preparePostTranslation(
        article?.querySelector<HTMLElement>("[data-post-title]") ?? null,
        article?.querySelector<HTMLElement>(".prose-post") ?? null,
      );
      return prepared.current.texts;
    },
    onTranslated: (translated) => {
      if (!prepared.current) throw new Error("nothing prepared");
      restore.current?.();
      restore.current = prepared.current.apply(translated, primaryLanguage(locale));
      setPostTranslated(true);
    },
    onOriginal: () => {
      restore.current?.();
      restore.current = null;
      setPostTranslated(false);
    },
  });

  useEffect(
    () => () => {
      restore.current?.();
      setPostTranslated(false);
    },
    [],
  );

  if (!source) return null;
  return (
    <TranslateLine
      source={source}
      state={translation.state}
      progress={translation.progress}
      onTranslate={() => void translation.translate()}
      onShowOriginal={translation.showOriginal}
      writtenIn
      className="mt-4"
    />
  );
}
