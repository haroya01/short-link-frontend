"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NoteMedia as NoteImage } from "@/modules/notes/api/notes";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "@/app/[locale]/u/[username]/_components/photo-lightbox";

export function NoteMedia({ media }: { media: NoteImage[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  if (media.length === 0) return null;
  const viewer =
    viewing !== null ? (
      <PhotoLightbox images={media.map((image) => image.url)} initialIdx={viewing} onClose={() => setViewing(null)} />
    ) : null;
  if (media.length === 1) {
    return (
      <div className="mt-2.5">
        <NoteImageFrame image={media[0]} className="max-h-[430px] max-w-full" onOpen={() => setViewing(0)} />
        {viewer}
      </div>
    );
  }
  return (
    <>
      <NoteImageStrip media={media} onOpen={setViewing} />
      {viewer}
    </>
  );
}

function NoteImageStrip({ media, onOpen }: { media: NoteImage[]; onOpen: (index: number) => void }) {
  const t = useTranslations("publicProfile.gallery");
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ prev: false, next: false });

  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    setEdges({ prev: el.scrollLeft > 4, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = strip.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  };
  const arrow =
    "focus-ring absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 sm:flex";

  return (
    <div className="group relative -mr-4 mt-2.5 sm:mr-0">
      <div
        ref={strip}
        onScroll={measure}
        className="flex snap-x gap-1.5 overflow-x-auto pr-4 [scrollbar-width:none] sm:pr-0 [&::-webkit-scrollbar]:hidden"
      >
        {media.map((image, index) => (
          <NoteImageFrame
            key={image.url}
            image={image}
            className="h-60 min-w-28 max-w-none"
            onOpen={() => onOpen(index)}
            onLoad={measure}
          />
        ))}
      </div>
      {edges.prev && (
        <button type="button" onClick={() => page(-1)} aria-label={t("previous")} className={cn(arrow, "left-2")}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
      )}
      {edges.next && (
        <button type="button" onClick={() => page(1)} aria-label={t("next")} className={cn(arrow, "right-2")}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

function NoteImageFrame({
  image,
  className,
  onOpen,
  onLoad,
}: {
  image: NoteImage;
  className: string;
  onOpen: () => void;
  onLoad?: () => void;
}) {
  const t = useTranslations("notes");
  const [showAlt, setShowAlt] = useState(false);
  return (
    <figure className="relative w-fit shrink-0 snap-start">
      <button type="button" onClick={onOpen} className="focus-ring block cursor-zoom-in rounded-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.altText ?? ""}
          loading="lazy"
          onLoad={onLoad}
          className={cn(
            "block w-auto rounded-card border border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900",
            className,
          )}
        />
      </button>
      {image.altText && (
        <>
          {showAlt && (
            <figcaption className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto rounded-b-card bg-slate-950/80 px-3 pb-9 pt-2.5 text-[13px] leading-snug text-white">
              {image.altText}
            </figcaption>
          )}
          <button
            type="button"
            onClick={() => setShowAlt((v) => !v)}
            aria-expanded={showAlt}
            aria-label={t("altShow")}
            className="focus-ring absolute bottom-2 left-2 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm hover:bg-slate-950/85"
          >
            ALT
          </button>
        </>
      )}
    </figure>
  );
}
