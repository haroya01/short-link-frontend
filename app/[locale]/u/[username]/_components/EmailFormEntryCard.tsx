"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { submitEmailLead } from "@/lib/api";
import { parseEmailFormConfig } from "@/lib/block-config-parsers";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  id: number;
  /** JSON config persisted by the backend ({@code {title, placeholder, successMessage}}). */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Visitor-facing email capture form. Renders the EMAIL_FORM block as a single-input + submit
 * button. On success it swaps to the success message permanently (per-render only — no localStorage)
 * so the visitor doesn't accidentally resubmit. Errors keep the form available with an inline note.
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
        <p className={`text-sm font-semibold ${colors.primary}`}>{config.title}</p>
        {status === "done" ? (
          <p className={`mt-2 text-[12px] ${colors.muted}`}>
            {config.successMessage ?? t("defaultSuccess")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={config.placeholder ?? t("defaultPlaceholder")}
              maxLength={254}
              disabled={status === "submitting"}
              className={`flex-1 rounded-md border bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none ring-accent-500 placeholder:text-slate-400 focus:ring-2 ${colors.cardBorder}`}
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className={`rounded-md px-3 py-2 text-[13px] font-medium transition disabled:opacity-60 ${colors.ctaPrimary}`}
            >
              {status === "submitting" ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-2 text-[11px] text-red-500">{t("error")}</p>
        )}
      </div>
    </li>
  );
}

