"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Grid3x3, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogHref, currentProduct, linksHref, type Product } from "@/lib/host";

/**
 * Cross-product navigation. 헤더 우상단 grid icon → popover 두 카드 (Links / Blog).
 * 글로벌 이동 장치이고, in-context cross-product CTA 는 page-level 로 별도 배치한다.
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */
const PRODUCTS: {
  key: Product;
  href: () => string;
  Icon: typeof Link2;
  labelKey: string;
  hintKey: string;
}[] = [
  { key: "links", href: () => linksHref("/"), Icon: Link2, labelKey: "linksLabel", hintKey: "linksHint" },
  { key: "blog", href: () => blogHref("/"), Icon: FileText, labelKey: "blogLabel", hintKey: "blogHint" },
];

type Warp = { href: string; label: string; Icon: typeof Link2 };

export function AppsGrid() {
  const [open, setOpen] = useState(false);
  const [warp, setWarp] = useState<Warp | null>(null);
  const t = useTranslations("nav.apps");
  const ref = useRef<HTMLDivElement>(null);

  // Play the warp overlay, then do the (cross-origin) navigation. New-tab / modified clicks and
  // reduced-motion fall through to the plain link.
  const switchTo = (
    e: React.MouseEvent<HTMLAnchorElement>,
    p: (typeof PRODUCTS)[number],
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    const href = p.href();
    setOpen(false);
    setWarp({ href, label: t(p.labelKey), Icon: p.Icon });
    window.setTimeout(() => {
      window.location.href = href;
    }, 560);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label={t("trigger")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Grid3x3 className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          // Mobile: pin to the viewport right edge (the trigger sits mid-header, so an
          // absolute right-0 popover overflowed off the left edge). Desktop: anchor under the
          // trigger as before.
          className="fixed right-3 top-14 z-40 w-[calc(100vw-1.5rem)] max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:right-0 sm:top-10 sm:w-72 sm:max-w-none"
        >
          {/* Only show the product(s) you're NOT on — the grid is a switcher, so surfacing the
              current product is noise. Computed client-side from host/path. */}
          {PRODUCTS.filter((p) => p.key !== currentProduct()).map((p, i) => (
            <a
              key={p.key}
              href={p.href()}
              role="menuitem"
              onClick={(e) => switchTo(e, p)}
              className={`flex items-start gap-3 px-3 py-3 transition-colors hover:bg-slate-50 ${
                i > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <p.Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">{t(p.labelKey)}</span>
                <span className="block text-[12px] text-slate-500">{t(p.hintKey)}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      {warp &&
        typeof document !== "undefined" &&
        createPortal(
          // Portal to <body>: a transformed/blurred header ancestor would otherwise be the
          // containing block for `fixed`, clipping the overlay to the header height.
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white"
            role="status"
            aria-live="polite"
          >
            <span aria-hidden className="product-warp-disc absolute inset-0 bg-accent-600" />
            <span className="product-warp-content relative flex flex-col items-center gap-3 text-white">
              <warp.Icon className="h-11 w-11" strokeWidth={1.75} />
              <span className="text-[19px] font-semibold tracking-tight">{warp.label}</span>
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
}
