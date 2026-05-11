"use client";

import { useRef, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { setLinkOgOverride, shortenUrl, toggleLinkOnProfile } from "@/lib/api";

/**
 * Free-form add: paste any URL + a label. The label gets persisted as the link's OG-title
 * override so the public profile renders it as the button text. Popular platforms below are an
 * optional shortcut — clicking one only fills the URL field with a template the user then
 * completes (the placeholder portion is pre-selected), and the user still types their own label.
 */

type Template = {
  id: string;
  label: string;
  urlTemplate: string;
  placeholder: string;
  /**
   * Single capture-group regex used in two directions: to pull the handle out of an existing URL
   * (so "github.com/haroya" + Instagram chip → "instagram.com/haroya"), and to detect "what
   * platform is this URL on" for chip-to-chip swaps.
   */
  handleRegex: RegExp;
};

const TEMPLATES: Template[] = [
  {
    id: "instagram",
    label: "Instagram",
    urlTemplate: "https://instagram.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?instagram\.com\/([^/?#]+)/i,
  },
  {
    id: "x",
    label: "X",
    urlTemplate: "https://x.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)/i,
  },
  {
    id: "youtube",
    label: "YouTube",
    urlTemplate: "https://youtube.com/@{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?youtube\.com\/@?([^/?#]+)/i,
  },
  {
    id: "tiktok",
    label: "TikTok",
    urlTemplate: "https://tiktok.com/@{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?tiktok\.com\/@([^/?#]+)/i,
  },
  {
    id: "github",
    label: "GitHub",
    urlTemplate: "https://github.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)/i,
  },
  {
    id: "kakao",
    label: "카카오톡 채널",
    urlTemplate: "https://pf.kakao.com/_{h}",
    placeholder: "abcDEF",
    handleRegex: /^https?:\/\/pf\.kakao\.com\/_([^/?#]+)/i,
  },
  {
    id: "naver-blog",
    label: "네이버 블로그",
    urlTemplate: "https://blog.naver.com/{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/blog\.naver\.com\/([^/?#]+)/i,
  },
  {
    id: "velog",
    label: "Velog",
    urlTemplate: "https://velog.io/@{h}",
    placeholder: "haroya",
    handleRegex: /^https?:\/\/velog\.io\/@([^/?#]+)/i,
  },
  // Email is a special case — we don't show the technical "mailto:" prefix in the field; the
  // input is just an address and we add the scheme on submit (see normalizeScheme).
  {
    id: "email",
    label: "Email",
    urlTemplate: "{h}",
    placeholder: "you@example.com",
    handleRegex: /^(?:mailto:)?([^\s@]+@[^\s@]+\.[^\s@]+)$/i,
  },
];

const KNOWN_LABELS = new Set(TEMPLATES.map((t) => t.label));

/**
 * If the field already has a recognizable platform URL, pull out the handle so it can be
 * re-applied to a different platform's template. Returns null when the current URL doesn't match
 * any known shape — caller falls back to the new template's placeholder.
 */
function extractHandle(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  for (const tpl of TEMPLATES) {
    const m = tpl.handleRegex.exec(v);
    if (m && m[1]) return m[1];
  }
  return null;
}

type Props = {
  onAdded: () => void;
  /** Renders the "first link" emphasis when the user hasn't featured anything yet. */
  highlightEmpty?: boolean;
};

export function ProfileQuickAdd({ onAdded, highlightEmpty = false }: Props) {
  const t = useTranslations("settings.profile.quickAdd");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  function applyTemplate(tpl: Template) {
    // Preserve the handle the user already typed (or extracted from a different platform's URL).
    // e.g. "github.com/haroya" + Instagram chip → "instagram.com/haroya". Falls back to the new
    // template's placeholder when the field is empty or doesn't match any known shape.
    const handle = extractHandle(url) ?? tpl.placeholder;
    const filled = tpl.urlTemplate.replace("{h}", handle);
    setUrl(filled);
    // Swap the label too when it's still empty or matches some known template's label — meaning
    // the user hasn't customized it. A user-typed label stays.
    if (!label.trim() || KNOWN_LABELS.has(label.trim())) {
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
    <div
      className={
        "space-y-3 rounded-lg border p-4 " +
        (highlightEmpty
          ? "border-accent-300 bg-accent-50/40 ring-1 ring-accent-200"
          : "border-slate-200 bg-white")
      }
    >
      <div>
        <p className={highlightEmpty ? "text-base font-semibold text-slate-900" : "text-sm font-medium text-slate-900"}>
          {highlightEmpty ? t("firstTitle") : t("title")}
        </p>
        <p className="text-[11px] text-slate-500">
          {highlightEmpty ? t("firstHint") : t("hint")}
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
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                {t("add")}
              </>
            )}
          </Button>
        </div>
      </div>

      <TemplatesRow templates={TEMPLATES} onPick={applyTemplate} t={t} />
    </div>
  );
}

/**
 * 9 social-template chips would otherwise eat 2 wrapped rows on every page load even after a user
 * has memorized which one they want. Show {@code DEFAULT_VISIBLE} most-common chips by default
 * and gate the rest behind a "+ N" toggle. State is local; collapses again on profile reload.
 */
const DEFAULT_VISIBLE = 4;

function TemplatesRow({
  templates,
  onPick,
  t,
}: {
  templates: Template[];
  onPick: (tpl: Template) => void;
  t: ReturnType<typeof useTranslations<"settings.profile.quickAdd">>;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? templates : templates.slice(0, DEFAULT_VISIBLE);
  const hidden = templates.length - DEFAULT_VISIBLE;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-500">{t("templatesLabel")}</p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onPick(tpl)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {tpl.label}
          </button>
        ))}
        {!showAll && hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300"
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
