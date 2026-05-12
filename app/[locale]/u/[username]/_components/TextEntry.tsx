"use client";

import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * TEXT block on the public profile. The block used to be a single-line header (rendered as a bare
 * {@code <h2>}) but it now stores markdown source — headings, lists, links, the usual — so each
 * block reads as a tiny Notion-style document card sitting in the feed.
 *
 * <p>Rendering goes through {@link ReactMarkdown} + {@code remark-gfm}. GFM gives autolinks /
 * tables / strikethrough — the niceties sellers expect when they paste from Notion or Slack.
 * Raw HTML is silently stripped (react-markdown's default) so a malicious paste can't inject
 * scripts or {@code <iframe>}s; the backend already caps length at 2000 chars.
 *
 * <p>Wrapper uses {@code .profile-card-static} so the TEXT block sits in the same surface family
 * as the link / event / email blocks. Notion-flavored typography lives in {@code globals.css}
 * under {@code .prose-text-block} — h-tags, lists, code, links all sized for a profile column
 * (smaller than a Notion doc would be at full width).
 *
 * <p>Backward compat: a stored value of {@code "📌 SNS"} (the legacy header use case) renders as
 * a single paragraph in the new card. Still legible, just no longer reading as a section
 * heading; sellers who want the heading look can prefix with {@code "# "} or {@code "## "}.
 */
export function TextEntry({ content, colors, fadeStyle }: Props) {
  if (!content?.trim()) return null;
  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        className={`profile-card-static prose-text-block px-4 py-4 ${colors.card} ${colors.cardBorder} ${colors.primary}`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </li>
  );
}
