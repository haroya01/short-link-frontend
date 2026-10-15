"use client";

import { useEffect, useId, useState } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { setNoteReplyPolicy, type NoteReplyPolicy } from "@/modules/notes/api/notes";

export const REPLY_POLICIES: NoteReplyPolicy[] = ["everyone", "following", "mentioned"];

export const REPLY_POLICY_LABEL: Record<NoteReplyPolicy, string> = {
  everyone: "replyPolicyEveryone",
  following: "replyPolicyFollowing",
  mentioned: "replyPolicyMentioned",
};

export function replyRestrictedKey(policy: NoteReplyPolicy | undefined): string {
  if (policy === "following") return "replyRestrictedFollowing";
  if (policy === "mentioned") return "replyRestrictedMentioned";
  return "replyRestricted";
}

export function ReplyRestricted({ policy }: { policy: NoteReplyPolicy | undefined }) {
  const t = useTranslations("notes");
  return (
    <p
      data-testid="reply-restricted"
      className="flex items-center gap-2 py-4 text-[14px] text-slate-500 dark:text-slate-400"
    >
      <Lock className="h-4 w-4 shrink-0" aria-hidden />
      {t(replyRestrictedKey(policy))}
    </p>
  );
}

export function ReplyPolicyDialog({
  noteId,
  current,
  open,
  onClose,
  onSaved,
}: {
  noteId: number;
  current: NoteReplyPolicy;
  open: boolean;
  onClose: () => void;
  onSaved: (policy: NoteReplyPolicy) => void;
}) {
  const t = useTranslations("notes");
  const { toast } = useToast();
  const name = useId();
  const [choice, setChoice] = useState(current);

  useEffect(() => {
    if (open) setChoice(current);
  }, [open, current]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t("replyPolicyTitle")}
      confirmLabel={t("replyPolicySave")}
      confirmVariant="accent"
      compact
      onConfirm={async () => {
        if (choice === current) return;
        try {
          const saved = await setNoteReplyPolicy(noteId, choice);
          onSaved(saved.replyPolicy);
          toast(t("replyPolicySaved"));
        } catch (error) {
          toast(t("replyPolicyFailed"), "error");
          throw error;
        }
      }}
    >
      <fieldset className="space-y-1">
        <legend className="sr-only">{t("replyPolicyLabel")}</legend>
        {REPLY_POLICIES.map((policy) => (
          <label
            key={policy}
            className="flex cursor-pointer items-center gap-3 rounded-surface px-2 py-2 text-[14px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <input
              type="radio"
              name={name}
              value={policy}
              checked={choice === policy}
              onChange={() => setChoice(policy)}
              className="accent-accent-700"
            />
            {t(REPLY_POLICY_LABEL[policy])}
          </label>
        ))}
      </fieldset>
      <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">{t("replyPolicyHint")}</p>
    </ConfirmDialog>
  );
}
