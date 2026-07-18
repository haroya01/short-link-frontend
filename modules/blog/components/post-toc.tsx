"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { List, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { RailHeading } from "@/modules/blog/components/rail-heading";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";

export type TocHeading = { id: string; text: string; level: number };

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  return true;
}

/**
 * velog-style floating table of contents. Shown from landscape-tablet width up (~1100px, positioned
 * in the right margin by the page) whenever the post has at least one heading. Scrollspy via
 * IntersectionObserver highlights the section currently near the top of the viewport.
 */
export function PostToc({ headings }: { headings: TocHeading[] }) {
  const t = useTranslations("publicPost");
  const [active, setActive] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -75% 0px", threshold: 0 },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  function jumpTo(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (scrollToHeading(id)) setActive(id);
  }

  if (headings.length < 1) return null;

  return (
    <nav aria-label={t("toc")} className="border-l border-slate-100 pl-4 text-[13px] leading-relaxed dark:border-slate-800">
      <ul className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
            <a
              href={`#${h.id}`}
              onClick={(e) => jumpTo(e, h.id)}
              aria-current={active === h.id ? "location" : undefined}
              className={`block truncate rounded transition-colors focus-ring ${
                active === h.id
                  ? "font-medium text-accent-700 dark:text-accent-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Mobile counterpart to {@link PostToc} (the sidebar TOC is ~1100px+). A floating "목차" button opens a
 * bottom sheet of the headings so long posts stay navigable on a phone — no jump links otherwise.
 */
export function PostTocMobile({ headings }: { headings: TocHeading[] }) {
  const t = useTranslations("publicPost");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Hold the sheet mounted through its exit (sheet-down / scrim fade) instead of popping on close.
  const { mounted, closing } = usePresence(open, 240);
  // Portal target (<body>) only exists on the client; gate so the first render matches SSR (nothing).
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  // Escape + Tab cycling within the sheet + focus restore to the 목차 button on close.
  useFocusTrap(dialogRef, { active: open, onEscape: () => setOpen(false) });

  if (headings.length < 1) return null;

  return (
    <div className="min-[1100px]:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("toc")}
        aria-haspopup="dialog"
        className="focus-ring fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.3)] backdrop-blur transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 sm:bottom-5"
      >
        <List className="h-4 w-4 text-accent-600" />
        {t("toc")}
      </button>
      {mounted && portalReady && createPortal(
        // Portal to <body>: a transformed / will-change ancestor would clip this `fixed inset-0` sheet.
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("toc")}
          // 닫히는 동안 전면 컨테이너가 클릭을 삼키지도, 접근성 트리에 남지도 않게(전면 오버레이 공통 규칙).
          aria-hidden={closing || undefined}
          className={`fixed inset-0 z-50 ${closing ? "pointer-events-none" : ""}`}
        >
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className={`absolute inset-0 bg-slate-900/30 motion-reduce:animate-none ${
              closing ? "animate-[overlay-out_240ms_var(--ease)_both]" : "animate-fade-in"
            }`}
          />
          <div
            className={`absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.3)] motion-reduce:animate-none dark:bg-slate-900 ${
              closing ? "animate-[sheet-down_240ms_var(--ease)_both]" : "animate-[sheet-up_280ms_var(--ease)_both]"
            }`}
          >
            <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden />
            <div className="flex items-center justify-between px-3 pb-1">
              <RailHeading>{t("toc")}</RailHeading>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("toc")}
                className="focus-ring grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="pb-1">
              {headings.map((h) => (
                <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                  <a
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToHeading(h.id);
                      setOpen(false);
                    }}
                    className="focus-ring block truncate rounded-lg px-3 py-2.5 text-[15px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
