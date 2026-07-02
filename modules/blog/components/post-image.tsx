"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import type { ImageWidth } from "@/modules/blog/lib/image-width";

// Wider-than-column layouts. Reader uses these; the editor mirrors them via img[alt^="«wide»"] CSS.
const WIDTH_CLASS: Record<ImageWidth, string> = {
  wide: "post-img-wide",
  full: "post-img-full",
  half: "post-img-half",
};

/**
 * A post image: fits the article column (aspect ratio preserved via CSS), and clicking it opens the
 * original full-size in a dark lightbox — the pattern every reading-focused blog uses (Medium,
 * Substack, Ghost, velog). Portaled to <body> so a transformed ancestor can't clip the fixed
 * overlay; Esc, backdrop click, and the close button all dismiss, and body scroll is locked while open.
 */
export function PostImage({
  src,
  alt,
  caption,
  width,
}: {
  src: string;
  alt: string;
  caption: string;
  width?: ImageWidth;
}) {
  const t = useTranslations("publicPost");
  const [open, setOpen] = useState(false);
  // Hold the lightbox mounted while backdrop + image fade back out (post-lightbox-closing).
  const { mounted, closing } = usePresence(open, 200);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const label = alt || caption || "";

  // Escape + focus containment (the close button is the only tab stop) + restore to the trigger.
  useFocusTrap(overlayRef, { active: open, onEscape: () => setOpen(false) });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <figure className={width ? WIDTH_CLASS[width] : undefined}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("imageZoom")}
        className="focus-ring block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} loading="lazy" className="img-fade" />
      </button>
      {caption && <figcaption>{caption}</figcaption>}

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={label || t("imageZoom")}
            onClick={() => setOpen(false)}
            className={`post-lightbox${closing ? " post-lightbox-closing" : ""} fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={label}
              onClick={(e) => e.stopPropagation()}
              className="post-lightbox-img max-h-[92vh] max-w-[92vw] cursor-default rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              aria-label={t("imageClose")}
              onClick={() => setOpen(false)}
              className="fixed right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>,
          document.body,
        )}
    </figure>
  );
}
