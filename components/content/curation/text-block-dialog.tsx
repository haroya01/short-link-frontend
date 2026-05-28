"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TextAccent, TextLayout } from "@/types";
import { parseTextBlockConfig } from "@/lib/block-config-parsers";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/content/curation/form-field";

const MAX_CHARS = 2000;
const MAX_ICON_CHARS = 8;

const LAYOUTS: readonly TextLayout[] = ["inline", "card", "quote"];
const ACCENTS: readonly TextAccent[] = ["blue", "amber", "green", "red", "violet"];

/** Tailwind swatch class per accent — used in the picker pill to preview the color. */
const ACCENT_SWATCH: Record<TextAccent, string> = {
  blue: "bg-sky-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  violet: "bg-violet-500",
};

type Props = {
  open: boolean;
  /** Current stored content when editing — markdown string or JSON payload. Null when creating. */
  initialContent: string | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Final payload the dialog persists. Plain markdown for legacy/inline-no-extras blocks (keeps
   * existing rows pixel-identical pre/post migration), JSON for any block with non-default layout
   * / accent / icon.
   */
  onSubmit: (content: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Markdown editor for the TEXT block, with optional Toss-style highlight box / quote-rail
 * presentation. Three controls beside the textarea — Layout (inline / card / quote), Accent
 * (5 colors), and Icon (one emoji) — drive the public-card visual treatment. Live preview at the
 * bottom uses the exact same {@link TextEntry} renderer the public page uses so what the seller
 * sees here matches what visitors will see.
 *
 * <p>Persistence: when layout is {@code inline} and there's no accent or icon, we emit the body
 * as a plain markdown string — exactly the v1 shape, so existing rows that round-trip through the
 * dialog don't churn into JSON unless the seller actually picked a non-default style. Anything
 * non-default forces JSON serialization.
 */
export function TextBlockDialog({ open, initialContent, onOpenChange, onSubmit, t }: Props) {
  const [value, setValue] = useState("");
  const [layout, setLayout] = useState<TextLayout>("inline");
  const [accent, setAccent] = useState<TextAccent | null>(null);
  const [icon, setIcon] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initialContent) {
      const parsed = parseTextBlockConfig(initialContent);
      setValue(parsed.body);
      setLayout(parsed.layout);
      setAccent(parsed.accent);
      setIcon(parsed.icon ?? "");
    } else {
      setValue("");
      setLayout("inline");
      setAccent(null);
      setIcon("");
    }
  }, [open, initialContent]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= MAX_CHARS;
  const charCount = value.length;
  const overLimit = charCount > MAX_CHARS;
  const hasExtras = layout !== "inline" || accent != null || icon.trim().length > 0;

  // Live preview content matches what TextEntry would render — same parser, same shape, same
  // markdown stack — so the seller sees the actual visual treatment before saving.
  const previewBody = useMemo(() => trimmed || "", [trimmed]);

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
        if (!hasExtras) {
          // Legacy-shape write — keeps existing inline TEXT blocks pixel-identical even on
          // re-save (no JSON re-serialization churn unless the seller picked a non-default).
          await onSubmit(trimmed);
          return;
        }
        await onSubmit(
          JSON.stringify({
            body: trimmed,
            layout,
            accent: accent ?? null,
            icon: icon.trim() || null,
          }),
        );
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

        <FormField label={t("textFieldLayout")}>
          <div className="flex flex-wrap gap-1.5">
            {LAYOUTS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayout(l)}
                aria-pressed={layout === l}
                className={
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition " +
                  (layout === l
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")
                }
              >
                {t(`textLayout_${l}`)}
              </button>
            ))}
          </div>
        </FormField>

        {layout !== "inline" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("textFieldAccent")}>
              <div className="flex flex-wrap gap-1.5">
                {ACCENTS.map((a) => {
                  const active = accent === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccent(active ? null : a)}
                      aria-pressed={active}
                      aria-label={t(`textAccent_${a}`)}
                      className={
                        "h-7 w-7 rounded-full ring-2 transition " +
                        ACCENT_SWATCH[a] +
                        " " +
                        (active
                          ? "ring-slate-900 ring-offset-2"
                          : "ring-transparent hover:ring-slate-300")
                      }
                    />
                  );
                })}
              </div>
            </FormField>
            {layout === "card" && (
              <FormField label={t("textFieldIcon")}>
                <Input
                  value={icon}
                  maxLength={MAX_ICON_CHARS}
                  placeholder="💡"
                  onChange={(e) => setIcon(e.target.value)}
                />
                <p className="mt-0.5 text-[10px] text-slate-400">{t("textFieldIconHint")}</p>
              </FormField>
            )}
          </div>
        )}

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {t("textPreviewLabel")}
          </p>
          <PreviewPane
            body={previewBody}
            layout={layout}
            accent={accent}
            icon={icon.trim()}
            t={t}
          />
        </div>
      </div>
    </ConfirmDialog>
  );
}

/**
 * Inline preview — same markdown stack and same layout treatments the public page uses, so the
 * seller sees the actual visual rather than a generic preview. Duplicating a couple lines of CSS
 * here instead of importing TextEntry keeps the dialog from pulling in the public-page bundle.
 */
function PreviewPane({
  body,
  layout,
  accent,
  icon,
  t,
}: {
  body: string;
  layout: TextLayout;
  accent: TextAccent | null;
  icon: string;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  if (body.length === 0) {
    return (
      <div className="profile-card-static rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3">
        <p className="text-[11px] italic text-slate-400">{t("textPreviewEmpty")}</p>
      </div>
    );
  }
  const a: TextAccent = accent ?? "blue";
  if (layout === "card") {
    const bg = {
      blue: "bg-sky-50 border-sky-200",
      amber: "bg-amber-50 border-amber-200",
      green: "bg-emerald-50 border-emerald-200",
      red: "bg-rose-50 border-rose-200",
      violet: "bg-violet-50 border-violet-200",
    }[a];
    const iconClass = {
      blue: "bg-sky-100 text-sky-700",
      amber: "bg-amber-100 text-amber-700",
      green: "bg-emerald-100 text-emerald-700",
      red: "bg-rose-100 text-rose-700",
      violet: "bg-violet-100 text-violet-700",
    }[a];
    return (
      <div className={`overflow-hidden rounded-2xl border px-5 py-4 ${bg}`}>
        {icon && (
          <span
            className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-base ${iconClass}`}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <div className="prose-text-block text-slate-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      </div>
    );
  }
  if (layout === "quote") {
    const rail = {
      blue: "border-sky-400",
      amber: "border-amber-400",
      green: "border-emerald-400",
      red: "border-rose-400",
      violet: "border-violet-400",
    }[a];
    return (
      <div className={`border-l-4 pl-4 py-1 ${rail}`}>
        <div className="prose-text-block text-slate-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      </div>
    );
  }
  return (
    <div className="profile-card-static rounded-2xl border-slate-200 bg-slate-50/50 px-4 py-3">
      <div className="prose-text-block">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  );
}
