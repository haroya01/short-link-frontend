"use client";

import { useMemo, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TextAccent, TextLayout } from "@/types";
import { parseTextBlockConfig } from "@/lib/block-config-parsers";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Per-accent surface treatment for {@code card} / {@code quote} layouts. Kept as a static map of
 * full Tailwind class names (no string interpolation) so the JIT picks them up at build time.
 */
const CARD_ACCENT_CLASSES: Record<TextAccent, { bg: string; border: string; icon: string }> = {
  blue: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: "bg-sky-100 text-sky-700",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "bg-amber-100 text-amber-700",
  },
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "bg-emerald-100 text-emerald-700",
  },
  red: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: "bg-rose-100 text-rose-700",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "bg-violet-100 text-violet-700",
  },
};

const QUOTE_RAIL_CLASS: Record<TextAccent, string> = {
  blue: "border-sky-400",
  amber: "border-amber-400",
  green: "border-emerald-400",
  red: "border-rose-400",
  violet: "border-violet-400",
};

/**
 * TEXT block on the public profile. Stored content can be either:
 *
 * <ul>
 *   <li>Legacy plain markdown string — renders as the v1 inline card.</li>
 *   <li>JSON {@code {body, layout, accent, icon}} — renders {@code body} inside the chosen
 *       layout: {@code inline} (v1), {@code card} (tinted highlight box, Toss-style), or
 *       {@code quote} (accent left-rail + indent).</li>
 * </ul>
 *
 * <p>Markdown source goes through {@link ReactMarkdown} + {@code remark-gfm} for GFM autolinks /
 * tables / strikethrough. Raw HTML is silently stripped by react-markdown's default so a malicious
 * paste can't inject scripts or {@code <iframe>}s; the backend caps body length at 2000 chars.
 *
 * <p>Wrapper class depends on layout: {@code inline} uses {@code .profile-card-static} so it sits
 * in the same surface family as link / event / email blocks; {@code card} and {@code quote} drop
 * that wrapper and bring their own surface so the accent color reads as the dominant treatment
 * rather than a tint over the standard card background.
 */
export function TextEntry({ content, colors, fadeStyle }: Props) {
  const config = useMemo(() => parseTextBlockConfig(content), [content]);
  if (!config.body.trim()) return null;
  const accent = config.accent ?? "blue";

  if (config.layout === "card") {
    const { bg, border, icon } = CARD_ACCENT_CLASSES[accent];
    return (
      <li className="profile-fade" style={fadeStyle}>
        <div className={`relative overflow-hidden rounded-2xl border px-5 py-4 ${bg} ${border}`}>
          {config.icon && (
            <span
              className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-base ${icon}`}
              aria-hidden
            >
              {config.icon}
            </span>
          )}
          <div className="prose-text-block text-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{config.body}</ReactMarkdown>
          </div>
        </div>
      </li>
    );
  }

  if (config.layout === "quote") {
    const rail = QUOTE_RAIL_CLASS[accent];
    return (
      <li className="profile-fade" style={fadeStyle}>
        <div className={`border-l-4 pl-4 py-1 ${rail}`}>
          <div className={`prose-text-block ${colors.primary}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{config.body}</ReactMarkdown>
          </div>
        </div>
      </li>
    );
  }

  // Inline (default / legacy) — unchanged from the v1 TextEntry to keep existing TEXT blocks
  // pixel-identical after the JSON-payload migration.
  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        className={`profile-card-static prose-text-block px-4 py-4 ${colors.card} ${colors.cardBorder} ${colors.primary}`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{config.body}</ReactMarkdown>
      </div>
    </li>
  );
}
