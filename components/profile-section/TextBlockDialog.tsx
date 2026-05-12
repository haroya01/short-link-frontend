"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ConfirmDialog } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { FormField } from "./FormField";

const MAX_CHARS = 2000;

type Props = {
  open: boolean;
  /** Current markdown content when editing; null when creating. */
  initialContent: string | null;
  onOpenChange: (open: boolean) => void;
  /** Final markdown source the dialog persists. */
  onSubmit: (content: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Markdown editor for the TEXT block — replaces the prior {@code window.prompt} flow so the seller
 * can use the same dialog idiom (and styling) the booking / event / product blocks use, and
 * actually see what their formatting looks like before they save.
 *
 * <p>Two-pane stacked layout: textarea on top, live preview below. The preview renders with the
 * same {@link ReactMarkdown} + {@code remark-gfm} stack the public page uses, so what the seller
 * sees here matches what visitors will see in their TEXT card. GFM gives the markdown niceties
 * (tables, strike, autolinks) most sellers expect without us writing a custom parser.
 *
 * <p>Safety: react-markdown strips raw HTML by default, so the seller can paste any string they
 * want and we never end up rendering an inline {@code <script>}. Backend caps length at 2000 so
 * the block doesn't become a long-form essay surface.
 */
export function TextBlockDialog({ open, initialContent, onOpenChange, onSubmit, t }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(initialContent ?? "");
  }, [open, initialContent]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= MAX_CHARS;
  const charCount = value.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialContent ? t("editTextTitle") : t("addTextTitle")}
      description={t("addTextDescription")}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      maxWidthClass="max-w-2xl"
      onConfirm={async () => {
        if (!canSave) return;
        await onSubmit(trimmed);
      }}
    >
      <div className="space-y-3">
        <FormField label={t("textFieldContent")}>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("textFieldPlaceholder")}
            rows={6}
            maxLength={MAX_CHARS + 100}
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-slate-500">
              <Sparkles className="h-3 w-3" />
              {t("textMarkdownHint")}
            </span>
            <span className={overLimit ? "text-red-600" : "text-slate-400"}>
              {charCount}/{MAX_CHARS}
            </span>
          </div>
        </FormField>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {t("textPreviewLabel")}
          </p>
          <div className="profile-card-static rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3">
            {trimmed.length === 0 ? (
              <p className="text-[11px] italic text-slate-400">{t("textPreviewEmpty")}</p>
            ) : (
              <div className="prose-text-block">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}
