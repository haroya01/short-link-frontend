"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShortenForm } from "@/components/links/shorten/form";
import { ResultLine } from "@/components/links/shorten/result-line";
import { recordRecent } from "@/lib/recent-links";
import type { CreateLinkResponse } from "@/types";

export type ShortenedEntry = { res: CreateLinkResponse; original: string; passwordRequested?: boolean };

/**
 * The shortener: the capsule form, and once a link is made, its answer line in the form's place
 * with the earlier answers stacked below like receipts ("다른 주소도 줄이기" brings the empty field
 * back on top). The home page (signed out) and the dashboard (signed in) use this same piece.
 */
export function ShortenPanel({
  authenticated,
  ready,
  results,
  onResultsChange,
  initialUrl,
  onCreated,
}: {
  authenticated: boolean;
  ready: boolean;
  results: ShortenedEntry[] | null;
  onResultsChange: (next: ShortenedEntry[]) => void;
  initialUrl?: string;
  onCreated?: () => void;
}) {
  const tResult = useTranslations("result");
  const [composing, setComposing] = useState(false);

  return (
    <div className="max-w-2xl">
      {(!results || results.length === 0 || composing) && (
        <ShortenForm
          hero
          initialUrl={initialUrl}
          heroAutoFocus={Boolean(results && results.length > 0)}
          authenticated={authenticated}
          ready={ready}
          onShortened={(items) => {
            setComposing(false);
            const next = items.map((it) => ({
              res: it.res,
              original: it.originalUrl,
              passwordRequested: it.passwordRequested,
            }));
            const seen = new Set(next.map((n) => n.res.shortCode));
            const kept = (results ?? []).filter((p) => !seen.has(p.res.shortCode));
            onResultsChange([...next, ...kept].slice(0, 5));
            for (const it of items) {
              recordRecent({
                shortCode: it.res.shortCode,
                shortUrl: it.res.shortUrl,
                originalUrl: it.originalUrl,
                createdAt: Date.now(),
                claimToken: it.res.claimToken,
              });
            }
            onCreated?.();
          }}
        />
      )}

      {results && results.length > 0 && (
        <div className={composing ? "mt-9 space-y-8" : "space-y-8"}>
          {results.map((r, i) => (
            <ResultLine
              key={r.res.shortCode}
              result={r.res}
              originalUrl={r.original}
              authenticated={authenticated}
              passwordRequested={r.passwordRequested}
              enterIndex={i}
            />
          ))}
          {!composing && (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="focus-ring result-enter inline-flex items-baseline gap-1.5 rounded-sm text-[14px] font-semibold text-slate-500 transition-colors hover:text-accent-700 dark:text-slate-400 dark:hover:text-accent-400"
              style={{ ["--idx" as string]: results.length + 1 } as React.CSSProperties}
            >
              {tResult("moreShorten")}
              <span aria-hidden className="text-[12px] text-slate-300 dark:text-slate-600">
                ↵
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
