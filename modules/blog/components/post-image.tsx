"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A post image: fits the article column (aspect ratio preserved via CSS), and clicking it opens the
 * original full-size in a dark lightbox — the pattern every reading-focused blog uses (Medium,
 * Substack, Ghost, velog). Portaled to <body> so a transformed ancestor can't clip the fixed
 * overlay; Esc, backdrop click, and the close button all dismiss, and body scroll is locked while open.
 */
export function PostImage({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  const [open, setOpen] = useState(false);
  const label = alt || caption || "";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        loading="lazy"
        onClick={() => setOpen(true)}
        className="cursor-zoom-in"
      />
      {caption && <figcaption>{caption}</figcaption>}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label || "image"}
            onClick={() => setOpen(false)}
            className="post-lightbox fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
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
              aria-label="Close"
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
