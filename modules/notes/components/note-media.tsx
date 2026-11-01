"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NoteMedia as NoteImage } from "@/modules/notes/api/notes";
import { cn } from "@/lib/utils";
import { VariantImage } from "@/components/common/variant-image";
import { PhotoLightbox } from "@/app/[locale]/u/[username]/_components/photo-lightbox";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

export type MediaPriority = "high" | "eager" | null;
export const MediaPriorityContext = createContext<MediaPriority>(null);

// Video and audio come only from other servers; they play from where they live.
export function NoteMedia({
  media,
  concealed = false,
  onReveal,
}: {
  media: NoteImage[];
  concealed?: boolean;
  onReveal?: () => void;
}) {
  const pictures = media.filter((item) => item.contentType.startsWith("image/"));
  const videos = media.filter((item) => item.contentType.startsWith("video/"));
  const sounds = media.filter((item) => item.contentType.startsWith("audio/"));
  if (concealed && pictures.length + videos.length > 0) {
    return <ConcealedMedia pictures={pictures} videos={videos} onReveal={onReveal} />;
  }
  if (videos.length === 0 && sounds.length === 0) return <NotePictures media={pictures} />;
  return (
    <>
      <NotePictures media={pictures} />
      {videos.map((video) => (
        <NoteVideo key={video.url} video={video} />
      ))}
      {sounds.map((sound) => (
        <audio
          key={sound.url}
          src={sound.url}
          controls
          preload="none"
          aria-label={sound.altText ?? undefined}
          className="mt-2.5 w-full"
        />
      ))}
    </>
  );
}

function ConcealedMedia({
  pictures,
  videos,
  onReveal,
}: {
  pictures: NoteImage[];
  videos: NoteImage[];
  onReveal?: () => void;
}) {
  const t = useTranslations("notes");
  const single = pictures.length + videos.length === 1;
  return (
    <div className="relative mt-2.5" data-note-sensitive>
      <div aria-hidden className={cn("flex gap-1.5 overflow-hidden", !single && "-mr-4 pr-4 sm:mr-0 sm:pr-0")}>
        {pictures.map((image) => (
          <span
            key={image.url}
            style={single ? singleFrame(image) : undefined}
            className={cn(
              "block shrink-0 overflow-hidden rounded-surface border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900",
              single ? "w-fit max-w-full" : "h-60",
            )}
          >
            <VariantImage
              src={image.url}
              alt=""
              sizes={single ? singleSizes(image) : stripSizes(image)}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              loading="lazy"
              sharpen={false}
              className={cn(
                "block w-auto scale-110 object-cover blur-2xl",
                single ? singleImageClass(image) : "h-60 min-w-28 max-w-none",
              )}
            />
          </span>
        ))}
        {videos.map((video) => (
          <span
            key={video.url}
            style={{ aspectRatio: video.width && video.height ? `${video.width} / ${video.height}` : "16 / 9" }}
            className={cn("block shrink-0 rounded-surface bg-slate-950/90", single ? "w-full max-h-[430px]" : "h-60")}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onReveal}
        aria-label={t("concealedPhotoShow")}
        className="focus-ring absolute inset-0 rounded-surface"
      />
    </div>
  );
}

// Reduced motion and data saving keep it still until the reader presses play.
function NoteVideo({ video }: { video: NoteImage }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || near) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), {
      rootMargin: "600px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = prefersReducedMotion();
    const saving = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduced || saving) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.5) element.play().catch(() => undefined);
        else element.pause();
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={video.url}
      controls
      muted
      loop
      playsInline
      preload={near ? "metadata" : "none"}
      width={video.width ?? undefined}
      height={video.height ?? undefined}
      aria-label={video.altText ?? undefined}
      className="mt-2.5 h-auto max-h-[430px] w-full rounded-surface bg-black"
    />
  );
}

function NotePictures({ media }: { media: NoteImage[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const priority = useContext(MediaPriorityContext);
  if (media.length === 0) return null;
  const viewer =
    viewing !== null ? (
      <PhotoLightbox images={media.map((image) => image.url)} initialIdx={viewing} onClose={() => setViewing(null)} />
    ) : null;
  if (media.length === 1) {
    return (
      <div className="mt-2.5">
        <NoteImageFrame
          image={media[0]}
          sizes={singleSizes(media[0])}
          frameStyle={singleFrame(media[0])}
          className={singleImageClass(media[0])}
          priority={priority}
          onOpen={() => setViewing(0)}
        />
        {viewer}
      </div>
    );
  }
  return (
    <>
      <NoteImageStrip media={media} priority={priority} onOpen={setViewing} />
      {viewer}
    </>
  );
}

function NoteImageStrip({
  media,
  priority,
  onOpen,
}: {
  media: NoteImage[];
  priority: MediaPriority;
  onOpen: (index: number) => void;
}) {
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
            sizes={stripSizes(image)}
            className="h-60 min-w-28 max-w-none"
            priority={index === 0 ? priority : null}
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

function singleWidth(image: NoteImage): number | undefined {
  if (!image.width || !image.height) return undefined;
  return Math.round((Math.min(image.height, 430) * image.width) / image.height);
}

function singleFrame(image: NoteImage): CSSProperties | undefined {
  const width = singleWidth(image);
  return width ? { width: `min(100%, ${width}px)` } : undefined;
}

function singleImageClass(image: NoteImage): string {
  return singleWidth(image) ? "h-auto max-h-[430px] w-full" : "max-h-[430px] max-w-full";
}

function singleSizes(image: NoteImage): string | undefined {
  const width = singleWidth(image);
  return width ? `(max-width: ${width}px) 100vw, ${width}px` : undefined;
}

function stripSizes(image: NoteImage): string | undefined {
  if (!image.width || !image.height) return undefined;
  return `${Math.round(Math.max(112, (240 * image.width) / image.height))}px`;
}

function NoteImageFrame({
  image,
  sizes,
  frameStyle,
  className,
  priority = null,
  onOpen,
  onLoad,
}: {
  image: NoteImage;
  sizes: string | undefined;
  frameStyle?: CSSProperties;
  className: string;
  priority?: MediaPriority;
  onOpen: () => void;
  onLoad?: () => void;
}) {
  const t = useTranslations("notes");
  const [showAlt, setShowAlt] = useState(false);
  return (
    <figure style={frameStyle} className="relative w-fit shrink-0 snap-start">
      <button
        type="button"
        onClick={onOpen}
        aria-label={image.altText ? undefined : t("photoOpen")}
        className={cn("focus-ring block cursor-zoom-in rounded-surface", frameStyle && "w-full")}
      >
        <VariantImage
          src={image.url}
          alt={image.altText ?? ""}
          sizes={sizes}
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority === "high" ? "high" : undefined}
          onLoad={onLoad}
          className={cn(
            "block w-auto rounded-surface border border-slate-200 bg-slate-100 object-cover dark:border-slate-800 dark:bg-slate-900",
            className,
          )}
        />
      </button>
      {image.altText && (
        <>
          {showAlt && (
            <figcaption className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto rounded-b-surface bg-slate-950/80 px-3 pb-9 pt-2.5 text-[13px] leading-snug text-white">
              {image.altText}
            </figcaption>
          )}
          <button
            type="button"
            onClick={() => setShowAlt((v) => !v)}
            aria-expanded={showAlt}
            aria-label={t("altShow")}
            className="focus-ring absolute bottom-2 left-2 inline-flex min-h-6 items-center rounded-surface bg-slate-950/70 px-1.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm hover:bg-slate-950/85"
          >
            ALT
          </button>
        </>
      )}
    </figure>
  );
}
