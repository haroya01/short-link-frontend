import { mockEmpty, mockFailure, request } from "@/lib/api/client";
import { decodeRemoteItems, type RemoteItem, type RemoteNotesBody } from "./remote-trending";

const noteMocks: typeof import("./_mocks") | null =
  process.env.NEXT_PUBLIC_USE_MOCKS === "1" ? require("./_mocks") : null;

export const TOPICS_LIMIT = 20;
export const TOPICS_FULL_LIMIT = 40;
export const TOPIC_POSTS_LIMIT = 20;
const RELATED_MAX = 3;

export interface TopicArticleView {
  url: string | null;
  title: string | null;
  source: string | null;
  image: string | null;
}

/** Backend contract: GET /api/v1/federation/topics?limit= (anonymous allowed). The reader's language
 *  comes from Accept-Language; rows in it carry `own` and come first. `kind` may grow: a kind this
 *  client does not know is skipped. */
export interface TopicView {
  id: string;
  kind: string;
  tag: string | null;
  url: string | null;
  title: string | null;
  source: string | null;
  image: string | null;
  language: string | null;
  own: boolean;
  people: number;
  servers: string[];
  related: TopicArticleView[];
}

export interface TopicsBody {
  items: TopicView[];
}

/** Backend contract: GET /api/v1/federation/topics/posts?tag=|url=&limit=&cursor= (anonymous allowed),
 *  exactly one of tag (no #) and url. `topic` is null when the tag or url is not a current topic;
 *  the items are then notes this server keeps. `next` is opaque. */
export interface TopicPostsBody {
  topic: TopicView | null;
  items: RemoteNotesBody["items"];
  next?: string | null;
}

export interface TopicArticle {
  url: string;
  title: string;
  source: string | null;
}

interface TopicCommon {
  id: string;
  language: string | null;
  own: boolean;
  people: number;
}

export type TagTopic = TopicCommon & { kind: "tag"; tag: string; related: TopicArticle[] };
export type LinkTopic = TopicCommon & { kind: "link"; url: string; title: string | null; source: string | null };
export type Topic = TagTopic | LinkTopic;

export type TopicTarget = { tag: string } | { url: string };

export interface TopicPostsPage {
  topic: Topic | null;
  items: RemoteItem[];
  next: string | null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function https(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function decodeArticle(raw: unknown): TopicArticle | null {
  if (!raw || typeof raw !== "object") return null;
  const view = raw as Partial<TopicArticleView>;
  const url = https(view.url);
  const title = text(view.title);
  return url && title ? { url, title, source: text(view.source) } : null;
}

export function decodeTopic(raw: unknown): Topic | null {
  if (!raw || typeof raw !== "object") return null;
  const view = raw as Partial<TopicView>;
  const common = {
    language: text(view.language)?.toLowerCase() ?? null,
    own: view.own === true,
    people: typeof view.people === "number" && view.people > 0 ? Math.floor(view.people) : 0,
  };
  if (view.kind === "tag") {
    const tag = text(view.tag)?.replace(/^#+/, "");
    if (!tag) return null;
    const related = Array.isArray(view.related)
      ? view.related.flatMap((article) => decodeArticle(article) ?? []).slice(0, RELATED_MAX)
      : [];
    return { ...common, id: text(view.id) ?? `tag:${tag.toLowerCase()}`, kind: "tag", tag, related };
  }
  if (view.kind === "link") {
    const url = https(view.url);
    if (!url) return null;
    return {
      ...common,
      id: text(view.id) ?? `link:${url}`,
      kind: "link",
      url,
      title: text(view.title),
      source: text(view.source),
    };
  }
  return null;
}

export function decodeTopics(raw: unknown): Topic[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  return raw.flatMap((entry) => {
    const topic = decodeTopic(entry);
    if (!topic || ids.has(topic.id)) return [];
    ids.add(topic.id);
    return [topic];
  });
}

export async function listTopics(limit = TOPICS_LIMIT): Promise<Topic[]> {
  const body = noteMocks
    ? await (mockFailure("topics") ?? (mockEmpty("topics") ? { items: [] } : noteMocks.mockTopics(limit)))
    : await request<TopicsBody>(`/api/v1/federation/topics?limit=${limit}`, { method: "GET" });
  return decodeTopics(body?.items);
}

function targetQuery(target: TopicTarget): string {
  return "tag" in target ? `tag=${encodeURIComponent(target.tag)}` : `url=${encodeURIComponent(target.url)}`;
}

export async function listTopicPosts(target: TopicTarget, cursor: string | null = null): Promise<TopicPostsPage> {
  const page = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
  const body = noteMocks
    ? await (mockFailure("topic-posts") ?? noteMocks.mockTopicPosts(target, cursor))
    : await request<TopicPostsBody>(
        `/api/v1/federation/topics/posts?${targetQuery(target)}&limit=${TOPIC_POSTS_LIMIT}${page}`,
        { method: "GET" },
      );
  return {
    topic: decodeTopic(body?.topic),
    items: decodeRemoteItems(body?.items),
    next: typeof body?.next === "string" && body.next !== "" ? body.next : null,
  };
}
