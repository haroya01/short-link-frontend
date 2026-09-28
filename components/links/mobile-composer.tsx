"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { track } from "@/components/common/posthog-provider";
import { LinkSheet, type SheetLink } from "@/components/links/link-sheet";
import { shortenPayload } from "@/components/links/shorten/payload";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { isValidUrl, shortenUrl } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { extractUrl } from "@/lib/extract-url";
import { cn } from "@/lib/utils";

/**
 * Phone composer for signed-in users: a single field pinned above the tab bar, where the thumb
 * already is. Pasting a link into the empty field (the OS paste — no in-app paste button) shortens
 * it right away; the result opens as the link sheet (copy · share · QR). Rides the tab bar's
 * hide-on-scroll.
 */
export function MobileComposer({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("composer");
  const errorMessage = useApiErrorMessage();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SheetLink | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navHidden = useHideOnScroll();

  useEffect(() => {
    document.body.dataset.composer = "1";
    return () => {
      delete document.body.dataset.composer;
    };
  }, []);

  async function shorten(raw: string) {
    const url = extractUrl(raw);
    if (!url || !isValidUrl(url)) {
      setError(t("noUrl"));
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await shortenUrl(
        shortenPayload({ url, authenticated: true, customCode: "", expiresAt: "", lockOn: false, password: "" }),
      );
      track("link_shortened", { count: 1, authenticated: true, has_custom_code: false, has_expiry: false, has_password: false });
      setValue("");
      inputRef.current?.blur();
      setCreated({ shortCode: res.shortCode, shortUrl: res.shortUrl, originalUrl: url });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, t("failed")));
    } finally {
      setBusy(false);
    }
  }

  const empty = !value.trim();
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void shorten(value);
        }}
        className={cn(
          "fixed inset-x-0 bottom-[var(--bottom-nav-h)] z-30 border-t border-slate-200 bg-white px-3 py-2 transition-transform duration-200 motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950 sm:hidden",
          navHidden && "translate-y-14",
        )}
      >
        {error && (
          <p role="alert" className="px-1 pb-1.5 text-[12px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onPaste={(e) => {
              if (!empty || busy) return;
              const pasted = e.clipboardData.getData("text");
              if (!extractUrl(pasted)) return;
              e.preventDefault();
              setValue(pasted.trim());
              void shorten(pasted);
            }}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-accent-600 focus:outline-none focus:ring-4 focus:ring-accent-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={busy || empty}
            className={buttonVariants({ variant: "accent", size: "lg" })}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {t("submit")}
          </button>
        </div>
      </form>
      <LinkSheet link={created} created onClose={() => setCreated(null)} />
    </>
  );
}
