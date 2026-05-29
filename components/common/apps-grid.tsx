"use client";

import { useEffect, useRef, useState } from "react";
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

export function AppsGrid() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav.apps");
  const ref = useRef<HTMLDivElement>(null);

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
          className="absolute right-0 top-10 z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {/* Only show the product(s) you're NOT on — the grid is a switcher, so surfacing the
              current product is noise. Computed client-side from host/path. */}
          {PRODUCTS.filter((p) => p.key !== currentProduct()).map((p, i) => (
            <a
              key={p.key}
              href={p.href()}
              role="menuitem"
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
    </div>
  );
}
