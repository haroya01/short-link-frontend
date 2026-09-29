"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Loader2, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { track } from "@/components/common/posthog-provider";
import { LinkSheet, type SheetLink } from "@/components/links/link-sheet";
import { shortenPayload } from "@/components/links/shorten/payload";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { isValidUrl, shortenUrl } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { extractUrl } from "@/lib/extract-url";
import { cn } from "@/lib/utils";

const CODE_PATTERN = /^[0-9A-Za-z]{3,16}$/;

/**
 * Phone composer for signed-in users: a single field pinned above the tab bar, where the thumb
 * already is. The OS paste only fills the field (a shared sentence is trimmed to its URL); the
 * options sheet (code · expiry · password) is set before shortening, which waits for the button.
 * The result opens as the link sheet (copy · share · QR). Rides the tab bar's hide-on-scroll.
 */
export function MobileComposer({ initialUrl, onCreated }: { initialUrl?: string; onCreated: () => void }) {
  const t = useTranslations("composer");
  const tForm = useTranslations("shortenForm");
  const errorMessage = useApiErrorMessage();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SheetLink | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [lockOn, setLockOn] = useState(false);
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lockLabelId = useId();
  const navHidden = useHideOnScroll();

  useEffect(() => {
    document.body.dataset.composer = "1";
    return () => {
      delete document.body.dataset.composer;
    };
  }, []);

  useEffect(() => {
    if (initialUrl) setValue(initialUrl);
  }, [initialUrl]);

  const optionCount = [customCode.trim(), expiresAt, lockOn ? "lock" : ""].filter(Boolean).length;

  async function shorten(raw: string) {
    const url = extractUrl(raw);
    if (!url || !isValidUrl(url)) {
      setError(t("noUrl"));
      inputRef.current?.focus();
      return;
    }
    if (customCode.trim() && !CODE_PATTERN.test(customCode.trim())) {
      setError(t("codeInvalid"));
      setOptionsOpen(true);
      return;
    }
    if (lockOn && !password.trim()) {
      setError(tForm("errors.passwordEmpty"));
      setOptionsOpen(true);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await shortenUrl(
        shortenPayload({ url, authenticated: true, customCode, expiresAt, lockOn, password }),
      );
      track("link_shortened", {
        count: 1,
        authenticated: true,
        has_custom_code: Boolean(customCode.trim()),
        has_expiry: Boolean(expiresAt),
        has_password: lockOn,
      });
      setValue("");
      setCustomCode("");
      setExpiresAt("");
      setLockOn(false);
      setPassword("");
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
              if (!empty) return;
              const pasted = e.clipboardData.getData("text");
              const found = extractUrl(pasted);
              if (!found || found === pasted.trim()) return;
              e.preventDefault();
              setValue(found);
            }}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-accent-600 focus:outline-none focus:ring-4 focus:ring-accent-600/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setOptionsOpen(true)}
            aria-haspopup="dialog"
            aria-label={optionCount > 0 ? `${t("options")}, ${t("optionsSet", { count: optionCount })}` : t("options")}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "relative shrink-0 px-3")}
          >
            <SlidersHorizontal aria-hidden className="h-4 w-4" />
            {optionCount > 0 && (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                {optionCount}
              </span>
            )}
          </button>
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

      <BottomSheet open={optionsOpen} onClose={() => setOptionsOpen(false)} label={t("optionsTitle")}>
        <div className="space-y-4 pb-1">
          <h2 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">{t("optionsTitle")}</h2>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{tForm("customCodeLabel")}</span>
            <Input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              pattern="^[0-9A-Za-z]{3,16}$"
              placeholder={tForm("customCodePlaceholder")}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{tForm("expiresAtLabel")}</span>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span id={lockLabelId} className="text-[15px] text-slate-800 dark:text-slate-200">
                {tForm("passwordToggle")}
              </span>
              <Switch checked={lockOn} onCheckedChange={setLockOn} aria-labelledby={lockLabelId} />
            </div>
            {lockOn && (
              <PasswordInput
                autoComplete="new-password"
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tForm("passwordPlaceholder")}
                aria-label={tForm("passwordLabel")}
              />
            )}
          </div>
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setOptionsOpen(false)}>
            {t("done")}
          </Button>
        </div>
      </BottomSheet>

      <LinkSheet link={created} created onClose={() => setCreated(null)} />
    </>
  );
}
