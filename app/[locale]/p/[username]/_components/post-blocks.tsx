import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Markdown } from "@/modules/blog/components/markdown";
import { KurlLinkCard } from "@/modules/blog/components/kurl-link-card";
import { PostCode } from "@/modules/blog/components/post-code";
import { PostImage } from "@/modules/blog/components/post-image";
import type { TocHeading } from "@/modules/blog/components/post-toc";
import type { ImageWidth } from "@/modules/blog/lib/image-width";
import { kurlShortCode } from "@/modules/blog/lib/kurl-link";
import { planEmbed } from "@/modules/blog/lib/post-embed";
import { slugify } from "@/modules/blog/lib/slugify";
import type { PublicCtaInfo, PublicPostBlock } from "@/modules/blog/api/public-posts";

const HEADING_TYPES = ["H1", "H2", "H3"];

/**
 * editor heading level (1/2/3) → 0-based rank among the levels ACTUALLY present in the post. The
 * body renders rank+2 (h2→h3→h4) so the outline is a contiguous run under the page <h1> (the post
 * title) with no skipped levels — valid even when an author starts at H2/H3 instead of H1.
 */
function headingRanks(blocks: PublicPostBlock[]): Map<number, number> {
  const present = [
    ...new Set(
      blocks
        .filter((b) => HEADING_TYPES.includes(b.type) && b.content?.trim())
        .map((b) => Number(b.type[1])),
    ),
  ].sort((a, b) => a - b);
  return new Map(present.map((lvl, i) => [lvl, i]));
}

/** Headings for the floating TOC. `level` is the 1-based rank (mirrors the body's contiguous run)
 *  so the TOC indentation matches the rendered heading depth. */
export function extractHeadings(blocks: PublicPostBlock[]): TocHeading[] {
  const ranks = headingRanks(blocks);
  return blocks
    .filter((b) => HEADING_TYPES.includes(b.type) && b.content?.trim())
    .map((b) => ({
      id: slugify(b.content as string),
      text: (b.content as string).trim(),
      level: (ranks.get(Number(b.type[1])) ?? 0) + 1,
    }))
    .filter((h) => h.id.length > 0);
}

/**
 * Renders the ordered post blocks as a long-form article body. Each block becomes a discrete
 * semantic element under `.prose-post` (see globals.css) which carries the editorial typography.
 * Server component — no client state; the only interactive bits are plain anchors.
 */
export function ArticleBody({
  blocks,
  postId,
}: {
  blocks: PublicPostBlock[];
  /** When set, kurl links embedded in the post carry `?post=` so their clicks attribute here. */
  postId?: number;
}) {
  const ranks = headingRanks(blocks);
  return (
    <div className="prose-post">
      {blocks.map((block, i) => (
        <Block key={i} block={block} ranks={ranks} postId={postId} />
      ))}
    </div>
  );
}

/** Append `?post=` to a kurl short link so the redirect attributes the click to this post. */
function withPostParam(url: string, postId?: number): string {
  if (!postId || !kurlShortCode(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}post=${postId}`;
}

/** Rough read-time estimate from the textual blocks. CJK-leaning: ~500 chars/min. */
export function readingMinutes(blocks: PublicPostBlock[]): number {
  let chars = 0;
  for (const b of blocks) {
    if (!b.content) continue;
    if (b.type === "LIST_BULLET" || b.type === "LIST_NUMBERED") {
      chars += parseList(b.content).join(" ").length;
    } else if (["PARAGRAPH", "H1", "H2", "H3", "QUOTE"].includes(b.type)) {
      chars += b.content.length;
    }
  }
  return Math.max(1, Math.round(chars / 500));
}

function Block({
  block,
  ranks,
  postId,
}: {
  block: PublicPostBlock;
  ranks: Map<number, number>;
  postId?: number;
}) {
  switch (block.type) {
    case "PARAGRAPH":
      return block.content ? <Markdown>{block.content}</Markdown> : null;
    case "H1":
    case "H2":
    case "H3": {
      if (!block.content) return null;
      // rank+2 → h2/h3/h4, contiguous so the page outline never skips a level.
      const Tag = `h${(ranks.get(Number(block.type[1])) ?? 0) + 2}` as "h2" | "h3" | "h4";
      const id = slugify(block.content);
      // Self-link so the heading is a copyable deep-link; a hover "#" marker is added in `.prose-post`.
      return (
        <Tag id={id}>
          <a href={`#${id}`}>{block.content}</a>
        </Tag>
      );
    }
    case "QUOTE":
      return block.content ? (
        <blockquote>
          <Markdown inline>{block.content}</Markdown>
        </blockquote>
      ) : null;
    case "DIVIDER":
      return <div className="section-divider my-12" role="separator" />;
    case "LIST_BULLET":
      return <ListBlock content={block.content} ordered={false} />;
    case "LIST_NUMBERED":
      return <ListBlock content={block.content} ordered />;
    case "IMAGE":
      return <ImageBlock content={block.content} />;
    case "CODE":
      return <CodeBlock content={block.content} />;
    case "TABLE":
      return block.content ? <Markdown>{block.content}</Markdown> : null;
    case "EMBED":
      return <EmbedBlock content={block.content} postId={postId} />;
    case "CTA_REF":
      return <CtaBlock cta={block.cta} postId={postId} />;
    default:
      return null;
  }
}

