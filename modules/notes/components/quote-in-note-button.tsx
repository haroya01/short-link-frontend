"use client";

import { useState } from "react";
import { Quote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { askToSignIn } from "@/components/auth/login-prompt";
import { useToast } from "@/components/ui/toast";
import { emitPostQuoted } from "@/modules/blog/lib/consequence-events";
import { openNote } from "@/modules/notes/lib/note-href";
import { NoteQuoteDialog } from "./note-quote-dialog";

export function QuoteInNoteButton({
  postId,
  title,
  slug,
  authorUsername,
}: {
  postId: number;
  title: string;
  slug: string;
  authorUsername: string;
}) {
  const t = useTranslations("notes");
  const locale = useLocale();
  const router = useRouter();
  const { authenticated } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => (authenticated ? setOpen(true) : askToSignIn("quote"))}
        aria-label={t("quoteAction")}
        title={t("quoteAction")}
        className="touch-target inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-[14px] font-medium text-slate-500 transition-colors hover:text-accent-700 focus-ring dark:text-slate-400 dark:hover:text-accent-400"
      >
        <Quote className="h-4 w-4" aria-hidden />
        <span>{t("quoteLabel")}</span>
      </button>
      <NoteQuoteDialog
        quoted={open ? { post: { id: postId, title, slug, authorUsername } } : null}
        onClose={() => setOpen(false)}
        onPosted={(note) => {
          setOpen(false);
          toast(t("quotePosted"), "default", {
            action: { label: t("viewNote"), onClick: () => openNote(note, locale, router.push) },
          });
          emitPostQuoted(postId, note);
        }}
      />
    </>
  );
}
