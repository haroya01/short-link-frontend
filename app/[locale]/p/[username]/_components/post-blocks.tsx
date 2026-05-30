import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Markdown } from "@/modules/blog/components/markdown";
import { KurlLinkCard } from "@/modules/blog/components/kurl-link-card";
import { PostImage } from "@/modules/blog/components/post-image";
import type { TocHeading } from "@/modules/blog/components/post-toc";
import { fenceFor } from "@/modules/blog/lib/markdown-to-blocks";
import { kurlShortCode } from "@/modules/blog/lib/kurl-link";
import { planEmbed } from "@/modules/blog/lib/post-embed";
import { slugify } from "@/modules/blog/lib/slugify";
import type { PublicCtaInfo, PublicPostBlock } from "@/modules/blog/api/public-posts";

const HEADING_TYPES = ["H1", "H2", "H3"];

/** Headings for the floating TOC. Levels collapse H1/H2/H3 → 1/2/3 to mirror the body mapping. */
export function extractHeadings(blocks: PublicPostBlock[]): TocHeading[] {
  return blocks
    .filter((b) => HEADING_TYPES.includes(b.type) && b.content?.trim())
    .map((b) => ({
      id: slugify(b.content as string),
      text: (b.content as string).trim(),
      level: Number(b.type[1]),
    }))
    .filter((h) => h.id.length > 0);
}

/**
 * Renders the ordered post blocks as a long-form article body. Each block becomes a discrete
 * semantic element under `.prose-post` (see globals.css) which carries the editorial typography.
 * Server component — no client state; the only interactive bits are plain anchors.
 */
export function ArticleBody({ blocks }: { blocks: PublicPostBlock[] }) {
  return (
    <div className="prose-post">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
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

function Block({ block }: { block: PublicPostBlock }) {
  switch (block.type) {
    case "PARAGRAPH":
      return block.content ? <Markdown>{block.content}</Markdown> : null;
    case "H1":
      return block.content ? <h2 id={slugify(block.content)}>{block.content}</h2> : null;
    case "H2":
      return block.content ? <h3 id={slugify(block.content)}>{block.content}</h3> : null;
    case "H3":
      return block.content ? <h4 id={slugify(block.content)}>{block.content}</h4> : null;
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
      return <EmbedBlock content={block.content} />;
    case "CTA_REF":
      return <CtaBlock cta={block.cta} />;
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
  const items = parseList(content);
  if (items.length === 0) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag>
      {items.map((item, i) => (
        <li key={i}>
          <Markdown inline>{item}</Markdown>
        </li>
      ))}
    </Tag>
  );
}

function ImageBlock({ content }: { content: string | null }) {
  if (!content) return null;
  let url: string | null = null;
  let alt = "";
  let caption = "";
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      url = typeof parsed.url === "string" ? parsed.url : null;
      alt = typeof parsed.alt === "string" ? parsed.alt : "";
      caption = typeof parsed.caption === "string" ? parsed.caption : "";
    }
  } catch {
    url = content.trim();
  }
  if (!url) return null;
  return <PostImage src={url} alt={alt} caption={caption} />;
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
  // Render through the shared markdown pipeline so rehype-highlight applies; a backtick-safe fence
  // keeps code that itself contains backticks from breaking out.
  const fence = fenceFor(code);
  return <Markdown>{`${fence}${lang}\n${code}\n${fence}`}</Markdown>;
}

function EmbedBlock({ content }: { content: string | null }) {
  // A kurl short link → live link-stats card (the "post backed by measured links" signal).
  const code = content ? kurlShortCode(content) : null;
  if (code && content) return <KurlLinkCard code={code} url={content.trim()} />;

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

async function CtaBlock({ cta }: { cta: PublicCtaInfo | null }) {
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
    <a href={cta.url} target="_blank" rel="noopener noreferrer" className={`${base} ${tone}`}>
      {cta.label}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}
