"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useSidebarState } from "@/components/common/sidebar-state";

export type SidebarEntry = {
  href: string;
  label: string;
  active?: (pathname: string) => boolean;
};

export type SidebarSection = {
  entries: SidebarEntry[];
};

export function Sidebar({ sections, basePath = "" }: { sections: SidebarSection[]; basePath?: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:flex sm:flex-col">
      <SidebarList sections={sections} pathname={pathname} basePath={basePath} />
    </aside>
  );
}

export function MobileSidebar({ sections, basePath = "" }: { sections: SidebarSection[]; basePath?: string }) {
  const pathname = usePathname();
  const { open, close } = useSidebarState();
  const t = useTranslations("nav");
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape + Tab containment within the drawer + focus restore to the opener (the hamburger) on close.
  // The drawer stays mounted (it slides via transform), so the trap is gated on `open`.
  useFocusTrap(panelRef, { active: open, onEscape: close });

  // 라우트 변경 시 자동 닫힘
  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 top-14 z-20 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        className={cn(
          "fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-xl transition-transform duration-[280ms] ease-[var(--ease)] dark:border-slate-800 dark:bg-slate-950 sm:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarList sections={sections} pathname={pathname} basePath={basePath} />
      </div>
    </>
  );
}

function SidebarList({
  sections,
  pathname,
  basePath,
}: {
  sections: SidebarSection[];
  pathname: string;
  basePath: string;
}) {
  return (
    <nav className="flex-1 px-3 py-4">
      {sections.map((section, i) => (
        <ul
          key={i}
          className={cn(
            "flex flex-col gap-0.5",
            i > 0 && "mt-3 border-t border-slate-200 pt-3 dark:border-slate-800",
          )}
        >
          {section.entries.map((entry) => (
            <SidebarItem key={entry.href} entry={entry} pathname={pathname} basePath={basePath} />
          ))}
        </ul>
      ))}
    </nav>
  );
}

const PRODUCT_PREFIXES = ["/blog", "/links"];

function stripProductPrefix(pathname: string): string {
  for (const prefix of PRODUCT_PREFIXES) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(prefix + "/")) return pathname.slice(prefix.length);
  }
  return pathname;
}

function SidebarItem({
  entry,
  pathname,
  basePath,
}: {
  entry: SidebarEntry;
  pathname: string;
  basePath: string;
}) {
  // Entry hrefs are product-relative (`/analytics`). On a path-based deploy the blog lives under a
  // product prefix (e.g. `/blog-preview`) that the blog host strips via rewrite — so the rendered
  // link must carry `basePath` or it 404s (resolving to the links product instead). Active matching
  // strips the same base + any internal product prefix.
  const withoutBase =
    basePath && (pathname === basePath || pathname.startsWith(basePath + "/"))
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const external = stripProductPrefix(withoutBase);
  const isActive = entry.active
    ? entry.active(external)
    : external === entry.href || external.startsWith(entry.href + "/");

  return (
    <li>
      <Link
        href={`${basePath}${entry.href}`}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
          isActive
            ? "bg-accent-50 font-medium text-slate-900 dark:bg-accent-500/15 dark:text-slate-100"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        )}
      >
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-600"
          />
        )}
        {entry.label}
      </Link>
    </li>
  );
}
