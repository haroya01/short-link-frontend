"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Grid3x3, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogHref, linksHref } from "@/lib/host";

/**
 * Cross-product navigation. 헤더 우상단 grid icon → popover 두 카드 (Links / Blog).
 * 글로벌 이동 장치이고, in-context cross-product CTA 는 page-level 로 별도 배치한다.
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */
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
          <a
            href={linksHref("/")}
            role="menuitem"
            className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-slate-50"
          >
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">
                {t("linksLabel")}
              </span>
              <span className="block text-[12px] text-slate-500">{t("linksHint")}</span>
            </span>
          </a>
          <a
            href={blogHref("/")}
            role="menuitem"
            className="flex items-start gap-3 border-t border-slate-100 px-3 py-3 transition-colors hover:bg-slate-50"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">
                {t("blogLabel")}
              </span>
              <span className="block text-[12px] text-slate-500">{t("blogHint")}</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
