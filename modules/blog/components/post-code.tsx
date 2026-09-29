"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * A post code block: syntax-highlighted (through the shared markdown pipeline, rendered on the server
 * and passed in as `children`) with a language label and a copy button — the table stakes for a
 * developer-facing blog. Label and button sit in their own header row above the code (never over line 1);
 * the button copies the raw code (not the highlighted HTML).
 */
export function PostCode({ lang, code, children }: { lang: string; code: string; children: ReactNode }) {
  const t = useTranslations("common");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      // clipboard blocked (insecure context / permissions) — surface it instead of a silent no-op.
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 1600);
    }
  };

  return (
    <div className="post-code my-6 overflow-hidden rounded-lg bg-slate-900">
      <div className="flex items-center justify-between gap-3 px-4 pt-2">
        <span className="select-none font-mono text-[11px] font-medium text-slate-400">{lang}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={t("copy")}
          className="-mr-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        >
        {status === "copied" ? (
          <>
            <Check className="h-3.5 w-3.5" />
            {t("copied")}
          </>
        ) : status === "failed" ? (
          <>
            <X className="h-3.5 w-3.5" />
            {t("copyFailed")}
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            {t("copy")}
          </>
        )}
        </button>
      </div>
      {children}
    </div>
  );
}
