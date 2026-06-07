"use client";

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { issuePreviewToken } from "@/modules/blog/api/posts";

/**
 * "미리보기 링크 복사" — issues the post's share token and copies a {slug}?preview={token} link to the
 * clipboard, so the owner can show a not-yet-public draft without publishing it. Lives in the publish
 * dialog footer for non-published posts. Quiet, secondary styling (it's an aside to the publish CTA).
 */
export function PreviewLinkButton({
  postId,
  username,
  slug,
}: {
  postId: number;
  username: string | null | undefined;
  slug: string;
}) {
  const t = useTranslations("postEditor");
  const locale = useLocale();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (busy || !username) return;
    setBusy(true);
    try {
      const { token } = await issuePreviewToken(postId);
      const url = `${window.location.origin}/${locale}/p/${username}/${slug}?preview=${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(t("previewCopied"), "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("previewCopyError"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={busy || !username}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
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
