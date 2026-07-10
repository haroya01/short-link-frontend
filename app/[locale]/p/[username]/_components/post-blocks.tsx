import { Suspense, type ReactNode } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { staticMapUrl } from "@/modules/profile/lib/google-maps-static";
import { Markdown } from "@/modules/blog/components/markdown";
import { fenceFor } from "@/modules/blog/lib/markdown-to-blocks";
import { KurlLinkCard } from "@/modules/blog/components/kurl-link-card";
import { PostCode } from "@/modules/blog/components/post-code";
import { PostImage } from "@/modules/blog/components/post-image";
import type { TocHeading } from "@/modules/blog/components/post-toc";
import type { ImageWidth } from "@/modules/blog/lib/image-width";
import { kurlShortCode } from "@/modules/blog/lib/kurl-link";
import { planEmbed } from "@/modules/blog/lib/post-embed";
import { slugify } from "@/modules/blog/lib/slugify";
import type { PublicCtaInfo, PublicPostBlock } from "@/modules/blog/api/public-posts";
import { getLinkPreview } from "@/modules/blog/api/public-posts";

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
  className,
}: {
  blocks: PublicPostBlock[];
  /** When set, kurl links embedded in the post carry `?post=` so their clicks attribute here. */
  postId?: number;
  /** Extra marker classes on the prose root — e.g. `has-toc` scopes the wide-image width cap. */
  className?: string;
}) {
  const ranks = headingRanks(blocks);
  return (
    <div className={className ? `prose-post ${className}` : "prose-post"}>
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

type BlockContext = { ranks: Map<number, number>; postId?: number };
type BlockRenderer = (block: PublicPostBlock, ctx: BlockContext) => ReactNode;

/**
 * Block-type → renderer registry. OPEN FOR EXTENSION: a new block type is supported by registering
 * one renderer here — the `Block` dispatcher below never changes (closed for modification).
 */
const BLOCK_RENDERERS: Record<string, BlockRenderer> = {
  PARAGRAPH: (b) => (b.content ? <Markdown>{b.content}</Markdown> : null),
  H1: (b, ctx) => <HeadingBlock block={b} ranks={ctx.ranks} />,
  H2: (b, ctx) => <HeadingBlock block={b} ranks={ctx.ranks} />,
  H3: (b, ctx) => <HeadingBlock block={b} ranks={ctx.ranks} />,
  QUOTE: (b) =>
    b.content ? (
      <blockquote>
        <Markdown inline>{b.content}</Markdown>
      </blockquote>
    ) : null,
  DIVIDER: () => <div className="section-divider my-12" role="separator" />,
  LIST_BULLET: (b) => <ListBlock content={b.content} ordered={false} />,
  LIST_NUMBERED: (b) => <ListBlock content={b.content} ordered />,
  IMAGE: (b) => <ImageBlock content={b.content} />,
  CODE: (b) => <CodeBlock content={b.content} />,
  TABLE: (b) => (b.content ? <Markdown>{b.content}</Markdown> : null),
  EMBED: (b, ctx) => <EmbedBlock content={b.content} postId={ctx.postId} />,
  CTA_REF: (b, ctx) => <CtaBlock cta={b.cta} postId={ctx.postId} />,
};

function Block({
  block,
  ranks,
  postId,
}: {
  block: PublicPostBlock;
  ranks: Map<number, number>;
  postId?: number;
}) {
  return BLOCK_RENDERERS[block.type]?.(block, { ranks, postId }) ?? null;
}

/** Heading (H1/H2/H3) → rank+2 (h2/h3/h4) so the outline never skips a level; self-linking deep anchor. */
function HeadingBlock({ block, ranks }: { block: PublicPostBlock; ranks: Map<number, number> }) {
  if (!block.content) return null;
  const Tag = `h${(ranks.get(Number(block.type[1])) ?? 0) + 2}` as "h2" | "h3" | "h4";
  const id = slugify(block.content);
  return (
    <Tag id={id}>
      <a href={`#${id}`}>{block.content}</a>
    </Tag>
  );
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
  let naturalWidth: number | undefined;
  let naturalHeight: number | undefined;
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
      // Intrinsic size (legacy blocks lack it) → reader reserves the aspect-ratio box, no CLS.
      if (typeof parsed.naturalWidth === "number" && parsed.naturalWidth > 0) naturalWidth = parsed.naturalWidth;
      if (typeof parsed.naturalHeight === "number" && parsed.naturalHeight > 0) naturalHeight = parsed.naturalHeight;
    }
  } catch {
    url = content.trim();
  }
  if (!url) return null;
  return (
    <PostImage
      src={url}
      alt={alt}
      caption={caption}
      width={width}
      naturalWidth={naturalWidth}
      naturalHeight={naturalHeight}
    />
  );
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
  // Highlight through the shared markdown pipeline HERE (server component) and hand the rendered nodes
  // to PostCode (client shell) as children — keeps the markdown/highlight pipeline out of the client bundle.
  const fence = fenceFor(code);
  return (
    <PostCode lang={lang} code={code}>
      <Markdown>{`${fence}${lang}\n${code}\n${fence}`}</Markdown>
    </PostCode>
  );
}

