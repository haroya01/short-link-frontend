"use client";

import { useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { setLinkOgOverride, shortenUrl, toggleLinkOnProfile } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  KNOWN_TEMPLATE_LABELS,
  extractHandle,
  fillTemplate,
  templatesFor,
  type LinkTemplate,
} from "@/modules/profile/lib/link-templates";

/**
 * Free-form add: paste any URL + a label. The label gets persisted as the link's OG-title
 * override so the public profile renders it as the button text. Popular platforms below are an
 * optional shortcut — clicking one only fills the URL field with a template the user then
 * completes (the placeholder portion is pre-selected), and the user still types their own label.
 */

type Props = {
  onAdded: () => void;
  /** Renders the "first link" emphasis when the user hasn't featured anything yet. */
  highlightEmpty?: boolean;
};

export function ProfileQuickAdd({ onAdded, highlightEmpty = false }: Props) {
  const t = useTranslations("settings.profile.quickAdd");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  function applyTemplate(tpl: LinkTemplate) {
    // Preserve the handle the user already typed (or extracted from a different platform's URL).
    // e.g. "github.com/haroya" + Instagram chip → "instagram.com/haroya". Falls back to the new
    // template's placeholder when the field is empty or doesn't match any known shape.
    const handle = extractHandle(url) ?? tpl.placeholder;
    const filled = fillTemplate(tpl, handle);
    setUrl(filled);
    // Swap the label too when it's still empty or matches some known template's label — meaning
    // the user hasn't customized it. A user-typed label stays.
    if (!label.trim() || KNOWN_TEMPLATE_LABELS.has(label.trim())) {
      setLabel(tpl.label);
    }
    requestAnimationFrame(() => {
      const el = urlInputRef.current;
      if (!el) return;
      el.focus();
      const start = tpl.urlTemplate.indexOf("{h}");
      if (start >= 0) el.setSelectionRange(start, start + handle.length);
    });
  }

  async function submit() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const normalized = normalizeScheme(trimmedUrl);
    if (!normalized) {
      toast(t("invalidUrl"), "error");
      return;
    }
    setBusy(true);
    try {
      const created = await shortenUrl({ url: normalized });
      const trimmedLabel = label.trim();
      if (trimmedLabel) {
        await setLinkOgOverride(created.shortCode, { ogTitle: trimmedLabel });
      }
      await toggleLinkOnProfile(created.shortCode, true);
      toast(t("added", { label: trimmedLabel || trimmedUrl }), "success");
      setUrl("");
      setLabel("");
      onAdded();
      requestAnimationFrame(() => urlInputRef.current?.focus());
    } catch (err) {
      toast(errorMessage(err, t("addFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p
          className={cn(
            "text-slate-900 dark:text-slate-100",
            highlightEmpty ? "text-base font-semibold" : "text-sm font-medium",
          )}
        >
          {highlightEmpty ? t("firstTitle") : t("title")}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {t("hint")}
        </p>
      </div>

      <div className="space-y-2">
        <Input
          ref={urlInputRef}
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("urlPlaceholder")}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (label) {
                void submit();
              } else {
                document.getElementById("profile-quickadd-label")?.focus();
              }
            }
          }}
        />
        <div className="flex gap-2">
          <Input
            id="profile-quickadd-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("labelPlaceholder")}
            maxLength={80}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={submit} disabled={busy || !url.trim()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("add")}
          </Button>
        </div>
      </div>

      <TemplatesRow templates={templatesFor(locale)} onPick={applyTemplate} t={t} />
    </div>
  );
}

/**
 * Social-template chips would otherwise eat 2 wrapped rows on every page load even after a user
 * has memorized which one they want. Show {@code DEFAULT_VISIBLE} most-common chips by default
 * and gate the rest behind a "+ N" toggle. State is local; collapses again on profile reload.
 */
const DEFAULT_VISIBLE = 4;

function TemplatesRow({
  templates,
  onPick,
  t,
}: {
  templates: readonly LinkTemplate[];
  onPick: (tpl: LinkTemplate) => void;
  t: ReturnType<typeof useTranslations<"settings.profile.quickAdd">>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? templates : templates.slice(0, DEFAULT_VISIBLE);
  const hidden = templates.length - DEFAULT_VISIBLE;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("templatesLabel")}</p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onPick(tpl)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700"
          >
            {tpl.label}
          </button>
        ))}
        {!showAll && hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700"
          >
            <ChevronDown className="h-3 w-3" />
            {t("templatesMore", { count: hidden })}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Accepts a fairly free-form input and returns a usable URL. Rules in order:
 * - Already has http(s):// or mailto: → return as-is
 * - Looks like an email (has @ and a TLD) → prefix mailto:
 * - Looks like a domain or path (has a dot, no scheme) → prefix https://
 * - Otherwise → null (caller surfaces an error)
 */
function normalizeScheme(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^mailto:/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "mailto:" + v;
  if (/\./.test(v) && !/\s/.test(v)) return "https://" + v;
  return null;
}
