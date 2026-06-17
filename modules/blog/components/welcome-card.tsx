"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { listFollowing } from "@/modules/blog/api/follows";
import { Mark } from "@/components/common/logo";
import { SuggestedCurators } from "@/modules/blog/components/suggested-curators";

const DISMISS_KEY = "kurl:welcome-dismissed";

/**
 * First-run welcome for a signed-in reader who follows nobody yet — a soft (dismissible) nudge to seed
 * the connection graph on day 1, rather than a mandatory gate (fits the quiet thesis). Self-gates:
 * shows only when signed in + zero follows + not previously dismissed, so it never bothers an
 * established reader. The curator picker is the existing SuggestedCurators (1-tap follow).
 */
export function WelcomeCard({ locale }: { locale: string }) {
  const t = useTranslations("publicFeed");
  const { ready, authenticated, me } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !me?.username) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* storage blocked (private mode) — just skip the card */
      return;
    }
    let alive = true;
    listFollowing(me.username, 0, 1)
      .then((p) => {
        if (alive && p.items.length === 0) setShow(true);
      })
      .catch(() => {
        /* couldn't check follows — don't risk showing it to an established reader */
      });
    return () => {
      alive = false;
    };
  }, [ready, authenticated, me?.username]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setShow(false);
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-fade-in dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("welcomeDismiss")}
        className="focus-ring absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2.5">
        <Mark className="h-4 text-accent-600" />
        <h2 className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t("welcomeTitle")}
        </h2>
      </div>
      <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t("welcomeBody")}
      </p>
      <div className="mt-5">
        <SuggestedCurators locale={locale} limit={6} />
      </div>
    </div>
  );
}
