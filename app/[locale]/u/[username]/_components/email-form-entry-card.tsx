"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { submitEmailLead } from "@/lib/api";
import { parseEmailFormConfig } from "@/modules/profile/lib/block-config-parsers";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  id: number;
  /** JSON config persisted by the backend ({@code {title, subtitle, placeholder, successMessage}}). */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Visitor-facing email capture form. Renders the EMAIL_FORM block as
 * title → optional subtitle → input + submit → small trust footer. On success it swaps to the
 * success message (per-render only — no localStorage) so the visitor doesn't accidentally resubmit;
 * a quiet "다시 보내기" resets to the form so a typo'd address isn't a dead end. Errors keep the form
 * available with an inline note.
 *
 * <p>The trust footer is a deliberate addition (PR #...) — sellers were collecting emails without
 * any visitor-side reassurance about where the address goes, and visitors hesitated to submit.
 * The footer makes the implicit "this goes to {profile owner}" explicit + signals no spam.
 */
export function EmailFormEntryCard({ id, content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.emailForm");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const config = parseEmailFormConfig(content);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting" || status === "done") return;
    setStatus("submitting");
    try {
      await submitEmailLead(id, email.trim());
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        className={`profile-card-static px-4 py-3.5 ${colors.card} ${colors.cardBorder}`}
      >
        <p className={`text-[15px] font-semibold tracking-headline ${colors.primary}`}>{config.title}</p>
        {config.subtitle && (
          <p className={`mt-1 whitespace-pre-line text-[12px] leading-snug ${colors.muted}`}>
            {config.subtitle}
          </p>
        )}
        {status === "done" ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className={`text-[12px] ${colors.muted}`}>
              {config.successMessage ?? t("defaultSuccess")}
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail("");
                setStatus("idle");
              }}
              className={`text-[11px] underline underline-offset-2 transition-opacity hover:opacity-80 ${colors.muted}`}
            >
              {t("sendAgain")}
            </button>
          </div>
        ) : (
          <>
            {/* Input + submit share the same h-10 rounded-xl shell so they read as one paired
                control (matches the Primary CTA scale in AGENTS.md §1 — h-10 rounded-xl text-[13px]).
                Earlier rounded-md / no explicit height made the submit look like a generic ghost
                button next to the input, breaking the Action archetype's voice. */}
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={config.placeholder ?? t("defaultPlaceholder")}
                maxLength={254}
                disabled={status === "submitting"}
                className={`h-10 flex-1 rounded-xl border bg-white/90 px-3 text-sm text-slate-900 outline-none ring-accent-600 placeholder:text-slate-400 focus:ring-2 ${colors.cardBorder}`}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className={`h-10 rounded-xl px-4 text-[13px] font-medium transition active:scale-[0.98] disabled:opacity-60 ${colors.ctaPrimary}`}
              >
                {status === "submitting" ? t("submitting") : t("submit")}
              </button>
            </form>
            <p className={`mt-1.5 flex items-center gap-1 text-[10px] ${colors.muted}`}>
              <Lock className="h-2.5 w-2.5" aria-hidden />
              {t("trustHint")}
            </p>
          </>
        )}
        {status === "error" && (
          <p className="mt-2 text-[11px] text-red-500">{t("error")}</p>
        )}
      </div>
    </li>
  );
}
