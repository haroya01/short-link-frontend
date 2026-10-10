"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { linksHref } from "@/lib/host";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { usePresence } from "@/hooks/use-presence";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";

export type SignInReason =
  | "write"
  | "note"
  | "reply"
  | "comment"
  | "like"
  | "repost"
  | "bookmark"
  | "subscribe"
  | "follow"
  | "vote"
  | "quote"
  | "highlight"
  | "collect"
  | "notifications"
  | "followRequests"
  | "manage"
  | "stats"
  | "library"
  | "settings"
  | "followingFeed"
  | "forYou"
  | "seriesFeed"
  | "followingNotes"
  | "federatedNotes"
  | "direct"
  | "lists"
  | "noteBookmarks"
  | "remote"
  | "collections"
  | "links"
  | "campaigns"
  | "ctas"
  | "events"
  | "profile"
  | "more"
  | "general";

type Ask = { reason: SignInReason; next?: string };

let asked: Ask | null = null;
const listeners = new Set<() => void>();

function set(ask: Ask | null) {
  asked = ask;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function askToSignIn(reason: SignInReason, next?: string) {
  set({ reason, next });
}

export function LoginPromptHost() {
  const ask = useSyncExternalStore(subscribe, () => asked, () => null);
  const { authenticated } = useAuth();
  const open = ask !== null && !authenticated;
  const shown = useRef<Ask | null>(null);
  if (open) shown.current = ask;
  const { mounted: present, closing } = usePresence(open, 240);
  const [here, setHere] = useState(false);
  useEffect(() => setHere(true), []);

  useEffect(() => {
    if (ask !== null && authenticated) set(null);
  }, [ask, authenticated]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!here || !present || !shown.current) return null;
  return createPortal(<LoginSheet {...shown.current} open={open} closing={closing} />, document.body);
}

function LoginSheet({ reason, next, open, closing }: Ask & { open: boolean; closing: boolean }) {
  const t = useTranslations("loginPrompt");
  const tc = useTranslations("common");
  const { signInWithGoogle } = useAuth();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = () => set(null);
  useFocusTrap(panel, { active: open, onEscape: close, autoFocus: true });
  const back = next ?? (typeof window === "undefined" ? "/" : window.location.href);
  const legal = "underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300";

  return (
    <div
      aria-hidden={closing || undefined}
      className={cn("fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4", closing && "pointer-events-none")}
    >
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "absolute inset-0 scrim motion-reduce:animate-none",
          closing ? "animate-[overlay-out_240ms_var(--ease)_both]" : "animate-fade-in",
        )}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-t-surface border-t border-slate-200 bg-white px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-7 shadow-modal motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-850",
          "sm:max-w-sm sm:rounded-2xl sm:border sm:pb-6",
          closing
            ? "animate-[sheet-down_240ms_var(--ease)_both] sm:animate-fade-out"
            : "animate-[sheet-up_280ms_var(--ease)_both] sm:animate-fade-in",
        )}
      >
        <button
          type="button"
          onClick={close}
          aria-label={tc("close")}
          className="focus-ring absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <h2 id={titleId} className="pr-8 text-[17px] font-semibold tracking-headline text-slate-900 dark:text-slate-100">
          {t(reason)}
        </h2>
        <div className="mt-6 space-y-2.5">
          <Button variant="outline" className="h-11 w-full justify-center" onClick={() => signInWithGoogle(next)}>
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
          <AppleSignInButton successHref={back} />
        </div>
        <p className="mt-4 text-center text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t.rich("consent", {
            terms: (c) => (
              <a href={linksHref("/terms")} className={legal}>
                {c}
              </a>
            ),
            privacy: (c) => (
              <a href={linksHref("/privacy")} className={legal}>
                {c}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
