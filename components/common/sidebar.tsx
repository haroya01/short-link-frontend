"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/common/sidebar-state";

export type SidebarEntry = {
  href: string;
  label: string;
  active?: (pathname: string) => boolean;
};

export type SidebarSection = {
  entries: SidebarEntry[];
};

export function Sidebar({ sections }: { sections: SidebarSection[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white sm:flex sm:flex-col">
      <SidebarList sections={sections} pathname={pathname} />
    </aside>
  );
}

export function MobileSidebar({ sections }: { sections: SidebarSection[] }) {
  const pathname = usePathname();
  const { open, close } = useSidebarState();

  // 라우트 변경 시 자동 닫힘
  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

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
        role="dialog"
        aria-modal="true"
        aria-label="navigation"
        className={cn(
          "fixed left-0 top-14 z-20 h-[calc(100vh-3.5rem)] w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-xl transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] sm:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarList sections={sections} pathname={pathname} />
      </div>
    </>
  );
}

function SidebarList({
  sections,
  pathname,
}: {
  sections: SidebarSection[];
  pathname: string;
}) {
  return (
    <nav className="flex-1 px-3 py-4">
      {sections.map((section, i) => (
        <ul
          key={i}
          className={cn(
            "flex flex-col gap-0.5",
            i > 0 && "mt-3 border-t border-slate-200 pt-3",
          )}
        >
          {section.entries.map((entry) => (
            <SidebarItem key={entry.href} entry={entry} pathname={pathname} />
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
}: {
  entry: SidebarEntry;
  pathname: string;
}) {
  // middleware host rewrite 후 internal pathname 은 `/links/dashboard` 같은 product prefix 포함.
  // sidebar entries 의 href 는 external path (`/dashboard`). active 매칭은 prefix 제거 후.
  const external = stripProductPrefix(pathname);
  const isActive = entry.active
    ? entry.active(external)
    : external === entry.href || external.startsWith(entry.href + "/");

  return (
    <li>
      <Link
        href={entry.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative flex items-center rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
          isActive
            ? "bg-accent-50 font-medium text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
