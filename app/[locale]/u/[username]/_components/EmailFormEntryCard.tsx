"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { submitEmailLead } from "@/lib/api";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  id: number;
  /** JSON config persisted by the backend ({@code {title, placeholder, successMessage}}). */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

type Config = {
  title: string;
  placeholder: string | null;
  successMessage: string | null;
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

  const config = parseConfig(content);

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
        className={`rounded-xl border px-4 py-4 ${colors.card} ${colors.cardBorder}`}
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
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
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

function parseConfig(raw: string): Config {
  try {
    const parsed = JSON.parse(raw);
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      placeholder: typeof parsed.placeholder === "string" ? parsed.placeholder : null,
      successMessage:
        typeof parsed.successMessage === "string" ? parsed.successMessage : null,
    };
  } catch {
    return { title: raw, placeholder: null, successMessage: null };
  }
}