function parseList(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return content.split("\n").filter(Boolean);
  }
  return [];
}

function ListBlock({ content, ordered }: { content: string | null; ordered: boolean }) {
  if (!content) return null;
  // New format = raw markdown (supports nested lists via remark-gfm). Legacy = JSON array of flat
  // strings → render as a single-level ul/ol.
  let legacy: string[] | null = null;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) legacy = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // raw markdown
  }
  if (legacy) {
    if (legacy.length === 0) return null;
    const Tag = ordered ? "ol" : "ul";
    return (
      <Tag>
        {legacy.map((item, i) => (
          <li key={i}>
            <Markdown inline>{item}</Markdown>
          </li>
        ))}
      </Tag>
    );
  }
  return <Markdown>{content}</Markdown>;
}

function ImageBlock({ content }: { content: string | null }) {
  if (!content) return null;
  let url: string | null = null;
  let alt = "";
  let caption = "";
  let width: ImageWidth | undefined;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      url = typeof parsed.url === "string" ? parsed.url : null;
      alt = typeof parsed.alt === "string" ? parsed.alt : "";
      caption = typeof parsed.caption === "string" ? parsed.caption : "";
      width =
        parsed.width === "wide" || parsed.width === "full" || parsed.width === "half"
          ? parsed.width
          : undefined;
    }
  } catch {
    url = content.trim();
  }
  if (!url) return null;
  return <PostImage src={url} alt={alt} caption={caption} width={width} />;
}

function CodeBlock({ content }: { content: string | null }) {
  if (!content) return null;
  let lang = "";
  let code = "";
  try {
    const parsed = JSON.parse(content);
    lang = typeof parsed?.lang === "string" ? parsed.lang : "";
    code = typeof parsed?.code === "string" ? parsed.code : "";
  } catch {
    code = content; // tolerate a plain-string legacy payload
  }
  if (!code) return null;
  return <PostCode lang={lang} code={code} />;
}

function EmbedBlock({ content, postId }: { content: string | null; postId?: number }) {
  // A kurl short link → live link-stats card (the "post backed by measured links" signal). The
  // outbound url carries ?post= so the click attributes to this post ("이 글이 만든 클릭").
  const code = content ? kurlShortCode(content) : null;
  if (code && content)
    return <KurlLinkCard code={code} url={withPostParam(content.trim(), postId)} />;

  const plan = planEmbed(content);
  if (!plan) return null;
  if (plan.kind === "video") {
    return (
      <div className="my-8 overflow-hidden rounded-2xl bg-slate-900">
        <div className="relative aspect-video">
          <iframe
            src={plan.src}
            title="Embedded media"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    );
  }
  let host = plan.url;
  try {
    host = new URL(plan.url).host.replace(/^www\./, "");
  } catch {
    // keep raw
  }
  return (
    <a
      href={plan.url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-8 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 no-underline transition-colors hover:border-accent-300 hover:bg-accent-50/50"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">{host}</span>
        <span className="block truncate text-[13px] text-slate-500">{plan.url}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-accent-600" />
    </a>
  );
}

async function CtaBlock({ cta, postId }: { cta: PublicCtaInfo | null; postId?: number }) {
  if (!cta || cta.deleted) {
    const t = await getTranslations("publicPost");
    return (
      <div className="my-8 rounded-2xl border border-dashed border-slate-200 px-5 py-4 text-center text-sm text-slate-400">
        {cta?.label ? t("ctaUnavailable", { label: cta.label }) : t("ctaDeleted")}
      </div>
    );
  }
  const primary = cta.style === "PRIMARY";
  const base =
    "my-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold no-underline transition-colors";
  const tone = primary
    ? "bg-accent-600 text-white hover:bg-accent-700"
    : "border border-slate-200 text-slate-900 hover:border-accent-300 hover:bg-accent-50/50";
  return (
    <a
      href={withPostParam(cta.url, postId)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${tone}`}
    >
      {cta.label}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}