async function EmbedBlock({ content, postId }: { content: string | null; postId?: number }) {
  // A kurl short link → live link-stats card (the "post backed by measured links" signal). The
  // outbound url carries ?post= so the click attributes to this post ("이 글이 만든 클릭").
  const code = content ? kurlShortCode(content) : null;
  if (code && content)
    return <KurlLinkCard code={code} url={withPostParam(content.trim(), postId)} />;

  const plan = planEmbed(content);
  if (!plan) return null;
  if (plan.kind === "video") {
    const t = await getTranslations("publicPost");
    return (
      <div className="my-8 overflow-hidden rounded-2xl bg-slate-900">
        <div className="relative aspect-video">
          <iframe
            src={plan.src}
            title={t("embedMedia")}
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
  if (plan.kind === "map") {
    const img = staticMapUrl({ lat: plan.lat, lng: plan.lng, size: "640x360" });
    return (
      <a
        href={plan.url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-8 block overflow-hidden rounded-2xl border border-slate-200 no-underline transition-colors hover:border-accent-300 dark:border-slate-800"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={plan.label ?? "Google Maps"}
            className="img-fade aspect-[16/9] w-full bg-slate-100 object-cover dark:bg-slate-800"
            loading="lazy"
          />
        ) : (
          <div className="grid aspect-[16/9] w-full place-items-center bg-slate-100 text-slate-400 dark:bg-slate-800">
            <MapPin className="h-8 w-8" />
          </div>
        )}
        <span className="flex items-center justify-between gap-3 px-5 py-3">
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-accent-600" />
            <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {plan.label ?? "Google Maps"}
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-accent-600" />
        </span>
      </a>
    );
  }

  // General link → velog-style preview card (og:title/description/image via the unfurl endpoint).
  // LinkPreviewCard awaits an external OG scrape; isolate it behind Suspense so a slow target streams
  // a card-shaped skeleton instead of gating the whole article body (the page's only body boundary).
  return (
    <Suspense fallback={<LinkPreviewSkeleton />}>
      <LinkPreviewCard url={plan.url} />
    </Suspense>
  );
}

/** Card-shaped placeholder while the link's Open Graph is fetched server-side (see LinkPreviewCard). */
function LinkPreviewSkeleton() {
  return (
    <div
      className="my-8 h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      aria-hidden
    />
  );
}

/**
 * Rich link card — fetches the target's Open Graph (server-side, cached) and draws a velog-style
 * card: title + description on the left, thumbnail on the right, domain footer. Falls back to a bare
 * domain row when the target exposes no OG (or the fetch fails), so a link always renders something.
 */
async function LinkPreviewCard({ url }: { url: string }) {
  let host = url;
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  const res = await getLinkPreview(url);
  const data = res.ok ? res.data : null;
  const rich = data && (data.title || data.image);

  const shell =
    "my-8 flex overflow-hidden rounded-2xl border border-slate-200 !no-underline transition-colors hover:border-accent-300 dark:border-slate-800 dark:hover:border-accent-500/50 [&_*]:!no-underline";

  if (!rich) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${shell} items-center justify-between gap-3 bg-slate-50/60 px-5 py-4 dark:bg-slate-800/40`}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{host}</span>
          <span className="block truncate text-[13px] text-slate-500 dark:text-slate-400">{url}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-accent-600" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={shell}>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4 sm:p-5">
        <span className="line-clamp-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {data?.title || host}
        </span>
        {data?.description && (
          <span className="line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {data.description}
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-slate-500 dark:text-slate-400">
          <ArrowUpRight className="h-3 w-3 shrink-0 text-accent-600" />
          {host}
        </span>
      </span>
      {data?.image && (
        <span className="hidden w-32 shrink-0 self-stretch bg-slate-100 dark:bg-slate-800 sm:block sm:w-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.image} alt="" loading="lazy" className="img-fade h-full w-full object-cover" />
        </span>
      )}
    </a>
  );
}

async function CtaBlock({ cta, postId }: { cta: PublicCtaInfo | null; postId?: number }) {
  if (!cta || cta.deleted) {
    const t = await getTranslations("publicPost");
    return (
      <div className="my-8 rounded-2xl border border-dashed border-slate-200 px-5 py-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-500">
        {cta?.label ? t("ctaUnavailable", { label: cta.label }) : t("ctaDeleted")}
      </div>
    );
  }
  const primary = cta.style === "PRIMARY";
  const base =
    "my-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold no-underline transition-colors";
  const tone = primary
    ? "bg-accent-700 text-white hover:bg-accent-800"
    : "border border-slate-200 text-slate-900 hover:border-accent-300 hover:bg-accent-50/50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-accent-500/40 dark:hover:bg-accent-500/10";
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
