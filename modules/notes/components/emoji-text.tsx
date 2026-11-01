"use client";

import { useCallback, useState } from "react";
import type { NoteEmoji } from "@/modules/notes/api/notes";
import { splitNoteEmoji } from "@/modules/notes/lib/custom-emoji";

function CustomEmoji({ shortcode, url }: { shortcode: string; url: string }) {
  const [failed, setFailed] = useState(false);
  const brokenBeforeHydration = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) setFailed(true);
  }, []);
  const label = `:${shortcode}:`;
  if (failed) return <>{label}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={brokenBeforeHydration}
      src={url}
      alt={label}
      title={label}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      data-custom-emoji={shortcode}
      className="inline-block h-[1.2em] w-auto min-w-[1.2em] max-w-[3.6em] object-contain align-[-0.2em] dark:drop-shadow-[0_0_0.5px_rgb(255_255_255/0.8)]"
    />
  );
}

export function EmojiText({ text, emojis }: { text: string; emojis?: readonly NoteEmoji[] | null }) {
  if (!emojis?.length) return <>{text}</>;
  return (
    <>
      {splitNoteEmoji(text, emojis).map((part, i) =>
        part.kind === "emoji" ? (
          <CustomEmoji key={i} shortcode={part.shortcode} url={part.url} />
        ) : (
          part.value
        ),
      )}
    </>
  );
}
