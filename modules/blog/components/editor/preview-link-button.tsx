"use client";

import { useState } from "react";
import { Check, Eye, Link2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { getPost, issuePreviewToken } from "@/modules/blog/api/posts";
import { postHref } from "@/modules/blog/lib/author-href";
import { useApiErrorMessage } from "@/lib/error-messages";

type PreviewProps = {
  postId: number;
  username: string | null | undefined;
  onSave: () => Promise<boolean>;
};

/** Preview reads the server draft. Flush edits first and use its persisted (normalized) slug, otherwise
 *  a preview right after editing can show stale content or a nonexistent URL. Null when the save failed. */
async function previewUrl(postId: number, username: string, locale: string, onSave: () => Promise<boolean>) {
  if (!(await onSave())) return null;
  const { token } = await issuePreviewToken(postId);
  const post = await getPost(postId);
  const url = new URL(postHref(username, post.slug, locale), window.location.origin);
  url.searchParams.set("preview", token);
  return url.href;
}

/** The tab opens inside the click, before the save and token round trips, or a popup blocker stops it. */
export function PreviewOpenButton({ postId, username, onSave, iconOnly = false }: PreviewProps & { iconOnly?: boolean }) {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (busy || !username) return;
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const url = await previewUrl(postId, username, locale, onSave);
      if (!url) {
        tab?.close();
        return;
      }
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      tab?.close();
      toast(errorMessage(e, t("previewOpenError")), "error");
    } finally {
      setBusy(false);
    }
  }

  const icon = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />;
  if (iconOnly)
    return (
      <button
        type="button"
        onClick={() => void open()}
        disabled={busy || !username}
        aria-label={t("preview")}
        title={t("preview")}
        className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        {icon}
      </button>
    );
  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={busy || !username}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
    >
      {icon}
      {t("preview")}
    </button>
  );
}

/**
 * "미리보기 링크 복사" — the same token link on the clipboard, to show a not-yet-public draft to someone
 * else. Secondary to opening the preview: quiet, text-only.
 */
export function PreviewLinkButton({ postId, username, onSave }: PreviewProps) {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (busy || !username) return;
    setBusy(true);
    try {
      const url = await previewUrl(postId, username, locale, onSave);
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(t("previewCopied"), "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast(errorMessage(e, t("previewCopyError")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={busy || !username}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      {copied ? t("previewCopiedShort") : t("previewCopyLink")}
    </button>
  );
}
