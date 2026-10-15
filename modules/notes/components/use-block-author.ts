"use client";

import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { blockAuthor, unblockAuthor, useBlockedNames } from "@/modules/blog/lib/user-blocks";

/** Block / unblock one author with the shared confirmation and toasts — the same in every menu. */
export function useBlockAuthor(username: string, { layerClassName }: { layerClassName?: string } = {}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm({ layerClassName });
  const blocked = useBlockedNames().has(username);

  async function block() {
    const ok = await confirm({
      title: t("blockTitle", { username }),
      description: t("blockHint"),
      confirmLabel: t("block"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await blockAuthor(username);
      toast(t("blockedToast", { username }));
    } catch {
      toast(t("blockFailed"), "error");
    }
  }

  async function unblock() {
    try {
      await unblockAuthor(username);
      toast(t("unblockedToast", { username }));
    } catch {
      toast(t("unblockFailed"), "error");
    }
  }

  return { blocked, block, unblock, confirmDialog };
}
