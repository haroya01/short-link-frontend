"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Signed-in account control. An avatar button (the viewer's initial — `Me` carries no photo) opens a
 * dropdown holding the identity line + sign out, instead of leaving "Sign out" sitting exposed in the
 * header. Mirrors the Google/Naver account-button pattern; the cross-product app switcher stays a
 * separate control (AppsGrid) beside it. Closes on outside-click or Escape.
 */
export function AccountMenu() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = me?.username || me?.email || "";
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("account")}
        className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 transition-colors hover:bg-accent-200"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 origin-top-right animate-dropdown-in rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {(me?.username || me?.email) && (
            <div className="px-3 py-2">
              {me?.username && (
                <p className="truncate text-sm font-semibold text-slate-900">@{me.username}</p>
              )}
              {me?.email && <p className="truncate text-[12px] text-slate-500">{me.email}</p>}
            </div>
          )}
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push(`/${locale}`);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
