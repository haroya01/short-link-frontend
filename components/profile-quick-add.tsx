"use client";

import { useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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

type Template = { id: string; label: string; urlTemplate: string; placeholder: string };

const TEMPLATES: Template[] = [
  { id: "instagram", label: "Instagram", urlTemplate: "https://instagram.com/{h}", placeholder: "haroya" },
  { id: "x", label: "X", urlTemplate: "https://x.com/{h}", placeholder: "haroya" },
  { id: "youtube", label: "YouTube", urlTemplate: "https://youtube.com/@{h}", placeholder: "haroya" },
  { id: "tiktok", label: "TikTok", urlTemplate: "https://tiktok.com/@{h}", placeholder: "haroya" },
  { id: "github", label: "GitHub", urlTemplate: "https://github.com/{h}", placeholder: "haroya" },
  { id: "kakao", label: "카카오톡 채널", urlTemplate: "https://pf.kakao.com/_{h}", placeholder: "abcDEF" },
  { id: "naver-blog", label: "네이버 블로그", urlTemplate: "https://blog.naver.com/{h}", placeholder: "haroya" },
  { id: "velog", label: "Velog", urlTemplate: "https://velog.io/@{h}", placeholder: "haroya" },
  // Email is a special case — we don't show the technical "mailto:" prefix in the field; the
  // input is just an address and we add the scheme on submit (see normalizeScheme).
  { id: "email", label: "Email", urlTemplate: "{h}", placeholder: "you@example.com" },
];

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
    // Don't overwrite an in-progress URL — chips are for filling an empty field. If the user
    // already typed something, just give the URL field focus so they can keep editing.
    if (url.trim()) {
      urlInputRef.current?.focus();
      return;
    }
    const filled = tpl.urlTemplate.replace("{h}", tpl.placeholder);
    setUrl(filled);
    if (!label) setLabel(tpl.label);
    requestAnimationFrame(() => {
      const el = urlInputRef.current;
      if (!el) return;
      el.focus();
      const start = tpl.urlTemplate.indexOf("{h}");
      if (start >= 0) el.setSelectionRange(start, start + tpl.placeholder.length);
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

      <div className="space-y-1.5">
        <p className="text-[11px] text-slate-500">{t("templatesLabel")}</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {tpl.label}
            </button>
          ))}
        </div>
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
