"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { unblockAuthor, useBlockedNames } from "@/modules/blog/lib/user-blocks";

/** On a blocked author's page, says why their posts and notes are gone and offers the way back. */
export function BlockedAuthorNotice({ username }: { username: string }) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const blocked = useBlockedNames().has(username);
  if (!blocked) return null;

  async function unblock() {
    try {
      await unblockAuthor(username);
      toast(t("unblockedToast", { username }));
    } catch {
      toast(t("unblockFailed"), "error");
    }
  }

  return (
    <div
      role="status"
      data-testid="author-blocked"
      className="mt-4 flex items-center justify-between gap-3 rounded-surface border border-slate-200 px-4 py-3 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300"
    >
      <span>{t("blockedAuthorNotice")}</span>
      <button
        type="button"
        onClick={() => void unblock()}
        className="focus-ring shrink-0 rounded text-[13px] font-medium text-accent-700 hover:underline dark:text-accent-300"
      >
        {t("unblock")}
      </button>
    </div>
  );
}
