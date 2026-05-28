import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  findPublicPost,
  type PublicPostBlock,
  type PublicPostDetail,
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
    // TODO: 410 Gone 별도 페이지 처리 (현재는 notFound 로 통합, follow-up PR)
    notFound();
  }

  const { author, post, blocks } = result.data;

  return (
    <article className="mx-auto max-w-2xl px-6 py-12" lang={post.languageTag}>
      <header className="mb-10">
        <h1 className="text-3xl font-bold leading-tight tracking-tight">{post.title}</h1>
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

      <footer className="mt-16 border-t pt-8">
        <a href="/" className="text-sm text-gray-500 hover:underline">
          ← @{author.username} 의 다른 글
        </a>
      </footer>
    </article>
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
      // CTA 라이브러리 참조 — wave 2 에서 CTA 데이터 hydration. 일단 placeholder.
      return <CtaPlaceholder content={block.content} />;
    case "EMBED":
      return <EmbedBlock content={block.content} />;
    default:
      return null;
  }
}

function ParsedList({ content, ordered }: { content: string | null; ordered: boolean }) {
  if (!content) return null;
  // 본문 블록의 list content 는 JSON array of strings (간단 model). 잘못된 JSON 은 fallback.
  let items: string[] = [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) items = parsed.filter((x) => typeof x === "string");
  } catch {
    // fallback: line-separated
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
    // fallback: plain URL
    url = content.trim();
  }
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="rounded-lg" />;
}

function CtaPlaceholder({ content }: { content: string | null }) {
  // wave 1.4 의 backend public read 는 CTA hydration 안 함. content = '{"ctaId":N}' 만 옴.
  // wave 2 에서 backend public read 가 CTA 라이브러리 lookup 해서 label/url/style 까지 응답에
  // 포함하도록 확장. 그 전까지는 사용 불가 표시.
  return (
    <div className="my-6 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
      CTA (wave 2 에서 hydration)
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
