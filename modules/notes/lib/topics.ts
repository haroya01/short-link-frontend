import type { NoteLinkPreview } from "@/modules/notes/api/notes";
import type { Topic } from "@/modules/notes/api/topics";
import { textWithoutCardedLink } from "./note-text";

export const TOPIC_ROWS = 10;
const START_TAGS = 5;

export interface TopicRow {
  topic: Topic;
  rank: number;
}

export interface TopicGroups {
  own: TopicRow[];
  other: TopicRow[];
  more: boolean;
}

export function topicGroups(topics: readonly Topic[], cap: number | null = TOPIC_ROWS): TopicGroups {
  const ordered = [...topics.filter((topic) => topic.own), ...topics.filter((topic) => !topic.own)];
  const rows = (cap === null ? ordered : ordered.slice(0, cap)).map((topic, index) => ({ topic, rank: index + 1 }));
  return {
    own: rows.filter((row) => row.topic.own),
    other: rows.filter((row) => !row.topic.own),
    more: cap !== null && ordered.length > cap,
  };
}

export function languageName(code: string | null, locale: string): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "language", fallback: "none" }).of(code) ?? null;
  } catch {
    return null;
  }
}

export function linkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function topicMeta(topic: Topic, locale: string): string | null {
  const language = topic.own ? null : languageName(topic.language, locale);
  const source = topic.kind === "link" ? topic.source || linkHost(topic.url) : null;
  const parts = [source, language].filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function topicTitle(topic: Topic): string {
  if (topic.kind === "tag") return `#${topic.tag}`;
  return topic.title ?? topic.url.replace(/^https:\/\//, "");
}

export function startTags(topics: readonly Topic[]): string[] {
  const tags = topicGroups(topics, null);
  return [...tags.own, ...tags.other]
    .flatMap((row) => (row.topic.kind === "tag" ? [row.topic.tag] : []))
    .slice(0, START_TAGS);
}

export function sameLink(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

export function repeatsPageLink(body: string, preview: NoteLinkPreview | null, pageUrl: string | null): boolean {
  if (!pageUrl || !preview || !sameLink(pageUrl, preview.url)) return false;
  return textWithoutCardedLink(body, preview.url).trim() !== "";
}
