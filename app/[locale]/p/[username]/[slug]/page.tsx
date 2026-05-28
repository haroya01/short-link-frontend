import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ReportButton } from "@/components/content/report-button";
import { ShareButton } from "@/components/content/share-button";
import { ViewBeacon } from "@/components/content/view-beacon";
import {
  findPublicPost,
  type PublicCtaInfo,
  type PublicPostBlock,
} from "@/lib/api/public-posts";

export const revalidate = 30;

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

function subdomainOrigin(req: ReadonlyHeaders, username: string): string {
  const host = req.get("x-original-host") ?? req.get("host");
  if (!host) return `https://${username}.kurl.me`;
  const cleaned = host.split(":")[0];
  return `https://${cleaned}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await findPublicPost(username, slug);
  if (!result.ok) return { title: `@${username}` };
  const { author, post } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `${origin}/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: `${origin}/${post.slug}`,
      type: "article",
      siteName: `@${author.username}`,
      images: post.ogImageUrl ? [{ url: post.ogImageUrl }] : undefined,
      locale: post.languageTag,
    },
  };
}

export default async function PublicPostPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const result = await findPublicPost(username, slug);

  if (!result.ok) {
    // backend: UNPUBLISHED → 410, DRAFT/SCHEDULED/missing → 404.
    // Next.js 14 page.tsx 가 HTTP status code 직접 set 불가 → UI 분기로 처리.
    // Status code 자체는 middleware 또는 route handler 로 별도 PR.
    if (result.status === 410) {
      return <GonePage username={username} />;
    }
    notFound();
  }

  const { author, post, blocks } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  const postUrl = `${origin}/${post.slug}`;

  return (
    <article className="mx-auto max-w-2xl px-6 py-12" lang={post.languageTag}>
      <ViewBeacon username={username} slug={slug} />
      <header className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{post.title}</h1>
          <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
          <a href="/" className="hover:underline">
            @{author.username}
          </a>
          <span>·</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString()}
          </time>
        </div>
      </header>

      <div className="prose prose-neutral max-w-none">
        {blocks.map((b, i) => (
          <BlockRender key={i} block={b} />
        ))}
      </div>

      <footer className="mt-16 border-t pt-8 flex items-center justify-between">
        <a href="/" className="text-sm text-gray-500 hover:underline">
          ← @{author.username} 의 다른 글
        </a>
        <div className="flex items-center gap-3">
          <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
          <ReportButton subjectType="POST" subjectId={post.id} />
        </div>
      </footer>
    </article>
  );
}

function GonePage({ username }: { username: string }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">410</h1>
      <p className="mt-4 text-gray-600">이 글은 더 이상 게시되지 않습니다.</p>
      <a href="/" className="mt-8 inline-block text-sm text-emerald-600 hover:underline">
        ← @{username} 의 다른 글
      </a>
    </main>
  );
}

function BlockRender({ block }: { block: PublicPostBlock }) {
  switch (block.type) {
    case "PARAGRAPH":
      return <p>{block.content}</p>;
    case "H1":
      return <h1>{block.content}</h1>;
    case "H2":
      return <h2>{block.content}</h2>;
    case "H3":
      return <h3>{block.content}</h3>;
    case "QUOTE":
      return <blockquote>{block.content}</blockquote>;
    case "DIVIDER":
      return <hr />;
    case "LIST_BULLET":
      return <ParsedList content={block.content} ordered={false} />;
    case "LIST_NUMBERED":
      return <ParsedList content={block.content} ordered={true} />;
    case "IMAGE":
      return <ImageBlock content={block.content} />;
    case "CTA_REF":
      return <CtaBlock cta={block.cta} />;
    case "EMBED":
      return <EmbedBlock content={block.content} />;
    default:
      return null;
  }
}

function ParsedList({ content, ordered }: { content: string | null; ordered: boolean }) {
  if (!content) return null;
  let items: string[] = [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) items = parsed.filter((x) => typeof x === "string");
  } catch {
    items = content.split("\n").filter(Boolean);
  }
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ListTag>
  );
}

function ImageBlock({ content }: { content: string | null }) {
  if (!content) return null;
  let url: string | null = null;
  let alt = "";
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      url = typeof parsed.url === "string" ? parsed.url : null;
      alt = typeof parsed.alt === "string" ? parsed.alt : "";
    }
  } catch {
    url = content.trim();
  }
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="rounded-lg" />;
}

function CtaBlock({ cta }: { cta: PublicCtaInfo | null }) {
  if (!cta) {
    return (
      <div className="my-6 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
        CTA (참조 만료 또는 삭제됨)
      </div>
    );
  }
  if (cta.deleted) {
    return (
      <div className="my-6 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
        {cta.label} (현재 사용할 수 없음)
      </div>
    );
  }
  const primary = cta.style === "PRIMARY";
  const baseClass = primary
    ? "bg-emerald-600 text-white hover:bg-emerald-700"
    : "border border-gray-300 text-gray-700 hover:bg-gray-50";
  return (
    <div className="my-8 not-prose">
      <a
        href={cta.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block rounded-lg px-6 py-3 font-medium ${baseClass}`}
      >
        {cta.label}
      </a>
    </div>
  );
}

function EmbedBlock({ content }: { content: string | null }) {
  if (!content) return null;
  return (
    <p>
      <a href={content} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    </p>
  );
}
