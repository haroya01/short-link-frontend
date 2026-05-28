import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ReportButton } from "@/components/publishing/report-button";
import { listPublicPosts, type PublicPostListItem } from "@/lib/api/public-posts";

// 30s ISR — author 발행 후 30 초 내 visitors 반영. Backend 가 어차피 매번 직접 조회.
export const revalidate = 30;

function subdomainOrigin(req: ReadonlyHeaders, username: string): string {
  const host = req.get("x-original-host") ?? req.get("host");
  if (!host) return `https://${username}.kurl.me`;
  const cleaned = host.split(":")[0];
  return `https://${cleaned}`;
}

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) return { title: `@${username}` };
  const { author } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  return {
    title: `@${author.username}`,
    description: author.bio ?? undefined,
    alternates: { canonical: `${origin}/` },
    openGraph: {
      title: `@${author.username}`,
      description: author.bio ?? undefined,
      url: `${origin}/`,
      images: author.avatarUrl ? [{ url: author.avatarUrl }] : undefined,
    },
  };
}

export default async function PublicProfileHomepage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();

  const { author, posts } = result.data;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-12 flex items-start gap-4">
        {author.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={`@${author.username}`}
            width={72}
            height={72}
            className="h-18 w-18 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">@{author.username}</h1>
          {author.bio && <p className="mt-1 text-base text-gray-600">{author.bio}</p>}
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="text-gray-500">아직 발행된 글이 없습니다.</p>
      ) : (
        <ul className="space-y-8">
          {posts.map((p) => (
            <PostListEntry key={p.slug} post={p} />
          ))}
        </ul>
      )}

      <footer className="mt-16 border-t pt-8 flex justify-end">
        <ReportButton subjectType="USER" subjectId={author.id} />
      </footer>
    </main>
  );
}

function PostListEntry({ post }: { post: PublicPostListItem }) {
  return (
    <li>
      <a href={`/${post.slug}`} className="group block">
        <h2 className="text-xl font-semibold tracking-tight group-hover:underline">
          {post.title}
        </h2>
        {post.excerpt && <p className="mt-2 text-gray-600">{post.excerpt}</p>}
        <time
          dateTime={post.publishedAt}
          className="mt-2 inline-block text-sm text-gray-400"
        >
          {new Date(post.publishedAt).toLocaleDateString()}
        </time>
      </a>
    </li>
  );
}
