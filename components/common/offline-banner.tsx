"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnline } from "@/hooks/use-online";
import { usePresence } from "@/hooks/use-presence";

/**
 * A quiet top strip shown only while the browser is offline (§10 — no color noise, no dismiss
 * button, nothing when everything is fine). The web has no OfflineStore like the iOS app, so a
 * dropped connection otherwise surfaces as a fetch that fails into a generic error or an empty
 * state; this names the actual cause so the visitor knows to wait rather than assume the page broke.
 * Mounted once in the locale layout — it renders null when online, so it costs a page nothing until
 * the connection actually drops. Slides away on reconnect via usePresence instead of popping.
 */
export function OfflineBanner() {
  const t = useTranslations("common");
  const online = useOnline();
  const { mounted, closing } = usePresence(!online, 160);

  return (
    <>
      {/* Announcer kept permanently in the tree — screen readers reliably read text inserted into an
          already-live region, but an empty status region mounted together with its text (as when the
          banner appears) is often skipped. So the region is always present and only its text toggles. */}
      <div role="status" aria-live="polite" className="sr-only">
        {online ? "" : t("offline")}
      </div>
      {/* Purely a visual strip: it's fixed over the sticky header's top edge, so without
          pointer-events-none it would silently swallow clicks landing in that band. Offline still
          allows navigating cached pages, so those clicks must pass through. Not a live region — the
          sr-only announcer above owns the announcement. */}
      {mounted && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 ${
            closing ? "animate-fade-out" : "animate-fade-in"
          }`}
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <span>{t("offline")}</span>
        </div>
      )}
    </>
  );
}
